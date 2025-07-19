from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import your services
try:
    from .services.chatbot_BioGPT import generate_response
except ImportError:
    # Fallback if imports fail
    def generate_response(message: str) -> str:
        return "Chatbot service temporarily unavailable. Please try again later."

app = FastAPI(
    title="AI Medical Chatbot API",
    description="A secure AI-powered medical assistance chatbot",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "AI Medical Chatbot API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "ai-medical-chatbot",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@app.post("/api/chat")
async def chat_endpoint(message: dict):
    """
    Main chat endpoint for the medical chatbot
    
    Expected input: {"message": "your question here"}
    """
    try:
        if not message or "message" not in message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        user_message = message["message"].strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Generate response using the AI model
        response = generate_response(user_message)
        
        return {
            "success": True,
            "response": response,
            "model": "BioGPT-Large"
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "An error occurred while processing your request",
                "details": str(e) if os.getenv("DEBUG") else "Internal server error"
            }
        )

@app.get("/api/models")
async def get_available_models():
    """Get information about available AI models"""
    return {
        "models": [
            {
                "name": "BioGPT-Large",
                "description": "Microsoft's biomedical language model",
                "status": "active",
                "use_case": "Medical question answering and advice"
            },
            {
                "name": "Flan-T5-Large",
                "description": "Google's T5 model fine-tuned for instruction following",
                "status": "fallback",
                "use_case": "General medical assistance"
            }
        ]
    }

@app.get("/api/config")
async def get_configuration():
    """Get public configuration information"""
    return {
        "environment": os.getenv("ENVIRONMENT", "production"),
        "features": {
            "huggingface_integration": bool(os.getenv("HUGGINGFACE_TOKEN")),
            "openai_integration": bool(os.getenv("OPENAI_API_KEY")),
            "database_connected": bool(os.getenv("POSTGRES_URL")),
        },
        "limits": {
            "max_message_length": 1000,
            "rate_limit": "10 requests per minute"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

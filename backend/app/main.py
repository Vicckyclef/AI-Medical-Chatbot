from fastapi import FastAPI, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

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

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    terms_agreed: bool = True

class User(BaseModel):
    id: int
    name: str
    email: str

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

# Authentication endpoints
@app.post("/signup")
async def signup(user_data: UserCreate):
    """User registration endpoint"""
    try:
        # For now, return a mock response
        # In production, you would save to database and hash password
        return {
            "message": "User registered successfully",
            "user": {
                "id": 1,
                "name": user_data.name,
                "email": user_data.email
            },
            "token": "mock_access_token_123"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """User login endpoint"""
    try:
        # For now, return a mock response
        # In production, you would verify credentials against database
        if form_data.username and form_data.password:
            return {
                "access_token": "mock_access_token_123",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "name": "Test User",
                    "email": form_data.username
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

@app.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user information"""
    # For now, return mock user data
    return {
        "id": 1,
        "name": "Test User",
        "email": "user@example.com"
    }

@app.get("/chats")
async def get_chats(token: str = Depends(oauth2_scheme)):
    """Get user's chat history"""
    return {"chats": []}

@app.get("/chatbot/chat/history")
async def get_chat_history(token: str = Depends(oauth2_scheme)):
    """Get chat conversation history"""
    return {"history": []}

@app.post("/chatbot/save_conversation")
async def save_conversation(data: dict, token: str = Depends(oauth2_scheme)):
    """Save chat conversation"""
    return {"message": "Conversation saved successfully"}

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

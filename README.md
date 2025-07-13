# AI Medical Chatbot Dashboard

A web-based dashboard for medical chatbot interactions with secure user authentication and a clean UI.

## Features

### Core Functionality
- **Medical Chatbot Interface**: Interact with AI for medical queries
- **User Profile Management**: Update user details and preferences
- **Chat History**: Review past conversations

### Authentication & Security 
- **User Authentication**: Secure signup and login with JWT tokens
- **Token Refresh**: Automatic refresh of expired tokens
- **Role-Based Access**: Different permissions for users and administrators
- **Password Security**: Bcrypt hashing for password protection

### System Design
- **Environment-Based Configuration**: Easy setup in different environments
- **Database Integration**: PostgreSQL storage for users and chat data
- **Error Handling**: Comprehensive error management
- **API Documentation**: Auto-generated with Swagger UI

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Authentication**: JWT tokens, Bcrypt password hashing
- **API Documentation**: Swagger UI and ReDoc (auto-generated)

## Setup Instructions

### Prerequisites

- Python 3.8+
- PostgreSQL
- pip

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Vicckyclef/AI-Medical-Chatbot.git
   cd AI-Medical-Chatbot-Dashboard
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Unix or MacOS:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD="THE PASSWORD"
   DB_NAME=medical_chatbot

   # JWT Authentication
   JWT_SECRET_KEY="THE SECRET KEY"
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7
   ```

### Running the Application

1. Start the backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Access the API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Docker Setup (Alternative)

1. Build the Docker image:
   ```bash
   docker build -t medical-chatbot-api .
   ```

2. Run the container:
   ```bash
   docker run -p 8000:8000 --env-file .env medical-chatbot-api
   ```

## API Endpoints

### Authentication

- `POST /api/auth/signup`: Register a new user
- `POST /api/auth/login`: Authenticate and get tokens
- `POST /api/auth/refresh`: Refresh access token
- `GET /api/auth/me`: Get current user info
- `POST /api/auth/logout`: Logout (client-side)

## Authentication Flow

1. **Sign Up**: Create a new user account with email and password
2. **Login**: Authenticate and receive access and refresh tokens
3. **Use Access Token**: Include the access token in the Authorization header for protected endpoints
4. **Refresh Token**: When the access token expires, use the refresh token to get a new access token
5. **Logout**: Clear tokens from client storage

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt
- **JWT Tokens**: Authentication uses JWT tokens with configurable expiration
- **Token Refresh**: Secure mechanism for refreshing expired tokens
- **Environment Variables**: Sensitive configuration stored in environment variables
- **Database Security**: Connection pooling and prepared statements
- **CORS Protection**: Configured to prevent cross-origin attacks

## License

This project is licensed under the MIT License - see the LICENSE file for details.


# Authentication System Guide

This guide explains how to set up and test the authentication system for the AI Medical Chatbot Dashboard.

## Setup Instructions

1. **Set up PostgreSQL Database**

   Make sure PostgreSQL is installed and running on your system. The default configuration expects:
   - Host: `localhost`
   - Port: `5432`
   - User: `postgres`
   - Password: `AmazingGrace2025`
   - Database: `medical_chatbot` (will be created automatically)

2. **Initialize the Database**

   Run the database initialization script:
   ```
   python -m backend.app.database.init_db
   ```

3. **Start the FastAPI Server**

   Start the FastAPI server with uvicorn:
   ```
   cd backend
   uvicorn app.main:app --reload
   ```

## Testing the Authentication Flow

You can test the authentication system using:

1. **FastAPI Swagger UI**
   - Open `http://localhost:8000/docs` in your browser
   - Test the `/signup`, `/login`, and `/me` endpoints manually

2. **Test Script**
   - Run the test script from the project root:
   ```
   python test_auth.py
   ```

## Authentication Endpoints

1. **Signup**
   - URL: `POST /signup`
   - Payload:
     ```json
     {
       "name": "Test User",
       "email": "user@example.com",
       "password": "securepassword",
       "terms_agreed": true
     }
     ```
   - Response: Returns access and refresh tokens

2. **Login**
   - URL: `POST /login`
   - Form Data:
     ```
     username: user@example.com
     password: securepassword
     ```
   - Response: Returns access and refresh tokens

3. **Get Current User**
   - URL: `GET /me`
   - Headers: `Authorization: Bearer {access_token}`
   - Response: Returns user information

## Troubleshooting

If you encounter issues:

1. **Database Connection Problems**
   - Verify PostgreSQL is running
   - Check the database connection parameters in `.env`
   - Try manually creating the database:
     ```sql
     CREATE DATABASE medical_chatbot;
     ```

2. **Import Errors**
   - Make sure you're running commands from the project root
   - Verify that the imports are correctly using either:
     - `from app.xyz import abc` (when running from the backend directory)
     - `from backend.app.xyz import abc` (when running from the project root)

3. **JWT Issues**
   - Ensure the JWT secret key is consistent in `.env` and `config.py`
   - Check token expiration settings


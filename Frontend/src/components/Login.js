import React, { useState } from "react";
import { login } from "../utils/api";
import { saveToken } from "../utils/auth";
import { handleApiError, showSuccessNotification } from "../utils/errorHandler";
import { ButtonSpinner } from "./LoadingSpinner";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setNetworkError(false);
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      
      if (response.token) {
        saveToken(response.token);
        showSuccessNotification("Login successful! Redirecting...");
        
        // Small delay to show success message
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      const errorInfo = handleApiError(err, 'Login');
      
      // Set appropriate error states
      if (errorInfo.type === 'NETWORK' || errorInfo.type === 'TIMEOUT') {
        setNetworkError(true);
        setError("Network connection failed. Please check your internet connection.");
      } else if (errorInfo.type === 'AUTHENTICATION') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(errorInfo.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (email && password) {
      handleLogin({ preventDefault: () => {} });
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    
    try {
      const response = await fetch('http://localhost:8000/google/auth-url');
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      } else {
        setError("Failed to initialize Google login. Please try again.");
      }
    } catch (error) {
      console.error('Error getting Google OAuth URL:', error);
      setError("Failed to connect to Google. Please try again later.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="right-section">
          <h2>Welcome Back!</h2>
          <button 
            className={`google-btn ${googleLoading ? 'loading' : ''}`}
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
          >
            {googleLoading && <ButtonSpinner />}
            <img className="google-icon" src="/assets/google-icon.svg" alt="Google Icon" />
            {googleLoading ? 'Connecting to Google...' : 'Log in with Google'}
          </button>
          <div className="divider">
            <span>Or</span>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            {error && <p className="error-message">{error}</p>}
            <input
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="remember-forgot">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember Me</label>
              </div>
              <a href="/forgot-password" className="forgot-password-link">
                Forget Password?
              </a>
            </div>
            <div className="button-container">
              <button 
                type="submit" 
                disabled={isLoading}
                className={`login-btn ${isLoading ? 'loading' : ''}`}
              >
                {isLoading && <ButtonSpinner />}
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              
              {networkError && (
                <button 
                  type="button" 
                  onClick={handleRetry}
                  className="retry-btn"
                  disabled={isLoading}
                >
                  Retry
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="left-section">
          <h2>Hello, Friend!</h2>
          <p>Enter your personal details and start your journey with us</p>
          <button className="signup-btn" onClick={() => (window.location.href = "/signup")}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from "react";
import { signUp } from "../utils/api";
import { handleApiError, showSuccessNotification } from "../utils/errorHandler";
import { ButtonSpinner } from "./LoadingSpinner";
import "./Signup.css";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setNetworkError(false);
    setIsLoading(true);

    try {
      const response = await signUp({ name, email, password });
      
      if (response.success || response.id) {
        showSuccessNotification("Account created successfully! Redirecting to login...");
        
        // Small delay to show success message
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setError("Sign-up failed. Please try again.");
      }
    } catch (err) {
      const errorInfo = handleApiError(err, 'Sign Up');
      
      // Set appropriate error states
      if (errorInfo.type === 'NETWORK' || errorInfo.type === 'TIMEOUT') {
        setNetworkError(true);
        setError("Network connection failed. Please check your internet connection.");
      } else if (errorInfo.type === 'VALIDATION') {
        setError("Please check your input. Email might already be taken.");
      } else {
        setError(errorInfo.message || "Sign-up failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (name && email && password) {
      handleSignup({ preventDefault: () => {} });
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError("");
    
    try {
      const response = await fetch('http://localhost:8000/google/auth-url');
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      } else {
        setError("Failed to initialize Google signup. Please try again.");
      }
    } catch (error) {
      console.error('Error getting Google OAuth URL:', error);
      setError("Failed to connect to Google. Please try again later.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="left-section">
          <h2>Welcome Back!</h2>
          <p>To keep connected with us please login with your personal info</p>
          <button className="sign-in-btn" onClick={() => (window.location.href = "/login")}>
            Sign In
          </button>
        </div>

        <div className="right-section">
          <h2>Create An Account</h2>
          <p>Create your account to get started!</p>
          <button 
            className={`google-btn ${googleLoading ? 'loading' : ''}`}
            onClick={handleGoogleSignup}
            disabled={googleLoading || isLoading}
          >
            {googleLoading && <ButtonSpinner />}
            <img className="google-icon" src="/assets/google-icon.svg" alt="Google Icon" />
            {googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
          </button>
          <div className="divider">
            <span>Or</span>
          </div>
          <form onSubmit={handleSignup} className="signup-form">
            {error && <p className="error-message">{error}</p>}
            <input
              type="text"
              placeholder="Type your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
            <div className="terms">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">I agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a></label>
            </div>

            <div className="button-container">
              <button 
                type="submit" 
                disabled={isLoading}
                className={`signup-btn ${isLoading ? 'loading' : ''}`}
              >
                {isLoading && <ButtonSpinner />}
                {isLoading ? 'Creating Account...' : 'Sign Up'}
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
      </div>
    </div>
  );
};

export default Signup;
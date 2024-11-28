import React, { useState } from "react";
import axios from "axios";
import "./Signup.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post("/api/signup", { email, password });
      if (response.status === 201) {
        window.location.href = "/login";
      }
    } catch (err) {
      setError("Sign-up failed. Try again.");
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>Welcome to WeCare</h2>
        <p className="signup-subtitle">Create your account to get started!</p>

        <form onSubmit={handleSignup} className="signup-form">
          {error && <p className="error-message">{error}</p>}
          <input
            type="email"
            placeholder="Email Address"
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Sign Up</button>
        </form>

        <div className="signup-footer">
          <p>Already have an account?</p>
          <a href="/login" className="link">
            Login Here
          </a>
        </div>
      </div>
    </div>
  );
};

export default Signup;

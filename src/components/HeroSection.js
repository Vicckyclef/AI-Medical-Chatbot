import React from "react";
import { Link } from "react-router-dom";
import "./HeroSection.css"; // Ensure your CSS is properly imported

const HeroSection = () => {
  return (
    <div className="hero-container">
      {/* Add a container for the buttons at the top-right */}
      <div className="hero-nav">
        <Link to="/signup">
          <button className="hero-button signup-button">Sign Up</button>
        </Link>
        <Link to="/login">
          <button className="hero-button login-button">Login</button>
        </Link>
      </div>

      {/* Hero content */}
      <div className="hero-content">
        <h1 className="company-name">WeCare Solutions</h1>
        <h2 className="hero-title">Empowering Health with AI Chatbots</h2>
        <p className="hero-subtext">Revolutionizing patient interactions today!</p>
      </div>

      {/* Hero image */}
      <div className="hero-image">
        <img
          src="ai_bot_image.jpg"
          alt="AI Chatbot"
          className="chatbot-image"
        />
      </div>
    </div>
  );
};

export default HeroSection;

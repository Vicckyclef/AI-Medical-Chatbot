import React from 'react';
import './ChatPage.css';

const ChatPage = ({ className, ...props }) => {
  return (
    <div className={`chat-desktop ${className}`} {...props}>
      <div className="chat-header">Hello, how can I help you?</div>
      
      <div className="chat-input-section">
        <input 
          className="chat-input" 
          type="text" 
          placeholder="Ask a health question..." 
        />
        <button className="send-button">
          <img src="vector1.svg" alt="Send" />
        </button>
      </div>

      <div className="actions">
        <button className="action-button">Analyze Medical Report</button>
        <button className="action-button">Get Medical Advice</button>
        <button className="action-button">Health Tips</button>
        <button className="action-button">More</button>
      </div>

      <aside className="sidebar">
        <div className="user-info">
          <div className="profile-icon">U</div>
          <div className="welcome-text">
            <p>Welcome back,</p>
            <strong>User</strong>
          </div>
        </div>
        <nav className="nav-options">
          <button className="nav-button">+ New Chat</button>
          <button className="nav-button">Recent Chats</button>
        </nav>
      </aside>

      <footer className="footer-text">
        Your privacy is our priority. All interactions are secure and confidential.
      </footer>
    </div>
  );
};

export default ChatPage;

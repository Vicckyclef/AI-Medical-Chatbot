import React, { useState } from "react";
import "./ChatPage.css";

const ChatPage = ({ className, ...props }) => {
  const [isSidebarActive, setIsSidebarActive] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isInConversation, setIsInConversation] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [showRecentChats, setShowRecentChats] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarActive((prevState) => !prevState);
  };

  const toggleRecentChats = () => {
    setShowRecentChats((prevState) => !prevState);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", text: inputValue },
      { sender: "bot", text: `Response for: ${inputValue}` },
    ]);

    if (!isInConversation) setIsInConversation(true);

    setInputValue("");
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      const newChat = {
        title: messages[0]?.text || "New Conversation",
        history: [...messages], // Save the current conversation
      };
      setRecentChats((prevChats) => [...prevChats, newChat]);
    }

    // Reset the chat state
    setMessages([]);
    setIsInConversation(false);
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend(); // Trigger the send function on Enter key press
    }
  };

  const loadChat = (chat) => {
    // Load the selected chat's history
    setMessages(chat.history);
    setIsInConversation(true);
  };

  return (
    <div className="chat-desktop">
      <div className="chat-content" style={{ display: isInConversation ? "none" : "block" }}>
        {/* Default Content */}
        <div className="chat-header">Hello, how can <br />I help you?</div>
        <div className="chat-input-section">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask a health question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress} // Listen for Enter key
          />
          <button className="send" onClick={handleSend}>
            <img src="../assets/send icon.png" alt="Send" />
          </button>
        </div>
        <div className="actions">
          <button className="action-button">Analyze Medical Report</button>
          <button className="action-button">Get Medical Advice</button>
          <button className="action-button">Health Tips</button>
          <button className="action-button">More</button>
        </div>
      </div>

      <div className="chat-content-conversation" style={{ display: isInConversation ? "block" : "none" }}>
        {/* Conversation State */}
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.sender === "user" ? "user" : "bot"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input-section">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask a health question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress} // Listen for Enter key
          />
          <button className="send" onClick={handleSend}>
            <img src="../assets/send icon.png" alt="Send" />
          </button>
        </div>
      </div>

      <aside className={isSidebarActive ? "sidebar-active" : "sidebar-notactive"}>
        <div className="wrapper">
          <img className="logo" src="../assets/logo1.png" alt="Logo" />
          <img
            className="menu-icon"
            src="../assets/Hamburger.png"
            alt="Menu"
            onClick={toggleSidebar}
          />
        </div>
        <nav className="nav-options">
          <button className="nav-button" onClick={handleNewChat}>
            <img src="../assets/Plus icon.png" alt="New Chat" />
            <span>New Chat</span>
          </button>
          <button className="nav-button" onClick={toggleRecentChats}>
            <img src="../assets/dropdown icon.png" alt="Recent Chats" />
            <span>Recent Chats</span>
          </button>
          {showRecentChats && (
            <div className="recent-chats">
              {recentChats.length === 0 ? (
                <p className="no-recent-chats">No recent chats</p>
              ) : (
                recentChats.map((chat, index) => (
                  <div
                    key={index}
                    className="recent-chat-item"
                    onClick={() => loadChat(chat)} // Load the chat when clicked
                  >
                    {chat.title}
                  </div>
                ))
              )}
            </div>
          )}
        </nav>
        <div className="user-info">
          <div className="profile-icon">U</div>
          <div className="welcome-text">
            <p>Welcome back,</p>
            <strong>User</strong>
          </div>
        </div>
      </aside>
      <footer className="footer-text">
        Your privacy is our priority. All interactions are secure and confidential.
      </footer>
    </div>
  );
};

export default ChatPage;
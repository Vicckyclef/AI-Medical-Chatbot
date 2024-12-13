import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HeroSection from "./components/HeroSection";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import ChatPage from "./components/ChatPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route to HeroSection */}
        <Route path="/" element={<HeroSection />} />
        {/* Route to SignUp */}
        <Route path="/signup" element={<SignUp />} />
        {/* Route to Login */}
        <Route path="/login" element={<Login />} />
        {/* Route to ChatPage */}
        <Route path="/ChatPage" element={<ChatPage />} />
      </Routes>
    </Router>
  );
}

export default App;

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HeroSection from "./components/HeroSection";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import ChatPage from "./components/ChatPage";
import { ErrorBoundary } from "./utils/errorHandler";

function App() {
  return (
    <ErrorBoundary>
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
        
        {/* Toast notification container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;

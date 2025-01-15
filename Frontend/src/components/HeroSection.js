import React, { useState } from "react";
import { FaStethoscope, FaCalendarAlt, FaPills, FaMapMarkerAlt, FaBars, FaBell } from "react-icons/fa";

const HeroSection = () => {
  const [activeNav, setActiveNav] = useState("home");
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const navItems = [
    { id: "find-doctor", label: "Find Doctor", icon: <FaStethoscope /> },
    { id: "my-appointment", label: "My Appointment", icon: <FaCalendarAlt /> },
    { id: "my-medicine", label: "My Medicine", icon: <FaPills /> },
    { id: "tracker", label: "Tracker", icon: <FaMapMarkerAlt /> },
    { id: "notifications", label: "Notifications", icon: <FaBell /> },
  ];

  return (
    <div className="flex w-screen h-screen bg-gradient-to-tr from-white via-blue-100 to-blue-200 overflow-hidden">
      {/* Left Navigation Bar */}
      <div
        className={`${
          isNavCollapsed ? "w-16" : "w-1/5"
        } bg-blue-900 h-full flex flex-col items-start py-8 px-4 text-white transition-width duration-300`}
      >
        <div className="flex items-center justify-between w-full px-2">
          {!isNavCollapsed && (
            <img
              src="../assets/logo1.png"
              alt="Logo"
              className="w-24 transition-width duration-300"
            />
          )}
          <button
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            className="text-white focus:outline-none"
          >
            <FaBars size={24} />
          </button>
        </div>
        <ul className="flex flex-col gap-4 w-full mt-8">
          {navItems.map((item) => (
            <li
              key={item.id}
              className={`w-full flex items-center justify-center px-4 py-3 rounded-lg cursor-pointer ${
                activeNav === item.id
                  ? "bg-white text-blue-900 shadow-md"
                  : "hover:bg-blue-700"
              }`}
              onClick={() => setActiveNav(item.id)}
            >
              {isNavCollapsed ? (
                <div className="text-lg">{item.icon}</div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-lg">{item.icon}</div>
                  <span>{item.label}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Navigation Bar */}
        <nav className="flex justify-between items-center p-6">
          <div className="text-xl font-bold text-blue-900">My Application</div>
          <div className="flex gap-4">
            <a href="/signup">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 text-white font-medium hover:scale-105 transition-transform">
                Sign Up
              </button>
            </a>
            <a href="/login">
              <button className="px-6 py-3 rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-100 transition-transform hover:scale-105">
                Log in
              </button>
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex flex-1 flex-col md:flex-row justify-between items-center px-6 md:px-12 relative">
          {/* Left Section */}
          <div className="w-full md:w-1/2 text-center md:text-left mb-8 md:mb-0">
            <h1 className="text-4xl md:text-6xl font-extrabold text-blue-900 leading-tight mb-6">
              Empowering Health <br />
              With AI Chatbots
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Our AI-powered healthcare chatbot enhances patient support by
              providing accurate, real-time medical guidance and automating
              routine healthcare tasks.
            </p>
            <a href="/ChatPage">
              <button className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-800 transition-colors">
                Get Started
              </button>
            </a>
          </div>

          {/* Right Section */}
          <div className="w-full md:w-1/2 flex justify-center relative">
            <img
              src="../assets/middle.png"
              alt="Hero"
              className="max-w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

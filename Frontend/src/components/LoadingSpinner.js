import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = '#1376F8', 
  text = 'Loading...', 
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  const spinnerComponent = (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`}>
      <div 
        className="spinner-ring" 
        style={{ borderTopColor: color }}
      />
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinnerComponent}
      </div>
    );
  }

  return spinnerComponent;
};

// Inline loading spinner for buttons
export const ButtonSpinner = ({ size = 'small', color = '#ffffff' }) => (
  <div className={`button-spinner ${size}`}>
    <div 
      className="spinner-ring inline" 
      style={{ borderTopColor: color }}
    />
  </div>
);

// Skeleton loader for content
export const SkeletonLoader = ({ 
  width = '100%', 
  height = '20px', 
  className = '' 
}) => (
  <div 
    className={`skeleton-loader ${className}`}
    style={{ width, height }}
  />
);

// Message loading indicator
export const MessageLoader = ({ text = 'AI is thinking...' }) => (
  <div className="message-loader">
    <div className="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span className="loader-text">{text}</span>
  </div>
);

export default LoadingSpinner;

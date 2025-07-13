import React from 'react';
import { toast } from 'react-toastify';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  SERVER: 'SERVER',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  RATE_LIMIT: 'RATE_LIMIT',
  UNKNOWN: 'UNKNOWN'
};

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network connection failed. Please check your internet connection and try again.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_TYPES.SERVER]: 'Server error occurred. Please try again later.',
  [ERROR_TYPES.VALIDATION]: 'Invalid data provided. Please check your input.',
  [ERROR_TYPES.AUTHENTICATION]: 'Authentication failed. Please log in again.',
  [ERROR_TYPES.AUTHORIZATION]: 'You do not have permission to perform this action.',
  [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Determine error type based on error object
export const getErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ERROR_TYPES.NETWORK;
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return ERROR_TYPES.TIMEOUT;
  }
  
  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 422 || status === 400) return ERROR_TYPES.VALIDATION;
    if (status === 429) return ERROR_TYPES.RATE_LIMIT;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

// Get user-friendly error message
export const getErrorMessage = (error) => {
  const errorType = getErrorType(error);
  
  // Check for custom error message from server
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for custom error message from error object
  if (error.message && !error.message.includes('Request failed') && !error.message.includes('Network Error')) {
    return error.message;
  }
  
  return ERROR_MESSAGES[errorType];
};

// Show error notification
export const showErrorNotification = (error, customMessage = null) => {
  const message = customMessage || getErrorMessage(error);
  
  if (typeof toast !== 'undefined') {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  } else {
    console.error('Error:', message);
  }
};

// Show success notification
export const showSuccessNotification = (message) => {
  if (typeof toast !== 'undefined') {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  } else {
    console.log('Success:', message);
  }
};

// Show info notification
export const showInfoNotification = (message) => {
  if (typeof toast !== 'undefined') {
    toast.info(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  } else {
    console.log('Info:', message);
  }
};

// Handle API errors with appropriate user feedback
export const handleApiError = (error, context = '') => {
  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(error);
  
  // Log error for debugging
  console.error(`API Error${context ? ` in ${context}` : ''}:`, {
    type: errorType,
    message: errorMessage,
    error: error
  });
  
  // Show user notification
  showErrorNotification(error);
  
  // Return structured error info
  return {
    type: errorType,
    message: errorMessage,
    originalError: error
  };
};

// Check if error is retryable
export const isRetryableError = (error) => {
  const errorType = getErrorType(error);
  return [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.SERVER
  ].includes(errorType);
};

// Retry function with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;
      
      console.log(`Retry attempt ${attempt + 1} after ${totalDelay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
};

// Create error boundary component
export const ErrorBoundary = ({ children, fallback = null }) => {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      handleApiError(error, 'Error Boundary');
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);
  
  if (hasError) {
    return fallback || (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred. Please refresh the page or try again later.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }
  
  return children;
};

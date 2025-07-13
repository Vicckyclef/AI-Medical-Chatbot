import axios from "axios";
import { handleApiError, retryWithBackoff } from './errorHandler';
import { getAccessToken, removeToken } from './auth';

// Create axios instance with enhanced configuration
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      removeToken();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API functions with error handling and retry logic
export const signUp = async (data) => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.post("/signup", data);
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Sign Up');
    throw error;
  }
};

export const login = async (data) => {
  try {
    const params = new URLSearchParams();
    params.append('username', data.email);
    params.append('password', data.password);

    return await retryWithBackoff(async () => {
      const response = await API.post("/login", params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Login');
    throw error;
  }
};

export const fetchHealthData = async () => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.get("/health");
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Fetch Health Data');
    throw error;
  }
};

export const fetchChats = async () => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.get("/chats");
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Fetch Chats');
    throw error;
  }
};

// New function to fetch current user details
export const fetchCurrentUser = async () => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.get("/me");
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Fetch Current User');
    throw error;
  }
};

// New function to fetch chat history
export const fetchChatHistory = async () => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.get("/chatbot/chat/history");
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Fetch Chat History');
    throw error;
  }
};

// New function to save a chat conversation
export const saveChatConversation = async (messages) => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.post("/chatbot/save_conversation", { messages });
      return response.data;
    });
  } catch (error) {
    handleApiError(error, 'Save Chat Conversation');
    throw error;
  }
};

// Enhanced chat API function
export const sendChatMessage = async (message, options = {}) => {
  try {
    return await retryWithBackoff(async () => {
      const response = await API.post("/chatbot/chat", {
        message: message,
      });
      return response.data;
    }, 3, 1000);
  } catch (error) {
    handleApiError(error, 'Chat Message');
    throw error;
  }
};

// Network status check
export const checkNetworkStatus = async () => {
  try {
    const response = await API.get("/health", { timeout: 5000 });
    return { online: true, status: response.status };
  } catch (error) {
    return { online: false, error: error.message };
  }
};

// Generic API request with enhanced error handling
export const apiRequest = async (method, url, data = null, options = {}) => {
  try {
    const config = {
      method,
      url,
      ...options,
    };
    
    if (data) {
      config.data = data;
    }
    
    return await retryWithBackoff(async () => {
      const response = await API(config);
      return response.data;
    });
  } catch (error) {
    handleApiError(error, `API Request ${method.toUpperCase()} ${url}`);
    throw error;
  }
};

export default API;
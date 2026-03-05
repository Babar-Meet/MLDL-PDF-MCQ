import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api";

// Token storage keys
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Get token from localStorage
const getToken = () => localStorage.getItem(TOKEN_KEY);

// Save token to localStorage
const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// Get user from localStorage
const getStoredUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Save user to localStorage
const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
    // No timeout - let user's PC be the limit remove the iline below
  timeout: 0, // No timeout
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorMessage =
      error.response?.data?.message || error.response?.data?.detail || error.message || "An error occurred";
    return Promise.reject(new Error(errorMessage));
  },
);

// Get all providers and models
export const getAllModels = async () => {
  const response = await api.get("/models");
  return response.data;
};

// Get models available for the current user based on their role
export const getAvailableModels = async () => {
  const response = await api.get("/generate/models");
  return response.data;
};

// Get user quota information
export const getUserQuota = async () => {
  const response = await api.get("/generate/quota");
  return response.data;
};

// Get models for a specific provider
export const getProviderModels = async (provider) => {
  const response = await api.get(`/models/${provider}`);
  return response.data;
};

// Upload files and extract text
export const uploadFiles = async (files, provider, apiKey) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    params: {
      provider,
      api_key: apiKey || undefined,
    },
  };

  const response = await api.post("/generate/upload", formData, config);
  return response.data;
};

// Generate MCQs
export const generateMCQs = async (data) => {
  const response = await api.post("/generate", data);
  return response.data;
};

// Upgrade user to paid plan
export const upgradeToPaid = async () => {
  const response = await api.post("/auth/upgrade");
  return response.data;
};

// Generate MCQs from pre-extracted text using Server-Sent Events
export const generateMCQsFromText = async (data) => {
  const payload = {
    text: data.text,
    prompt: data.prompt,
    model_name: data.model,
    provider: data.provider,
    api_key: data.api_key || undefined,
    temperature: 0.4,
    mcq_count: data.num_mcqs || 10,
    easy: data.easy || 0,
    medium: data.medium || 0,
    hard: data.hard || 0
  };

  const token = getToken();
  
  const response = await fetch(`${API_BASE_URL}/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response;
};

// Save API key for a provider
export const saveApiKey = async (provider, apiKey) => {
  const response = await api.post("/models/config/api-key", {
    provider,
    api_key: apiKey,
  });
  return response.data;
};

// Get API key for a provider
export const getApiKey = async (provider) => {
  const response = await api.get(`/models/config/api-key/${provider}`);
  return response.data;
};

// Save last used provider and model
export const saveLastUsed = async (provider, model) => {
  const response = await api.post("/models/config/last-used", {
    provider,
    model,
  });
  return response.data;
};

// Get last used provider and model
export const getLastUsed = async () => {
  const response = await api.get("/models/config/last-used");
  return response.data;
};

// ==================== AUTH API FUNCTIONS ====================

// Login user
export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  const { token, user } = response.data;
  setToken(token);
  setStoredUser(user);
  return { token, user };
};

// Register new user
export const register = async (email, password, role = "free") => {
  const response = await api.post("/auth/register", { email, password, role });
  const { token, user } = response.data;
  setToken(token);
  setStoredUser(user);
  return { token, user };
};

// Get current user
export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  const user = response.data.user;
  setStoredUser(user);
  return user;
};

// Logout user
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Get stored user info
export const getUser = () => {
  return getStoredUser();
};

// ==================== ADMIN API FUNCTIONS ====================

// Get all users (admin only)
export const getAllUsers = async () => {
  const response = await api.get("/auth/users");
  return response.data;
};

// Update user role (admin only)
export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/auth/users/${userId}/role`, { role });
  return response.data;
};

// Get all models (admin sees all)
export const getAllModelsAdmin = async () => {
  const response = await api.get("/models/admin");
  return response.data.models || response.data;
};

// Create new model (admin only)
export const createModel = async (modelData) => {
  const response = await api.post("/models", modelData);
  return response.data.model || response.data;
};

// Update model (admin only)
export const updateModel = async (modelId, modelData) => {
  const response = await api.put(`/models/${modelId}`, modelData);
  return response.data.model || response.data;
};

// Delete model (admin only)
export const deleteModel = async (modelId) => {
  const response = await api.delete(`/models/${modelId}`);
  return response.data;
};

// Toggle model status (admin only)
export const toggleModelStatus = async (modelId) => {
  const response = await api.patch(`/models/${modelId}/toggle`);
  return response.data.model || response.data;
};

export default api;

import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // No timeout - let user's PC be the limit
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred'
    return Promise.reject(new Error(errorMessage))
  }
)

// Get all providers and models
export const getAllModels = async () => {
  const response = await api.get('/models')
  return response.data
}

// Get models for a specific provider
export const getProviderModels = async (provider) => {
  const response = await api.get(`/models/${provider}`)
  return response.data
}

// Upload files and extract text
export const uploadFiles = async (files, provider, apiKey) => {
  const formData = new FormData()
  
  files.forEach((file) => {
    formData.append('files', file)
  })

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    params: {
      provider,
      api_key: apiKey || undefined,
    },
  }

  const response = await api.post('/generate/upload', formData, config)
  return response.data
}

// Generate MCQs
export const generateMCQs = async (data) => {
  const response = await api.post('/generate', data)
  return response.data
}

// Generate MCQs from pre-extracted text
export const generateMCQsFromText = async (data) => {
  const formData = new FormData()
  formData.append('text', data.text)
  formData.append('prompt', data.prompt)
  formData.append('model_name', data.model)
  formData.append('provider', data.provider)
  if (data.api_key) formData.append('api_key', data.api_key)
  formData.append('temperature', '0.7')
  formData.append('min_chunk_size', '1000')
  formData.append('max_chunk_size', '5000')
  formData.append('mcq_count', data.num_mcqs || 10)

  const response = await api.post('/generate/generate-text', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// Save API key for a provider
export const saveApiKey = async (provider, apiKey) => {
  const response = await api.post('/models/config/api-key', {
    provider,
    api_key: apiKey
  })
  return response.data
}

// Get API key for a provider
export const getApiKey = async (provider) => {
  const response = await api.get(`/models/config/api-key/${provider}`)
  return response.data
}

// Save last used provider and model
export const saveLastUsed = async (provider, model) => {
  const response = await api.post('/models/config/last-used', {
    provider,
    model
  })
  return response.data
}

// Get last used provider and model
export const getLastUsed = async () => {
  const response = await api.get('/models/config/last-used')
  return response.data
}

export default api

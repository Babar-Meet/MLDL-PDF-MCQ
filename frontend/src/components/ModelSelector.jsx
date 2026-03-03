import React, { useState, useEffect } from 'react'
import { Server, Key, ChevronDown } from 'lucide-react'
import { getAllModels, getProviderModels } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

const PROVIDERS = [
  { id: 'local', name: 'Local', requiresApiKey: false },
  { id: 'openrouter', name: 'OpenRouter', requiresApiKey: true },
  { id: 'huggingface', name: 'HuggingFace', requiresApiKey: true },
  { id: 'openai', name: 'OpenAI', requiresApiKey: true },
  { id: 'gemini', name: 'Gemini', requiresApiKey: true },
  { id: 'claude', name: 'Claude', requiresApiKey: true },
]

const ModelSelector = ({ selectedProvider, setSelectedProvider, selectedModel, setSelectedModel, apiKey, setApiKey, onError }) => {
  const [models, setModels] = useState({})
  const [providerModels, setProviderModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [providersLoading, setProvidersLoading] = useState(true)

  useEffect(() => {
    fetchAllProviders()
  }, [])

  useEffect(() => {
    if (selectedProvider) {
      fetchProviderModels(selectedProvider)
    }
  }, [selectedProvider])

  const fetchAllProviders = async () => {
    try {
      const data = await getAllModels()
      setModels(data)
      setProvidersLoading(false)
      
      // Set default provider to first available
      const availableProviders = Object.keys(data)
      if (availableProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(availableProviders[0])
      }
    } catch (error) {
      onError?.(error.message)
      setProvidersLoading(false)
    }
  }

  const fetchProviderModels = async (provider) => {
    setLoadingModels(true)
    try {
      const data = await getProviderModels(provider)
      setProviderModels(data.models || [])
      
      // Set default model
      if (data.models && data.models.length > 0) {
        setSelectedModel(data.models[0])
      } else {
        setSelectedModel('')
      }
    } catch (error) {
      onError?.(error.message)
      setProviderModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)
  const showApiKey = currentProvider?.requiresApiKey

  return (
    <div className="model-selector">
      <div className="selector-row">
        <div className="selector-group">
          <label className="selector-label">
            <Server size={18} />
            Provider
          </label>
          {providersLoading ? (
            <LoadingSpinner size={20} />
          ) : (
            <div className="select-wrapper">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="model-select"
              >
                {Object.keys(models).map((provider) => (
                  <option key={provider} value={provider}>
                    {PROVIDERS.find(p => p.id === provider)?.name || provider}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-icon" size={18} />
            </div>
          )}
        </div>

        <div className="selector-group">
          <label className="selector-label">
            <ChevronDown size={18} />
            Model
          </label>
          {loadingModels ? (
            <LoadingSpinner size={20} />
          ) : (
            <div className="select-wrapper">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
                disabled={providerModels.length === 0}
              >
                {providerModels.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  providerModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="select-icon" size={18} />
            </div>
          )}
        </div>
      </div>

      {showApiKey && (
        <div className="api-key-group">
          <label className="selector-label">
            <Key size={18} />
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="api-key-input"
          />
        </div>
      )}
    </div>
  )
}

export default ModelSelector

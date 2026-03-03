import React, { useState, useEffect } from "react";
import {
  X,
  Server,
  Key,
  ChevronRight,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
  Copy,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
} from "lucide-react";
import {
  getAllModels,
  getProviderModels,
  saveApiKey,
  getApiKey,
  saveLastUsed,
  getLastUsed,
} from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

// Provider configuration
const PROVIDERS = [
  {
    id: "local",
    name: "Ollama (Local)",
    requiresApiKey: false,
    description: "Run AI models locally on your computer",
    icon: "🖥️",
  },
  {
    id: "openai",
    name: "OpenAI",
    requiresApiKey: true,
    description: "GPT-4, GPT-4o, GPT-3.5 Turbo",
    icon: "🤖",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    requiresApiKey: true,
    description: "Claude 3 Opus, Sonnet, Haiku",
    icon: "🧠",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    requiresApiKey: true,
    description: "Gemini Pro, Gemini Flash",
    icon: "🔷",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    requiresApiKey: true,
    description: "Access 100+ AI models",
    icon: "🌐",
  },
];

const ModelSelectorModal = ({
  isOpen,
  onClose,
  selectedProvider,
  selectedModel,
  setSelectedProvider,
  setSelectedModel,
  apiKey,
  setApiKey,
}) => {
  const [models, setModels] = useState({});
  const [providerModels, setProviderModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("local"); // 'local', 'api'
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'success', 'error'
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState("");
  const [saveSettings, setSaveSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAllProviders();
      loadSavedSettings();
    }
  }, [isOpen]);

  // Load saved API key and last used settings
  const loadSavedSettings = async () => {
    try {
      // Get last used settings
      const lastUsed = await getLastUsed();
      if (lastUsed.provider && lastUsed.model) {
        setSelectedProvider(lastUsed.provider);
        setSelectedModel(lastUsed.model);

        // Check if it's a custom model
        const providerModels = models[lastUsed.provider] || [];
        if (!providerModels.includes(lastUsed.model)) {
          setCustomModelName(lastUsed.model);
          setUseCustomModel(true);
        }
      }

      // Get saved API keys
      for (const provider of PROVIDERS) {
        if (provider.requiresApiKey) {
          const keyData = await getApiKey(provider.id);
          if (keyData.has_key && !apiKey) {
            setApiKey(keyData.api_key);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load saved settings:", err);
    }
  };

  useEffect(() => {
    if (selectedProvider) {
      fetchProviderModels(selectedProvider);
      setActiveTab(selectedProvider === "local" ? "local" : "api");
    }
  }, [selectedProvider]);

  // Sync custom model name with selected model when it changes externally
  useEffect(() => {
    if (
      selectedModel &&
      !providerModels.includes(selectedModel) &&
      selectedModel !== ""
    ) {
      setCustomModelName(selectedModel);
      setUseCustomModel(true);
    }
  }, [selectedModel, providerModels]);

  const fetchAllProviders = async () => {
    setLoadingProviders(true);
    setError("");
    try {
      const data = await getAllModels();
      setModels(data);

      // Auto-select first available provider
      const availableProviders = Object.keys(data);
      if (availableProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(availableProviders[0]);
      }
    } catch (err) {
      setError("Failed to load providers. Make sure the backend is running.");
      console.error(err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchProviderModels = async (provider) => {
    setLoadingModels(true);
    setError("");
    try {
      const data = await getProviderModels(provider);
      setProviderModels(data.models || []);

      // Auto-select first model if none selected
      if (data.models && data.models.length > 0 && !selectedModel) {
        setSelectedModel(data.models[0]);
      }
    } catch (err) {
      setError(`Failed to load models for ${provider}`);
      console.error(err);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
    setSelectedModel("");
    setConnectionStatus(null);
    // Reset custom model state
    setUseCustomModel(false);
    setCustomModelName("");

    // Show API key input for providers that need it
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (provider?.requiresApiKey) {
      setShowApiKeyInput(true);
    } else {
      setShowApiKeyInput(false);
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const handleSave = async () => {
    // Allow saving if provider is selected and either:
    // 1. A model is selected from the list, OR
    // 2. A custom model name is entered
    const modelToUse = useCustomModel ? customModelName : selectedModel;

    if (selectedProvider && modelToUse) {
      // Save settings to config.json
      try {
        // Save API key if provided
        if (apiKey && selectedProvider !== "local") {
          await saveApiKey(selectedProvider, apiKey);
        }

        // Save last used provider and model
        await saveLastUsed(selectedProvider, modelToUse);
      } catch (err) {
        console.error("Failed to save settings:", err);
      }

      onClose();
    }
  };

  const testOllamaConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const data = await getProviderModels("local");
      if (data.models && data.models.length > 0) {
        setConnectionStatus("success");
      } else {
        setConnectionStatus("error");
      }
    } catch (err) {
      setConnectionStatus("error");
    } finally {
      setTestingConnection(false);
    }
  };

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider);
  const currentModels = models[selectedProvider] || providerModels;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content model-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Select AI Model</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="modal-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={fetchAllProviders}>
              <RefreshCw size={16} />
            </button>
          </div>
        )}

        <div className="modal-body">
          {/* Provider List */}
          <div className="provider-list">
            <div className="provider-list-header">
              <h3>AI Providers</h3>
              <button
                className="refresh-btn"
                onClick={fetchAllProviders}
                title="Refresh providers"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {loadingProviders ? (
              <div className="loading-container">
                <LoadingSpinner size={24} text="Loading providers..." />
              </div>
            ) : (
              <div className="provider-items">
                {PROVIDERS.map((provider) => {
                  const providerModelsList = models[provider.id] || [];
                  const isSelected = selectedProvider === provider.id;
                  const isAvailable = providerModelsList.length > 0;

                  return (
                    <div
                      key={provider.id}
                      className={`provider-item ${isSelected ? "selected" : ""} ${!isAvailable ? "unavailable" : ""}`}
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      <div className="provider-icon">{provider.icon}</div>
                      <div className="provider-info">
                        <div className="provider-name">
                          {provider.name}
                          {isSelected && (
                            <CheckCircle size={16} className="check-icon" />
                          )}
                        </div>
                        <div className="provider-description">
                          {provider.description}
                        </div>
                      </div>
                      {provider.requiresApiKey && (
                        <Key
                          size={16}
                          className="api-key-icon"
                          title="Requires API Key"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Selection Panel */}
          <div className="model-selection-panel">
            <div className="model-panel-header">
              <h3>
                {currentProvider?.name || "Select a Provider"}
                {selectedProvider === "local" && (
                  <button
                    className={`test-connection-btn ${connectionStatus}`}
                    onClick={testOllamaConnection}
                    disabled={testingConnection}
                    title="Test Ollama connection"
                  >
                    {testingConnection ? (
                      <RefreshCw size={14} className="spinning" />
                    ) : connectionStatus === "success" ? (
                      <CheckCircle size={14} />
                    ) : connectionStatus === "error" ? (
                      <AlertCircle size={14} />
                    ) : (
                      <>
                        <ExternalLink size={14} />
                        Test
                      </>
                    )}
                  </button>
                )}
              </h3>
              {currentProvider?.requiresApiKey && (
                <div className="api-key-section">
                  {showApiKeyInput || apiKey ? (
                    <div className="api-key-input-group">
                      <Key size={14} />
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter API key..."
                        className="api-key-input-small"
                      />
                    </div>
                  ) : (
                    <button
                      className="add-api-key-btn"
                      onClick={() => setShowApiKeyInput(true)}
                    >
                      <Key size={14} />
                      Add API Key
                    </button>
                  )}
                </div>
              )}
            </div>

            {loadingModels ? (
              <div className="loading-container">
                <LoadingSpinner size={24} text="Loading models..." />
              </div>
            ) : (
              <>
                {/* Custom Model Toggle */}
                <div className="custom-model-toggle">
                  <button
                    className={`toggle-btn ${useCustomModel ? "active" : ""}`}
                    onClick={() => {
                      setUseCustomModel(!useCustomModel);
                      if (!useCustomModel && customModelName === "") {
                        // User is switching to custom mode, keep current selection as reference
                      }
                    }}
                  >
                    <Edit3 size={14} />
                    {useCustomModel
                      ? "Using Custom Model"
                      : "Enter Custom Model Name"}
                  </button>
                </div>

                {useCustomModel ? (
                  <div className="custom-model-input">
                    <label className="custom-model-label">
                      <Info size={14} />
                      Enter any model name (free or paid from OpenRouter, etc.)
                    </label>
                    <input
                      type="text"
                      value={customModelName}
                      onChange={(e) => {
                        setCustomModelName(e.target.value);
                        setSelectedModel(e.target.value);
                      }}
                      placeholder="e.g., openai/gpt-4o, anthropic/claude-3.5-sonnet, etc."
                      className="custom-model-text-input"
                    />
                    <div className="custom-model-hint">
                      <strong>Examples:</strong> openai/gpt-4o-mini,
                      meta-llama/llama-3.1-70b-instruct, deepseek/deepseek-chat,
                      minimax/minimax-m2.1,
                      cognitivecomputations/dolphin-mixtral-8x7b, etc.
                    </div>
                  </div>
                ) : currentModels.length > 0 ? (
                  <div className="model-list">
                    {currentModels.map((model) => (
                      <div
                        key={model}
                        className={`model-item ${selectedModel === model ? "selected" : ""}`}
                        onClick={() => handleModelSelect(model)}
                      >
                        <span className="model-name">{model}</span>
                        {selectedModel === model && <Check size={16} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-models">
                    <Info size={24} />
                    <p>
                      {selectedProvider === "local"
                        ? "No Ollama models found. Make sure Ollama is installed and running."
                        : "No models available for this provider."}
                    </p>
                    {selectedProvider === "local" && (
                      <a
                        href="https://ollama.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-link"
                      >
                        <ExternalLink size={14} />
                        Download Ollama
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="modal-footer-left">
            <label className="save-settings-checkbox">
              <input
                type="checkbox"
                checked={saveSettings}
                onChange={(e) => setSaveSettings(e.target.checked)}
              />
              <span>Remember my settings</span>
            </label>
          </div>
          <div className="selected-info">
            {selectedProvider &&
            (selectedModel || (useCustomModel && customModelName)) ? (
              <span>
                Selected: <strong>{currentProvider?.name}</strong> →{" "}
                <strong>
                  {useCustomModel ? customModelName : selectedModel}
                </strong>
                {useCustomModel && (
                  <span className="custom-badge" title="Custom model">
                    {" "}
                    (Custom)
                  </span>
                )}
              </span>
            ) : (
              <span className="no-selection">Please select a model</span>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={
                !selectedProvider ||
                (!selectedModel && (!useCustomModel || !customModelName.trim()))
              }
            >
              <Check size={18} />
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectorModal;

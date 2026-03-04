import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Sparkles,
  Bot,
  ChevronDown,
  Copy,
  Download,
  Clock,
  Cpu,
  AlertCircle,
  CheckCircle,
  X,
  Crown,
  Zap,
  Shield,
  Send,
  Loader2,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { logoutUser, selectUser, selectIsAdmin } from "../store/authSlice";
import { fetchAvailableModels, selectAvailableModels } from "../store/modelsSlice";
import {
  generateMCQsFromText,
  getUserQuota,
} from "../services/api";
import "../App.css";

// Provider display names
const PROVIDER_NAMES = {
  local: "Ollama (Local)",
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
};

// Skeleton loader component
const SkeletonLoader = ({ lines = 5 }) => {
  return (
    <div className="skeleton-container">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

// Home Page Component - ChatGPT Style
function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const availableModels = useSelector(selectAvailableModels);

  const isPaid = user?.role === 'paid';
  const isFree = user?.role === 'free';

  // State management
  const [selectedModel, setSelectedModel] = useState(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Input state
  const [easyCount, setEasyCount] = useState("");
  const [mediumCount, setMediumCount] = useState("");
  const [hardCount, setHardCount] = useState("");
  const [prompt, setPrompt] = useState("");

  // Output state
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Metadata
  const [metadata, setMetadata] = useState(null);

  // Quota state
  const [quota, setQuota] = useState(null);

  // Load available models and quota on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load available models based on user role
      await dispatch(fetchAvailableModels());
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  };

  // Set selected model when models are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      // Set default model (prefer free/Ollama for free users)
      const freeModel = availableModels.find((m) => m.isFree);
      setSelectedModel(freeModel || availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  // Load quota for free users
  useEffect(() => {
    if (user) {
      loadQuota();
    }
  }, [user]);

  const loadQuota = async () => {
    if (isFree) {
      try {
        const quotaData = await getUserQuota();
        setQuota(quotaData.quota);
      } catch (error) {
        console.error("Failed to load quota:", error);
      }
    } else {
      // Paid/admin users have unlimited
      setQuota({
        role: user?.role,
        used: 0,
        limit: "unlimited",
        remaining: "unlimited",
      });
    }
  };

  // Handle errors
  const handleError = useCallback((message) => {
    setGlobalError(message);
    setTimeout(() => setGlobalError(""), 6000);
  }, []);

  // Handle model selection
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
  };

  // Get total MCQs to generate
  const getTotalMCQs = () => {
    const easy = parseInt(easyCount) || 0;
    const medium = parseInt(mediumCount) || 0;
    const hard = parseInt(hardCount) || 0;
    return easy + medium + hard;
  };

  // Check quota before generation
  const canGenerate = () => {
    const total = getTotalMCQs();
    if (total === 0) return false;
    if (isFree && quota && quota.remaining !== "unlimited" && quota.remaining < total) {
      return false;
    }
    return selectedModel && prompt.trim();
  };

  // Handle MCQ generation
  const handleGenerate = async () => {
    if (!canGenerate()) return;

    const easy = parseInt(easyCount) || 0;
    const medium = parseInt(mediumCount) || 0;
    const hard = parseInt(hardCount) || 0;
    const total = easy + medium + hard;

    setIsGenerating(true);
    setOutput("");
    setMetadata(null);

    const startTime = Date.now();

    try {
      // Build prompt with difficulty breakdown
      let difficultyPrompt = prompt;
      if (easy > 0 || medium > 0 || hard > 0) {
        difficultyPrompt = `${prompt}

Please generate:
- ${easy} Easy questions (basic recall, straightforward)
- ${medium} Medium questions (understanding/application)
- ${hard} Hard questions (analysis/synthesis)

Format each question as:
Q[n]. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

Mark clearly which questions are Easy, Medium, or Hard.`;
      }

      const result = await generateMCQsFromText({
        text: prompt,
        provider: selectedModel?.provider || "ollama",
        model: selectedModel?.modelId || "llama2",
        api_key: selectedModel?.apiKey || undefined,
        prompt: difficultyPrompt,
        num_mcqs: total,
      });

      const endTime = Date.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

      setOutput(result.generated_output || result.output || "");
      setMetadata({
        model: result.model_used || selectedModel?.name,
        provider: PROVIDER_NAMES[selectedModel?.provider] || selectedModel?.provider,
        chunksProcessed: result.total_chunks || 1,
        timeTaken: result.processing_time || timeTaken,
      });

      // Update quota for free users
      if (isFree) {
        setQuota((prev) => ({
          ...prev,
          used: prev.used + total,
          remaining: prev.remaining - total,
        }));
      }

      handleError("");
    } catch (error) {
      let errorMsg = error.message || "Failed to generate MCQs";

      if (selectedModel?.provider === "ollama") {
        if (
          errorMsg.includes("Connection") ||
          errorMsg.includes("connect") ||
          errorMsg.includes("Ollama")
        ) {
          errorMsg =
            "Cannot connect to Ollama. Make sure Ollama is running (run 'ollama serve' in terminal)";
        }
      } else if (errorMsg.includes("401") || errorMsg.includes("API key")) {
        errorMsg = "Invalid API key. Please check your API key in model settings.";
      } else if (errorMsg.includes("rate limit")) {
        errorMsg = "Rate limit exceeded. Please try again later or use a different provider.";
      } else if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable")) {
        errorMsg = "MCQ service is unavailable. Please start the Python backend.";
      }

      handleError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [output]);

  // Download as text file
  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcqs.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle logout
  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  // Get role badge
  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="role-badge role-admin">
          <Shield size={12} />
          Admin
        </span>
      );
    } else if (isPaid) {
      return (
        <span className="role-badge role-paid">
          <Crown size={12} />
          Paid
        </span>
      );
    } else {
      return (
        <span className="role-badge role-free">
          <User size={12} />
          Free
        </span>
      );
    }
  };

  // Get quota display
  const getQuotaDisplay = () => {
    if (!quota) return null;
    if (quota.remaining === "unlimited") {
      return { used: quota.used, limit: "Unlimited", remaining: "Unlimited" };
    }
    return {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
    };
  };

  const quotaDisplay = getQuotaDisplay();

  return (
    <div className="chatgpt-container">
      {/* Header */}
      <header className="chatgpt-header">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <div className="header-icon">
              <Sparkles size={24} />
            </div>
            <span className="header-title">MCQ Generator</span>
          </Link>
        </div>

        <div className="header-right">
          {user && (
            <>
              {/* Model Selection Dropdown */}
              <div className="model-dropdown-container">
                <button
                  className="model-dropdown-btn"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                >
                  <Bot size={16} />
                  <span>{selectedModel?.name || "Select Model"}</span>
                  <ChevronDown size={14} />
                </button>

                {showModelDropdown && (
                  <div className="model-dropdown">
                    {availableModels.map((model) => (
                      <button
                        key={model._id || model.id}
                        className={`model-option ${
                          selectedModel?._id === model._id ? "selected" : ""
                        }`}
                        onClick={() => handleModelSelect(model)}
                      >
                        <span className="model-name">{model.name}</span>
                        <span className="model-provider">
                          {PROVIDER_NAMES[model.provider] || model.provider}
                        </span>
                        {model.isFree && <span className="free-badge">Free</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="user-info">
                <span className="user-email">{user?.email}</span>
                {getRoleBadge()}
              </div>

              {/* Admin Link */}
              {isAdmin && (
                <Link to="/admin" className="admin-link" title="Admin Dashboard">
                  <Settings size={18} />
                </Link>
              )}

              {/* Logout */}
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="chatgpt-main">
        {/* Error Banner */}
        {globalError && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{globalError}</span>
            <button onClick={() => setGlobalError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Output Area */}
        <div className="output-area">
          {isGenerating ? (
            <div className="output-generating">
              <SkeletonLoader lines={8} />
              <div className="generating-indicator">
                <Loader2 size={20} className="spinner" />
                <span>Generating MCQs...</span>
              </div>
            </div>
          ) : output ? (
            <div className="output-content">
              <div className="output-header">
                <div className="output-meta">
                  <Cpu size={14} />
                  <span>{metadata?.provider}</span>
                  <span className="meta-separator">•</span>
                  <span>{metadata?.model}</span>
                  <span className="meta-separator">•</span>
                  <Clock size={14} />
                  <span>{metadata?.timeTaken}s</span>
                </div>
                <div className="output-actions">
                  <button className="action-btn" onClick={handleCopy} title="Copy">
                    <Copy size={16} />
                    Copy
                  </button>
                  <button className="action-btn" onClick={handleDownload} title="Download">
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
              <pre className="output-text">{output}</pre>
            </div>
          ) : (
            <div className="output-empty">
              <Sparkles size={48} className="empty-icon" />
              <p>Your MCQs will appear here</p>
              <p className="empty-hint">Enter text and click Generate to create MCQs</p>
            </div>
          )}
        </div>

        {/* Success Toast */}
        {copySuccess && (
          <div className="success-toast">
            <CheckCircle size={18} />
            <span>Copied to clipboard!</span>
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          {/* Quota Display for Free Users */}
          {isFree && quotaDisplay && (
            <div className="quota-bar">
              <span className="quota-text">
                {quotaDisplay.remaining} MCQs remaining
              </span>
              <div className="quota-progress">
                <div
                  className="quota-fill"
                  style={{
                    width: `${Math.min(
                      (quotaDisplay.used / quotaDisplay.limit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="text-input-container">
            <textarea
              className="text-input"
              placeholder="Paste your study material or text here to generate MCQs..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* MCQ Count Inputs */}
          <div className="mcq-inputs-row">
            <div className="mcq-input-group">
              <label>Easy</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={easyCount}
                onChange={(e) => setEasyCount(e.target.value)}
              />
            </div>
            <div className="mcq-input-group">
              <label>Medium</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={mediumCount}
                onChange={(e) => setMediumCount(e.target.value)}
              />
            </div>
            <div className="mcq-input-group">
              <label>Hard</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={hardCount}
                onChange={(e) => setHardCount(e.target.value)}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="generate-row">
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={!canGenerate() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Generate {getTotalMCQs() > 0 ? `(${getTotalMCQs()})` : ""}
                </>
              )}
            </button>

            {isFree && !isPaid && !isAdmin && (
              <Link to="/upgrade" className="upgrade-link">
                <Crown size={14} />
                Upgrade for unlimited
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;

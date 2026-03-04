import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Shield,
  Send,
  Loader2,
  User,
  LogOut,
  Settings,
  FileUp,
  FileText,
  Trash2,
  Eye,
  Upload,
  Zap,
  BarChart,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { logoutUser, selectUser, selectIsAdmin } from "../store/authSlice";
import {
  fetchAvailableModels,
  selectAvailableModels,
} from "../store/modelsSlice";
import {
  generateMCQsFromText,
  getUserQuota,
  uploadFiles,
} from "../services/api";
import "../App.css";

// Helper function to render markdown bold syntax in display
const renderMarkdownBold = (text) => {
  if (!text) return null;
  // Split by ** pattern and render bold sections
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Helper function to strip markdown bold syntax for downloads
const stripMarkdownBold = (text) => {
  if (!text) return "";
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
};
const PROVIDER_NAMES = {
  local: "Ollama (Local)",
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
  ollama: "Ollama",
};

// Parse MCQ output into structured format
const parseMCQOutput = (output) => {
  if (!output) return { easy: [], medium: [], hard: [], uncategorized: [] };

  const sections = {
    easy: [],
    medium: [],
    hard: [],
    uncategorized: [],
  };

  // Split by difficulty headers
  const easyMatch = output.match(
    /Easy[:\s]*([\s\S]*?)(?=Medium[:\s]*|Hard[:\s]*|$)/i,
  );
  const mediumMatch = output.match(
    /Medium[:\s]*([\s\S]*?)(?=Easy[:\s]*|Hard[:\s]*|$)/i,
  );
  const hardMatch = output.match(
    /Hard[:\s]*([\s\S]*?)(?=Easy[:\s]*|Medium[:\s]*|$)/i,
  );

  if (easyMatch) sections.easy = parseQuestions(easyMatch[1]);
  if (mediumMatch) sections.medium = parseQuestions(mediumMatch[1]);
  if (hardMatch) sections.hard = parseQuestions(hardMatch[1]);

  // If no clear sections, treat all as uncategorized
  if (!easyMatch && !mediumMatch && !hardMatch) {
    sections.uncategorized = parseQuestions(output);
  }

  return sections;
};

const parseQuestions = (text) => {
  const questions = [];
  // Match questions like "Q1." or "1." or "Question 1:"
  const questionPattern =
    /(?:Q(?:uestion)?\.?\s*)(\d+)[\.\)]\s*([\s\S]*?)(?=(?:Q(?:uestion)?\.?\s*\d+)|$)/gi;
  let match;

  while ((match = questionPattern.exec(text)) !== null) {
    const questionText = match[2].trim();
    // Extract options
    const options = [];
    const optionMatches = questionText.matchAll(
      /(?:^|\n)\s*([A-D])\)[\s]*(.*)/gi,
    );
    for (const opt of optionMatches) {
      options.push({ label: opt[1], text: opt[2].trim() });
    }

    // Extract answer
    const answerMatch = questionText.match(/Answer:?\s*([A-D])/i);

    if (questionText.length > 10) {
      questions.push({
        number: match[1],
        text: questionText.replace(/\n[A-D]\).*/gi, "").trim(),
        options,
        answer: answerMatch ? answerMatch[1].toUpperCase() : null,
      });
    }
  }

  return questions;
};

// Chat-style skeleton loader
const ChatSkeletonLoader = ({ type = "message" }) => {
  if (type === "model") {
    return (
      <div className="chat-skeleton-model">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-content">
          <div className="skeleton-line short"></div>
          <div className="skeleton-line medium"></div>
        </div>
      </div>
    );
  }

  if (type === "extraction") {
    return (
      <div className="chat-skeleton-extraction">
        <div className="skeleton-avatar extraction"></div>
        <div className="skeleton-content">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  // Default MCQ generation skeleton
  return (
    <div className="chat-skeleton-mcq">
      <div className="skeleton-avatar bot"></div>
      <div className="skeleton-content">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line medium"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
    </div>
  );
};

// MCQ Question Component
const MCQQuestion = ({ question, number, difficulty }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const getDifficultyIcon = () => {
    switch (difficulty) {
      case "easy":
        return <Sparkles size={14} />;
      case "medium":
        return <BarChart size={14} />;
      case "hard":
        return <Zap size={14} />;
      default:
        return <HelpCircle size={14} />;
    }
  };

  return (
    <div className={`mcq-card difficulty-${difficulty}`}>
      <div className="mcq-header-row">
        <span className="mcq-number">Question {number}</span>
        <span className={`difficulty-badge ${difficulty}`}>
          {getDifficultyIcon()}
          {difficulty}
        </span>
      </div>
      <p className="mcq-question-text">{question.text}</p>
      <div className="mcq-options">
        {question.options.map((opt, idx) => (
          <div
            key={idx}
            className={`mcq-option ${
              showAnswer && question.answer === opt.label ? "correct" : ""
            }`}
            onClick={() => !showAnswer && setShowAnswer(true)}
          >
            <span className="option-label">{opt.label}</span>
            <span className="option-text">{opt.text}</span>
          </div>
        ))}
      </div>
      <button
        className={`show-answer-btn ${showAnswer ? "active" : ""}`}
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <Lightbulb size={16} />
        {showAnswer ? `Answer: ${question.answer}` : "Reveal Answer"}
      </button>
    </div>
  );
};

// Extracted Content Modal
const ExtractedContentModal = ({ isOpen, onClose, content, fileName }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content extracted-content-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <FileText size={20} />
            Extracted Content from {fileName}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body extracted-content-body">
          <pre className="extracted-text">{content}</pre>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              const blob = new Blob([content], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "extracted-content.txt";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// Home Page Component - ChatGPT-like Interface
function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const availableModels = useSelector(selectAvailableModels);

  const isPaid = user?.role === "paid";
  const isFree = user?.role === "free";

  // State management
  const [selectedModel, setSelectedModel] = useState(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Input state
  const [easyCount, setEasyCount] = useState("");
  const [mediumCount, setMediumCount] = useState("");
  const [hardCount, setHardCount] = useState("");

  // PDF state
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Loading states
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Output state
  const [parsedOutput, setParsedOutput] = useState(null);
  const [rawOutput, setRawOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal state
  const [showExtractedModal, setShowExtractedModal] = useState(false);

  // Auto-scroll ref for streaming content
  const chatMessagesRef = useRef(null);

  // Metadata
  const [metadata, setMetadata] = useState(null);

  // Quota state
  const [quota, setQuota] = useState(null);

  // Load available models and quota on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUserData = async () => {
    setIsModelLoading(true);
    setGlobalError("");
    try {
      const result = await dispatch(fetchAvailableModels()).unwrap();
      console.log("Models loaded successfully:", result);

      // Log the structure for debugging
      if (result && result.models) {
        console.log("Models array found:", result.models.length, "models");
      } else if (Array.isArray(result)) {
        console.log("Direct array result:", result.length, "models");
      }
    } catch (error) {
      console.error("Failed to load models - Full error:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to load models. Please refresh the page.";

      if (error?.response?.status === 401) {
        errorMessage = "Authentication expired. Please log in again.";
      } else if (error?.response?.status === 403) {
        errorMessage = "You don't have permission to access models.";
      } else if (error?.code === "ECONNREFUSED") {
        errorMessage =
          "Cannot connect to server. Please ensure the backend is running.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setGlobalError(errorMessage);
    } finally {
      setIsModelLoading(false);
    }
  };

  // Set selected model when models are loaded
  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !selectedModel) {
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
      setQuota({
        role: user?.role,
        used: 0,
        limit: "unlimited",
        remaining: "unlimited",
      });
    }
  };

  // Handle PDF upload
  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      handleError("Please select a PDF file");
      return;
    }

    setPdfFile(file);
    setIsUploading(true);
    setIsExtracting(true);
    setUploadStatus("Uploading and extracting text...");

    try {
      const result = await uploadFiles([file]);

      const text = Object.values(result.extracted_texts || {}).join("\n\n");

      if (text && text.length > 0) {
        setExtractedText(text);
        setUploadStatus(
          `PDF uploaded! ${result.total_text_length} characters extracted.`,
        );
      } else {
        handleError("Could not extract text from the PDF");
        setUploadStatus("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      handleError(error.message || "Failed to upload PDF");
      setUploadStatus("");
      setPdfFile(null);
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  // Clear PDF and reset
  const handleClearPdf = () => {
    setPdfFile(null);
    setExtractedText("");
    setUploadStatus("");
    setParsedOutput(null);
    setRawOutput("");
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

  // Check if can generate - FIXED: More permissive logic
  const canGenerate = () => {
    const total = getTotalMCQs();

    // Must have at least one question requested
    if (total === 0) return false;

    // Must have extracted text (from PDF)
    if (!extractedText) return false;

    // Check quota for free users
    if (
      isFree &&
      quota &&
      quota.remaining !== "unlimited" &&
      quota.remaining < total
    ) {
      return false;
    }

    // Must have a model selected
    return !!selectedModel;
  };

  // Handle MCQ generation
  const handleGenerate = async () => {
    if (!canGenerate()) return;

    const easy = parseInt(easyCount) || 0;
    const medium = parseInt(mediumCount) || 0;
    const hard = parseInt(hardCount) || 0;
    const total = easy + medium + hard;

    setIsGenerating(true);
    setParsedOutput(null);
    setRawOutput("");
    setMetadata(null);

    const startTime = Date.now();

    try {
      // Build prompt with difficulty breakdown
      let difficultyPrompt = `Generate ${total} multiple choice questions from the following study material:\n\n${extractedText}\n\n`;

      if (easy > 0 || medium > 0 || hard > 0) {
        difficultyPrompt += `Please generate:
- ${easy} Easy questions (basic recall, straightforward facts)
- ${medium} Medium questions (understanding/application)
- ${hard} Hard questions (analysis/synthesis)

`;
      }

      difficultyPrompt += `Format each question as:
Q[n]. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

IMPORTANT: Clearly label each question with its difficulty level like:
Easy: Q1. ...
Medium: Q2. ...
Hard: Q3. ...`;

      const response = await generateMCQsFromText({
        text: extractedText,
        provider: selectedModel?.provider || "ollama",
        model: selectedModel?.modelId || "llama2",
        api_key: selectedModel?.apiKey || undefined,
        prompt: difficultyPrompt,
        num_mcqs: total,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let finalRawOutput = "";
      let sseBuffer = ""; // Accumulates partial SSE data across TCP reads
      let streamError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by double newline)
        const events = sseBuffer.split("\n\n");
        // Keep the last (potentially incomplete) chunk in the buffer
        sseBuffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const dataStr = line.slice(6); // Remove "data: " prefix
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed && typeof parsed === "object" && parsed.type) {
                // It's a control message (progress, error, complete)
                if (parsed.type === "progress") {
                  continue;
                } else if (parsed.type === "error") {
                  streamError = parsed.message;
                } else if (parsed.type === "complete") {
                  setMetadata({
                    model: parsed.model_used || selectedModel?.name,
                    provider:
                      PROVIDER_NAMES[parsed.provider] || parsed.provider,
                    chunksProcessed: 1,
                    timeTaken:
                      parsed.processingTime ||
                      ((Date.now() - startTime) / 1000).toFixed(2),
                  });
                }
              } else {
                // It's a text token (JSON string like "Hello")
                finalRawOutput += parsed;
                setRawOutput(finalRawOutput);

                // Auto-scroll to bottom when new content arrives using requestAnimationFrame
                if (chatMessagesRef.current) {
                  requestAnimationFrame(() => {
                    if (chatMessagesRef.current) {
                      chatMessagesRef.current.scrollTop =
                        chatMessagesRef.current.scrollHeight;
                    }
                  });
                }
              }
            } catch {
              // Not valid JSON - treat the raw data as a text token
              finalRawOutput += dataStr;
              setRawOutput(finalRawOutput);
            }
          }
        }
      }

      // Flush remaining SSE buffer after streaming completes
      if (sseBuffer) {
        const lines = sseBuffer.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const dataStr = line.slice(6); // Remove "data: " prefix
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            // Only process text tokens, skip control messages in buffer
            if (parsed && typeof parsed === "string") {
              finalRawOutput += parsed;
            }
          } catch {
            // Not valid JSON - treat as text
            finalRawOutput += dataStr;
          }
        }
        // Update with any additional buffered content
        if (finalRawOutput !== rawOutput) {
          setRawOutput(finalRawOutput);
          // Auto-scroll after buffer flush using requestAnimationFrame
          if (chatMessagesRef.current) {
            requestAnimationFrame(() => {
              if (chatMessagesRef.current) {
                chatMessagesRef.current.scrollTop =
                  chatMessagesRef.current.scrollHeight;
              }
            });
          }
        }
      }

      // Throw stream error after the loop so it's caught by the outer catch
      if (streamError) {
        throw new Error(streamError);
      }

      // If no metadata was set during streaming, set defaults
      if (!metadata) {
        setMetadata({
          model: selectedModel?.name,
          provider:
            PROVIDER_NAMES[selectedModel?.provider] || selectedModel?.provider,
          chunksProcessed: 1,
          timeTaken: ((Date.now() - startTime) / 1000).toFixed(2),
        });
      }

      setParsedOutput(parseMCQOutput(finalRawOutput));

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

      if (
        selectedModel?.provider === "ollama" ||
        selectedModel?.provider === "local"
      ) {
        if (
          errorMsg.includes("Connection") ||
          errorMsg.includes("connect") ||
          errorMsg.includes("Ollama")
        ) {
          errorMsg =
            "Cannot connect to Ollama. Make sure Ollama is running (run 'ollama serve' in terminal)";
        }
      } else if (errorMsg.includes("401") || errorMsg.includes("API key")) {
        errorMsg =
          "Invalid API key. Please check your API key in model settings.";
      } else if (errorMsg.includes("rate limit")) {
        errorMsg =
          "Rate limit exceeded. Please try again later or use a different provider.";
      } else if (
        errorMsg.includes("503") ||
        errorMsg.includes("Service Unavailable")
      ) {
        errorMsg =
          "MCQ service is unavailable. Please start the backend service.";
      }

      handleError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (rawOutput) {
      navigator.clipboard.writeText(rawOutput);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [rawOutput]);

  // Download as text file - strip markdown bold
  const handleDownload = () => {
    const cleanOutput = stripMarkdownBold(rawOutput);
    const blob = new Blob([cleanOutput], { type: "text/plain" });
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

  // View extracted content in new tab
  const handleViewExtracted = () => {
    if (extractedText) {
      const blob = new Blob([extractedText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <Link to="/" className="header-logo">
            <div className="header-icon">
              <Sparkles size={22} />
            </div>
            <span className="header-title">MCQ Generator</span>
          </Link>
        </div>

        <div className="header-right">
          {user && (
            <>
              {/* Model Selection Dropdown */}
              <div className="model-dropdown-container" ref={dropdownRef}>
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
                    {availableModels && availableModels.length > 0 ? (
                      availableModels.map((model) => (
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
                          {model.isFree && (
                            <span className="free-badge">Free</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="no-models">
                        <p>No models available</p>
                      </div>
                    )}
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
                <Link
                  to="/admin"
                  className="admin-link"
                  title="Admin Dashboard"
                >
                  <Settings size={18} />
                </Link>
              )}

              {/* Logout */}
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-main">
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

        {/* Chat Messages Area */}
        <div className="chat-messages" ref={chatMessagesRef}>
          {/* Empty State */}
          {!parsedOutput && !isGenerating && !extractedText && (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <Sparkles size={48} />
              </div>
              <h2>How can I help you today?</h2>
              <p>
                Upload a PDF document and specify the number of questions you
                want to generate.
              </p>
            </div>
          )}

          {/* Model Loading Skeleton */}
          {isModelLoading && (
            <div className="chat-message model-loading">
              <ChatSkeletonLoader type="model" />
            </div>
          )}

          {/* PDF Extraction Skeleton */}
          {isExtracting && (
            <div className="chat-message extraction-loading">
              <ChatSkeletonLoader type="extraction" />
            </div>
          )}

          {/* MCQ Generation - Live Streaming Display */}
          {isGenerating && (
            <div className="chat-message generation-loading">
              {!rawOutput ? (
                <>
                  <ChatSkeletonLoader type="mcq" />
                  <div className="generation-status">
                    <Loader2 size={18} className="spinner" />
                    <span>Generating MCQs...</span>
                  </div>
                </>
              ) : (
                <div className="streaming-output">
                  <div className="generation-status">
                    <Loader2 size={18} className="spinner" />
                    <span>Streaming MCQs...</span>
                  </div>
                  <div className="streaming-text">
                    <span>{renderMarkdownBold(rawOutput)}</span>
                    <span className="cursor-blink">▊</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw Output - Always visible after generation */}
          {rawOutput && !isGenerating && (
            <div className="raw-output-container">
              {metadata && (
                <div className="raw-output-header-simple">
                  <span className="raw-output-meta">
                    {metadata.provider} - {metadata.model} - {metadata.timeTaken}s
                  </span>
                  <div className="raw-output-actions">
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
              )}
              <div className="raw-output-content">
                <div className="raw-output-text">
                  {renderMarkdownBold(rawOutput)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Section - Bottom - Compact ChatGPT Style */}
        <div className="chat-input-area compact">
          {/* Quota Display for Free Users */}
          {isFree && quotaDisplay && quotaDisplay.remaining !== "Unlimited" && (
            <div className="quota-bar compact">
              <span className="quota-text">
                {quotaDisplay.remaining} MCQs remaining
              </span>
              <div className="quota-progress">
                <div
                  className="quota-fill"
                  style={{
                    width: `${Math.min(
                      (quotaDisplay.used / quotaDisplay.limit) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Input Container - Compact */}
          <div className="input-container compact">
            {/* Top Row: PDF Upload (moved above inputs) */}
            <div className="compact-pdf-row">
              <label htmlFor="pdf-upload" className="pdf-upload-btn compact">
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    Processing...
                  </>
                ) : pdfFile ? (
                  <>
                    <FileText size={14} />
                    <span className="pdf-filename">{pdfFile.name}</span>
                    <button
                      className="clear-pdf-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClearPdf();
                      }}
                      title="Remove PDF"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload PDF
                  </>
                )}
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={isUploading}
                style={{ display: "none" }}
              />

              {/* View Content Button */}
              {extractedText && (
                <button
                  className="view-content-btn compact"
                  onClick={() => setShowExtractedModal(true)}
                  title="View Extracted Content"
                >
                  <Eye size={14} />
                  View
                </button>
              )}

              {/* Upload Status */}
              {uploadStatus && !pdfFile && (
                <span className="upload-status-text compact">
                  {uploadStatus}
                </span>
              )}
            </div>

            {/* Bottom Row: Compact input controls */}
            <div className="compact-controls-row">
              {/* Difficulty Inputs - Compact inline */}
              <div className="compact-difficulty-inputs">
                <div className="difficulty-input-wrapper easy">
                  <label className="difficulty-label">Easy</label>
                  <span className="difficulty-dot easy"></span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={easyCount}
                    onChange={(e) => setEasyCount(e.target.value)}
                    className="difficulty-input compact"
                    aria-label="Number of Easy MCQs"
                  />
                </div>
                <div className="difficulty-input-wrapper medium">
                  <label className="difficulty-label">Medium</label>
                  <span className="difficulty-dot medium"></span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mediumCount}
                    onChange={(e) => setMediumCount(e.target.value)}
                    className="difficulty-input compact"
                    aria-label="Number of Medium MCQs"
                  />
                </div>
                <div className="difficulty-input-wrapper hard">
                  <label className="difficulty-label">Hard</label>
                  <span className="difficulty-dot hard"></span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={hardCount}
                    onChange={(e) => setHardCount(e.target.value)}
                    className="difficulty-input compact"
                    aria-label="Number of Hard MCQs"
                  />
                </div>
              </div>

              {/* Status and Generate */}
              <div className="compact-action-row">
                {/* Status */}
                <div className="compact-status">
                  {getTotalMCQs() > 0 && extractedText && (
                    <span className="total-questions compact">
                      {getTotalMCQs()} questions
                    </span>
                  )}
                </div>

                {/* Generate Button */}
                <div className="compact-generate">
                  {isFree && !isPaid && !isAdmin && (
                    <Link to="/upgrade" className="upgrade-link compact">
                      <Crown size={12} />
                      Upgrade
                    </Link>
                  )}
                  <button
                    className="generate-btn compact"
                    onClick={handleGenerate}
                    disabled={!canGenerate() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="spinner" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Content Modal */}
        <ExtractedContentModal
          isOpen={showExtractedModal}
          onClose={() => setShowExtractedModal(false)}
          content={extractedText}
          fileName={pdfFile?.name}
        />
      </main>

      {/* Success Toast */}
      {copySuccess && (
        <div className="success-toast">
          <CheckCircle size={18} />
          <span>Copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}

export default Home;
import React, { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import Header from "./components/Header";
import ModelSelectorModal from "./components/ModelSelectorModal";
import FileUpload from "./components/FileUpload";
import MCQInput from "./components/MCQInput";
import LoadingSpinner from "./components/LoadingSpinner";
import {
  uploadFiles,
  generateMCQsFromText,
  getAllModels,
} from "./services/api";
import { useApi } from "./hooks/useApi";
import "./App.css";

// Provider display names
const PROVIDER_NAMES = {
  local: "Ollama (Local)",
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
};

function App() {
  // State management
  const [selectedProvider, setSelectedProvider] = useState("local");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [files, setFiles] = useState([]);
  const [extractedText, setExtractedText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mcqCount, setMcqCount] = useState(10);
  const [difficulty, setDifficulty] = useState("Medium");
  const [output, setOutput] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [globalError, setGlobalError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // UI State
  const [showModelModal, setShowModelModal] = useState(false);

  // API hooks
  const { loading: isUploading, execute: uploadExecute } = useApi();
  const { loading: isGenerating, execute: generateExecute } = useApi();

  // Load initial models
  useEffect(() => {
    loadInitialModels();
  }, []);

  const loadInitialModels = async () => {
    try {
      const data = await getAllModels();
      const providers = Object.keys(data);

      if (providers.length > 0) {
        setSelectedProvider(providers[0]);

        let models = data[providers[0]] || [];

        if (models.length === 0) {
          for (const p of providers) {
            if (data[p] && data[p].length > 0) {
              models = data[p];
              setSelectedProvider(p);
              break;
            }
          }
        }

        if (models.length > 0) {
          setSelectedModel(models[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load initial models:", error);
      setSelectedModel("llama2");
    }
  };

  // Handle errors
  const handleError = useCallback((message) => {
    setGlobalError(message);
    setTimeout(() => setGlobalError(""), 6000);
  }, []);

  // Handle file upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    if (!selectedModel) {
      handleError("Please select a model first");
      return;
    }

    try {
      const result = await uploadExecute(
        uploadFiles,
        files,
        selectedProvider,
        apiKey,
      );

      const texts = result.extracted_texts || {};
      const combinedText = Object.values(texts).join("\n\n");
      setExtractedText(combinedText || "");
      handleError("");
    } catch (error) {
      let errorMsg = error.message || "Failed to upload files";

      if (selectedProvider === "local") {
        if (errorMsg.includes("Connection") || errorMsg.includes("connect")) {
          errorMsg =
            "Cannot connect to Ollama. Make sure Ollama is running (run 'ollama serve' in terminal)";
        }
      }

      handleError(errorMsg);
    }
  };

  // Handle MCQ generation - SIMPLE PROMPT
  const handleGenerate = async () => {
    if (!extractedText || !selectedModel) return;

    // Simple, direct prompt without any restrictions
    const finalPrompt =
      prompt ||
      `Create ${mcqCount} multiple choice questions from the text below. ${difficulty} difficulty.

For each question:
- Write the question clearly
- Provide 4 options: A, B, C, D
- indicate the correct answer

Text:
${extractedText}`;

    const startTime = Date.now();

    try {
      const result = await generateExecute(generateMCQsFromText, {
        text: extractedText,
        provider: selectedProvider,
        model: selectedModel,
        api_key: apiKey || undefined,
        prompt: finalPrompt,
        num_mcqs: mcqCount,
        difficulty: difficulty,
      });

      const endTime = Date.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

      setOutput(result.generated_output || result.output || "");
      setMetadata({
        model: result.model_used || result.model || selectedModel,
        provider: PROVIDER_NAMES[selectedProvider] || selectedProvider,
        chunksProcessed: result.total_chunks || result.chunks_processed || 0,
        timeTaken: result.processing_time || timeTaken,
      });
      handleError("");
    } catch (error) {
      let errorMsg = error.message || "Failed to generate MCQs";

      if (selectedProvider === "local") {
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
      }

      handleError(errorMsg);
    }
  };

  // Copy to clipboard
  const handleCopySuccess = useCallback(() => {
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, []);

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

  // Check if generate button should be disabled
  const canGenerate = extractedText && selectedModel;

  // Get provider display name
  const getProviderDisplayName = () => {
    return PROVIDER_NAMES[selectedProvider] || selectedProvider;
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="container">
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

          {/* Model Selection Bar */}
          <div className="model-bar">
            <button
              className="model-bar-btn"
              onClick={() => setShowModelModal(true)}
            >
              <Bot size={18} />
              <span className="model-name">
                {selectedModel || "Select Model"}
              </span>
              <ChevronDown size={16} />
            </button>

            <div className="model-info">
              <span className="provider-badge">{getProviderDisplayName()}</span>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="upload-section">
            <FileUpload
              files={files}
              setFiles={setFiles}
              extractedText={extractedText}
              isUploading={isUploading}
              onUpload={handleUpload}
              error=""
              disabled={false}
            />
          </div>

          {/* MCQ Input Section */}
          <div className="input-section">
            <MCQInput
              prompt={prompt}
              setPrompt={setPrompt}
              mcqCount={mcqCount}
              setMcqCount={setMcqCount}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              extractedText={extractedText}
              selectedModel={selectedModel}
            />
          </div>

          {/* Output Display */}
          <div className="output-section">
            {isGenerating ? (
              <div className="output-generating">
                <LoadingSpinner size={32} text="Generating MCQs..." />
                <p className="generating-hint">
                  Using {getProviderDisplayName()} - {selectedModel}
                </p>
              </div>
            ) : output ? (
              <div className="output-container">
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
                    <button
                      className="action-btn"
                      onClick={handleCopySuccess}
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                    <button
                      className="action-btn"
                      onClick={handleDownload}
                      title="Download as text file"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
                <div className="output-content">
                  <pre className="output-text">{output}</pre>
                </div>
              </div>
            ) : (
              <div className="output-empty">
                <Sparkles size={40} className="empty-icon" />
                <p>Your generated MCQs will appear here</p>
                <p className="empty-hint">
                  Upload a file and click send to generate MCQs
                </p>
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
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>AI MCQ Generator - Powered by Advanced Language Models</p>
      </footer>

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        setSelectedProvider={setSelectedProvider}
        setSelectedModel={setSelectedModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </div>
  );
}

export default App;

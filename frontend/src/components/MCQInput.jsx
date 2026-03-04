import React from "react";
import { Send, FileText, Settings2 } from "lucide-react";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const MCQInput = ({
  prompt,
  setPrompt,
  mcqCount,
  setMcqCount,
  difficulty,
  setDifficulty,
  onGenerate,
  isGenerating,
  canGenerate,
  extractedText,
  selectedModel,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey && canGenerate && !isGenerating) {
      onGenerate();
    }
  };

  return (
    <div className="mcq-input-container">
      {/* Settings Row */}
      <div className="input-settings">
        <div className="setting-group">
          <label className="setting-label">
            <FileText size={14} />
            Number of MCQs
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={mcqCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val > 0) setMcqCount(Math.min(val, 500));
            }}
            className="setting-input"
            placeholder="Enter 1-500"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">
            <Settings2 size={14} />
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="setting-select"
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>
                {diff}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Input Area */}
      <div className="input-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            extractedText
              ? "Optional: Add custom instructions for MCQ generation..."
              : "Upload a PDF or image first to generate MCQs..."
          }
          className="main-input"
          rows={4}
          disabled={!extractedText || isGenerating}
        />

        <button
          className="send-btn"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          title={
            !extractedText
              ? "Upload and extract text first"
              : !selectedModel
                ? "Select a model first"
                : "Click to generate MCQs"
          }
        >
          {isGenerating ? (
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Helper Text */}
      <div className="input-helper">
        {extractedText ? (
          <span>
            Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to generate
          </span>
        ) : (
          <span>Upload a file first to enable MCQ generation</span>
        )}
      </div>
    </div>
  );
};

export default MCQInput;

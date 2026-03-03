import React from 'react'
import { Copy, Download, Clock, Cpu, Layers } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

const OutputDisplay = ({ output, isGenerating, metadata, onCopy, onDownload }) => {
  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output)
      onCopy?.()
    }
  }

  const handleDownload = () => {
    if (output) {
      onDownload?.()
    }
  }

  if (isGenerating) {
    return (
      <div className="output-display">
        <div className="output-generating">
          <LoadingSpinner size={32} text="Generating MCQs..." />
          <p className="generating-hint">
            This may take a few moments depending on the model and content length.
          </p>
        </div>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="output-display">
        <div className="output-empty">
          <p>Your generated MCQs will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="output-display">
      <div className="output-header">
        <div className="output-actions">
          <button className="action-btn" onClick={handleCopy} title="Copy to clipboard">
            <Copy size={18} />
            Copy
          </button>
          <button className="action-btn" onClick={handleDownload} title="Download as text file">
            <Download size={18} />
            Download
          </button>
        </div>
      </div>

      {metadata && (
        <div className="output-metadata">
          <div className="metadata-item">
            <Cpu size={14} />
            <span>Model: {metadata.model}</span>
          </div>
          <div className="metadata-item">
            <Layers size={14} />
            <span>Chunks: {metadata.chunksProcessed}</span>
          </div>
          <div className="metadata-item">
            <Clock size={14} />
            <span>Time: {metadata.timeTaken}s</span>
          </div>
        </div>
      )}

      <div className="output-content">
        <pre className="output-text">{output}</pre>
      </div>
    </div>
  )
}

export default OutputDisplay

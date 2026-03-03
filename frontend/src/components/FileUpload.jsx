import React, { useState, useRef } from 'react'
import { Plus, FileText, X, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpeg',
}

const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg'

const FileUpload = ({ files, setFiles, extractedText, isUploading, onUpload, error, disabled }) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    handleFiles(selectedFiles)
    e.target.value = ''
  }

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter((file) => {
      const isValidType = Object.keys(ACCEPTED_TYPES).includes(file.type)
      return isValidType
    })

    if (validFiles.length !== newFiles.length) {
      console.warn('Some files were rejected. Only PDF, PNG, JPG, JPEG are accepted.')
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles]
      setFiles(updatedFiles)
    }
  }

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
  }

  const handleAddClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleUploadClick = (e) => {
    e.stopPropagation()
    if (files.length > 0 && !isUploading && !extractedText && !disabled) {
      onUpload()
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // If text is already extracted, show a clean status
  if (extractedText) {
    return (
      <div className="file-upload-simple">
        <div className="upload-status success">
          <div className="status-icon">
            <CheckCircle size={20} />
          </div>
          <div className="status-info">
            <span className="status-label">Text extracted</span>
            <span className="status-detail">{extractedText.length.toLocaleString()} characters</span>
          </div>
          <button 
            className="change-btn"
            onClick={() => setFiles([])}
            title="Upload different files"
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  // If there are files pending upload
  if (files.length > 0) {
    return (
      <div className="file-upload-simple">
        <div className="file-list-compact">
          {files.map((file, index) => (
            <div key={index} className="file-item-compact">
              <div className="file-icon">
                <FileText size={16} />
              </div>
              <div className="file-details">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              <button
                className="remove-btn"
                onClick={() => removeFile(index)}
                disabled={isUploading || disabled}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <button
          className={`upload-btn-compact ${isUploading ? 'loading' : ''}`}
          onClick={handleUploadClick}
          disabled={isUploading || disabled}
        >
          {isUploading ? (
            <>
              <Loader size={16} className="spinning" />
              <span>Extracting...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Extract Text</span>
            </>
          )}
        </button>

        {error && (
          <div className="upload-error-inline">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Empty state - show + icon to add files
  return (
    <div className="file-upload-simple">
      <div
        className={`drop-zone-compact ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAddClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ACCEPTED_EXTENSIONS}
          multiple
          className="file-input"
          disabled={disabled}
        />
        
        <div className="drop-content">
          <div className="plus-icon">
            <Plus size={24} />
          </div>
          <span className="drop-text">Add PDF or Image</span>
        </div>
      </div>

      {error && (
        <div className="upload-error-inline">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default FileUpload

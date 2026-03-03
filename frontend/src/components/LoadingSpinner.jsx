import React from 'react'
import { Loader2 } from 'lucide-react'

const LoadingSpinner = ({ size = 24, text = '' }) => {
  return (
    <div className="loading-spinner">
      <Loader2 className="spinner-icon" size={size} />
      {text && <span className="spinner-text">{text}</span>}
    </div>
  )
}

export default LoadingSpinner

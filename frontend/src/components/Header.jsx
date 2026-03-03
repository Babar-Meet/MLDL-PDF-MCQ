import React from 'react'
import { BrainCircuit } from 'lucide-react'

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-icon">
          <BrainCircuit size={32} />
        </div>
        <div>
          <h1 className="header-title">AI MCQ Generator</h1>
          <p className="header-subtitle">Extract text from PDFs & Images, Generate MCQs</p>
        </div>
      </div>
    </header>
  )
}

export default Header

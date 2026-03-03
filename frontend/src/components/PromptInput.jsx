import React from 'react'
import { MessageSquare, ChevronDown } from 'lucide-react'

const MCQ_COUNTS = [5, 10, 15, 20]
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const PromptInput = ({ 
  prompt, 
  setPrompt, 
  mcqCount, 
  setMcqCount, 
  difficulty, 
  setDifficulty 
}) => {
  return (
    <div className="prompt-input">
      <label className="input-label">
        <MessageSquare size={18} />
        Prompt
      </label>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example: Generate 10 MCQs with 4 options each and correct answer."
        className="prompt-textarea"
        rows={6}
      />
      
      <div className="prompt-options">
        <div className="option-group">
          <label className="option-label">Number of MCQs</label>
          <div className="select-wrapper small">
            <select
              value={mcqCount}
              onChange={(e) => setMcqCount(Number(e.target.value))}
              className="option-select"
            >
              {MCQ_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <ChevronDown className="select-icon" size={16} />
          </div>
        </div>

        <div className="option-group">
          <label className="option-label">Difficulty</label>
          <div className="select-wrapper small">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="option-select"
            >
              {DIFFICULTIES.map((diff) => (
                <option key={diff} value={diff}>
                  {diff}
                </option>
              ))}
            </select>
            <ChevronDown className="select-icon" size={16} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptInput

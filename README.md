# AI MCQ Generator

A modern, user-friendly application to extract text from PDF files and images, then generate MCQ questions using AI models. Features a clean, Ollama-inspired interface.

## Features

- 📄 **PDF & Image Support** - Extract text from PDF files and images (PNG, JPG, JPEG)
- 🤖 **Multiple AI Providers** - Choose from various AI models:
  - **Ollama (Local)** - Run AI models locally on your computer
  - **OpenAI** - GPT-4, GPT-4o, GPT-3.5 Turbo
  - **Claude (Anthropic)** - Claude 3 Opus, Sonnet, Haiku
  - **Google Gemini** - Gemini Pro, Gemini Flash
  - **OpenRouter** - Access 100+ AI models
- 🎯 **Easy Model Selection** - Separate tab to browse and select AI models
- ⚙️ **Customizable MCQs** - Set number of questions and difficulty level
- 📥 **Export Options** - Copy to clipboard or download as text file

## Quick Start

### Prerequisites

1. **Python 3.8+** - Required for the backend
2. **Node.js 18+** - Required for the frontend
3. **Ollama (Optional)** - For running local AI models

### Installation

#### Option 1: Automated Setup (Recommended)

Simply run:
```bash
RUN.bat
```

This will:
1. Activate the conda environment
2. Start the backend server (port 8000)
3. Start the frontend development server (port 5173)
4. Open your browser automatically

#### Option 2: Manual Setup

1. **Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

3. **Open Browser:**
Navigate to `http://localhost:5173`

## Usage Guide

### Step 1: Select an AI Model

1. Click on the **model selector** button in the top bar
2. A modal will open showing available AI providers:
   - **Local (Ollama)** - No API key needed, runs offline
   - **API Providers** - Require an API key (OpenAI, Claude, Gemini, etc.)
3. For **Ollama**, make sure it's installed and running on your system
4. For **API providers**, enter your API key when prompted
5. Select your preferred model from the list
6. Click **Save & Continue**

### Step 2: Upload Files

1. Click the **+ Add PDF or Image** button
2. Select one or more files (PDF, PNG, JPG, JPEG)
3. Click **Extract Text** to process the files

### Step 3: Generate MCQs

1. Enter any additional instructions (optional)
2. Set the **number of MCQs** (5-30)
3. Set the **difficulty** (Easy, Medium, Hard)
4. Click the **send button** or press **Ctrl + Enter**

### Step 4: View & Export Results

- **Copy** - Click to copy MCQs to clipboard
- **Download** - Save as a text file

## Setting Up Ollama (Local Models)

1. Download Ollama from: https://ollama.com/download
2. Install and run Ollama
3. Pull your desired model:
```bash
ollama pull llama2
ollama pull mistral
ollama pull phi
```
4. The app will automatically detect installed models

## API Keys

### OpenAI
- Get your API key from: https://platform.openai.com/api-keys

### Claude (Anthropic)
- Get your API key from: https://console.anthropic.com/

### Google Gemini
- Get your API key from: https://aistudio.google.com/app/apikey

### OpenRouter
- Get your API key from: https://openrouter.ai/settings

## Project Structure

```
MLDL PDF MCQ/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── routers/
│   │   ├── generate.py       # MCQ generation endpoints
│   │   └── models.py         # Model listing endpoints
│   ├── services/
│   │   ├── extractor.py      # Text extraction from PDF/images
│   │   ├── chunker.py        # Text chunking for long documents
│   │   └── llm_router.py     # AI model routing
│   └── utils/
│       └── helpers.py        # Utility functions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModelSelectorModal.jsx  # Model selection modal
│   │   │   ├── FileUpload.jsx          # File upload component
│   │   │   ├── MCQInput.jsx            # MCQ input with settings
│   │   │   └── OutputDisplay.jsx       # Output display
│   │   ├── services/
│   │   │   └── api.js       # API client
│   │   ├── App.jsx          # Main application
│   │   └── App.css          # Application styles
│   └── package.json
├── RUN.bat                  # Quick start script
├── SETUP.bat                # Setup script
└── README.md
```

## Troubleshooting

### Backend won't start
- Make sure port 8000 is not in use
- Check Python and pip are properly installed

### Ollama models not showing
- Make sure Ollama is running (`ollama serve`)
- Try clicking "Test" button in the model selector

### PDF extraction fails
- Ensure the PDF is not password protected
- Try with a different PDF file

### API errors
- Verify your API key is correct
- Check your API quota/credits

## License

MIT License

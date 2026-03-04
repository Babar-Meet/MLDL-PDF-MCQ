# AI-Powered MCQ Generator

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Stack-MERN-orange?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

> **⚡ Real-time AI-powered quiz and assessment generator with streaming responses**

An intelligent, accessible platform for generating high-quality MCQ (Multiple Choice Question) assessments from PDF documents and text content using advanced AI models. Features a modern ChatGPT-inspired interface with live streaming responses.

---

## 📋 Table of Contents

- [Vision & Mission](#vision--mission)
- [Features](#features)
- [Two-Tier User System](#two-tier-user-system)
- [Technical Architecture](#technical-architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Admin Panel](#admin-panel)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🌟 Vision & Mission

### Project Vision

Build an **intelligent quiz and assessment generator** that operates in real-time, similar to ChatGPT's streaming responses. The platform empowers educators, students, and content creators to instantly generate high-quality multiple-choice questions from any study material.

### Mission Statement

**To democratize quality education through AI technology** — making assessment creation accessible, efficient, and affordable for educators worldwide. We believe that:

- 📚 **Quality education** should be accessible to everyone
- 🤖 **AI technology** can reduce the burden on educators
- ⚡ **Real-time generation** enables instant feedback and learning
- 🔒 **Data privacy** is fundamental to our platform

---

## 🚀 Features

### Core Features

| Feature | Description |
|---------|-------------|
| **PDF Text Extraction** | Extract text from PDF files and images |
| **AI-Powered Generation** | Generate MCQs using various AI models |
| **Real-time Streaming** | Live response display as AI generates content |
| **Three Difficulty Levels** | Easy, Medium, and Hard questions |
| **Multiple AI Providers** | Ollama, OpenAI, Claude, Gemini, OpenRouter, HuggingFace |
| **User Authentication** | Secure JWT-based authentication |
| **Role-Based Access** | Admin, Paid, and Free user tiers |

### Supported AI Providers (only that are added by admin)

- **Ollama (Local)** — Run AI models locally on your machine
- **OpenAI** — GPT-4, GPT-4o, GPT-3.5 Turbo
- **Claude (Anthropic)** — Claude 3 Opus, Sonnet, Haiku
- **Google Gemini** — Gemini Pro, Gemini Flash
- **OpenRouter** — Access 100+ AI models
- **HuggingFace** — Open source LLMs

---

## 👥 Two-Tier User System

### Free Users

| Capability | Limit |
|------------|-------|
| MCQ Generation | 10 questions/month (configurable) |
| Model Access | Limited to free models only |
| File Uploads | Supported |
| Export Options | Copy & Download |

### Paid Users

| Capability | Limit |
|------------|-------|
| MCQ Generation | Unlimited |
| Model Access | All models including premium |
| File Uploads | Supported |
| Export Options | All features |
| Priority Support | Yes |

### User Roles

```
┌─────────────────────────────────────────────────────────────┐
│                      User Roles                              │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   ADMIN     │    PAID     │    FREE     │                  │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│ Full Access │ Unlimited   │ 10 MCQs/mo  │                  │
│ User Mgmt   │ All Models  │ Free Models │                  │
│ Model Config│ Priority    │ Basic        │                  │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

---

## 🏗️ Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI-Powered MCQ Generator                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Frontend   │───▶│   Backend    │───▶│  Database    │              │
│  │   (React)    │◀───│  (Express)   │◀───│  (MongoDB)   │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                    │                                            │
│         │                    ▼                                            │
│         │           ┌──────────────┐                                      │
│         │           │   AI Models  │                                      │
│         │           ├──────────────┤                                      │
│         │           │   Ollama     │ (Local - Instant)                   │
│         │           │   OpenAI     │                                      │
│         │           │   Claude     │ (External API)                       │
│         │           │   Gemini     │                                      │
│         │           │   OpenRouter │                                      │
│         │           │   HuggingFace│                                      │
│         │           └──────────────┘                                      │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                        │
│  │    Browser   │  ──▶ Streaming Responses (Server-Sent Events)          │
│  └──────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Local AI Execution (Ollama)**
   - Models run locally for instant, offline-capable responses
   - No API costs for local models
   - Privacy-preserving (data stays on machine)

2. **External API Integration**
   - On-demand calls to OpenAI, Claude, Gemini, etc.
   - Fallback to external providers when local models unavailable
   - Centralized API key management via Admin Panel

3. **Real-time Streaming**
   - Server-Sent Events (SSE) for live response display
   - ChatGPT-like user experience
   - Progressive content rendering

4. **MongoDB Database**
   - User management and authentication
   - Model configurations storage
   - Quota tracking for free users

---

## 🏁 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Backend runtime |
| npm | 9+ | Package management |
| MongoDB | 6.0+ | Database |
| Ollama | Latest | Local AI models (optional) |

### Quick Start (Windows)

```bash
# Run the automated setup
RUN.bat
```

This script will:
1. Install backend dependencies
2. Install frontend dependencies
3. Start the backend server (port 8001)
4. Start the frontend dev server (port 5173)
5. Open browser at http://localhost:5173

### Manual Setup

#### 1. Backend Setup

```bash
cd backend
npm install
npm start
```

The backend runs on `http://localhost:8001`

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`

#### 3. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=8001
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/mcq-generator

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional: Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
```

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | babarmeetadmin@gmail.com | babarmeetadmin@pass |
| Free | babarmeetfree@gmail.com | BabarMeet123 |
| Paid | babarmeetpaid@gmail.com | BabarMeet123 |

> ⚠️ **Important**: Change these credentials in production!

---

## 📂 Project Structure

```
MLDL PDF MCQ/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT authentication
│   │   ├── models/
│   │   │   ├── User.js              # User schema
│   │   │   └── ModelConfig.js       # AI model configuration
│   │   ├── routes/
│   │   │   ├── users.js             # User auth routes
│   │   │   ├── generate.js          # MCQ generation routes
│   │   │   └── modelConfigs.js      # Model management routes
│   │   ├── init.js                  # Default data initialization
│   │   └── index.js                # Express app entry
│   ├── package.json
│   └── .env                        # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx      # PDF upload component
│   │   │   ├── Header.jsx           # App header
│   │   │   ├── ModelForm.jsx       # Model config form
│   │   │   └── UserList.jsx        # User management
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Main MCQ generation page
│   │   │   ├── Login.jsx           # User login
│   │   │   ├── Register.jsx        # User registration
│   │   │   ├── Profile.jsx         # User profile
│   │   │   ├── Upgrade.jsx         # Upgrade to paid
│   │   │   └── AdminDashboard.jsx  # Admin panel
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── store/
│   │   │   ├── authSlice.js        # Auth state management
│   │   │   ├── mcqSlice.js         # MCQ state management
│   │   │   └── modelsSlice.js      # Models state
│   │   ├── App.jsx                 # Main app component
│   │   ├── App.css                 # Global styles
│   │   └── main.jsx                # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── RUN.bat                         # Quick start script
├── SETUP.bat                      # Setup script
├── README.md                       # This file
└── .gitignore
```

---

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update user profile |
| DELETE | `/api/auth/me` | Delete account |

### Model Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | Get all active models |
| POST | `/api/models` | Create model (admin) |
| GET | `/api/models/:id` | Get model by ID |
| PUT | `/api/models/:id` | Update model (admin) |
| DELETE | `/api/models/:id` | Delete model (admin) |
| POST | `/api/models/config/api-key` | Save API key (admin) |

### MCQ Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/generate/models` | Get available models for user |
| GET | `/api/generate/quota` | Get user quota info |
| POST | `/api/generate` | Generate MCQs |
| POST | `/api/generate/upload` | Upload and extract text |
| POST | `/api/generate/chunk` | Chunk text for processing |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/users` | Get all users (admin) |
| PUT | `/api/auth/users/:id/role` | Update user role |
| GET | `/api/models/admin` | Get all models (admin) |

---

## ⚙️ Admin Panel

### Access

Navigate to `/admin` after logging in with an admin account.

### Features

#### 1. Model Management

- Add new AI model configurations
- Edit existing models
- Toggle model active/inactive status
- Set access permissions (Free/Paid/Admin)
- Configure API keys per provider

#### 2. User Management

- View all registered users
- Change user roles (Free → Paid → Admin)
- Monitor user activity
- Manage quotas

#### 3. API Key Management

Configure API keys for external providers:

| Provider | Models | Getting API Key |
|----------|--------|-----------------|
| OpenAI | GPT-4, GPT-3.5 | platform.openai.com/api-keys |
| Claude | Claude 3 | console.anthropic.com/ |
| Gemini | Gemini Pro | aistudio.google.com/app/apikey |
| OpenRouter | 100+ models | openrouter.ai/settings |

---

## 🔧 Configuration

### Setting Up Ollama (Local Models)

1. Download Ollama from: https://ollama.com/download
2. Install and run: `ollama serve`
3. Pull desired models:

```bash
ollama pull llama2
ollama pull mistral
ollama pull phi
ollama pull deepseek-r1:1.5b
ollama pull deepseek-r1:8b
```

4. The app will automatically detect installed models

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 8001 | Server port |
| MONGO_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| NODE_ENV | No | development | Environment mode |

---

## 🔍 Troubleshooting

### Backend Issues

```bash
# Port already in use
# Solution: Change PORT in .env or kill the process

# MongoDB connection failed
# Solution: Ensure MongoDB is running locally or check MONGO_URI
```

### Ollama Issues

```bash
# Models not showing
# Solution: Run 'ollama serve' in terminal first

# Connection refused
# Solution: Check Ollama is running on http://localhost:11434
```

### Frontend Issues

```bash
# Build errors
# Solution: Delete node_modules and reinstall

# API connection errors
# Solution: Ensure backend is running on port 8001
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Email: babarmeetadmin@gmail.com

---

<p align="center">
  Made with ❤️ for education
</p>

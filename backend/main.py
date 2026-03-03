"""
FastAPI application entry point for the AI-Powered MCQ Generator backend.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting MCQ Generator Backend...")
    
    # Create temp directory if it doesn't exist
    os.makedirs("temp_uploads", exist_ok=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down MCQ Generator Backend...")


# Create FastAPI application
app = FastAPI(
    title="AI-Powered MCQ Generator",
    description="Backend API for generating MCQs from PDF and image files using AI models",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "detail": str(exc) if os.getenv("DEBUG") else None
        }
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handler for ValueError exceptions."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation Error",
            "message": str(exc)
        }
    )


# Include routers
from routers import models, generate

app.include_router(models.router, prefix="/api")
app.include_router(generate.router, prefix="/api")


# Root endpoints
@app.get("/")
async def root():
    """
    Root endpoint.
    """
    return {
        "name": "AI-Powered MCQ Generator",
        "version": "1.0.0",
        "description": "Backend API for generating MCQs from PDF and image files",
        "docs": "/api/docs",
        "redoc": "/api/redoc",
        "openapi": "/api/openapi.json"
    }


@app.get("/health")
async def health():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "MCQ Generator Backend",
        "version": "1.0.0"
    }


# App info endpoint
@app.get("/api/info")
async def api_info():
    """
    API information endpoint.
    """
    return {
        "name": "AI-Powered MCQ Generator API",
        "version": "1.0.0",
        "endpoints": {
            "generate": {
                "POST /api/generate": "Generate MCQs from uploaded files",
                "POST /api/generate/upload": "Upload files and extract text",
                "POST /api/generate/chunk": "Chunk text into smaller pieces",
                "POST /api/generate/stream": "Generate MCQs with streaming response",
                "GET /api/generate/health": "Health check"
            },
            "models": {
                "GET /api/models": "Get all providers and their models",
                "GET /api/models/{provider}": "Get models for a specific provider",
                "GET /api/models/local/detailed": "Get detailed local Ollama models",
                "GET /api/models/validate/{provider}": "Validate if a model is available",
                "GET /api/models/info/providers": "Get provider information"
            }
        }
    }


# Development server entry point
if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

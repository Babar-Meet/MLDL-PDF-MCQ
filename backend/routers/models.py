"""
Router for model information and selection endpoints.
"""

import logging
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field

from services.llm_router import LLMRouter, OllamaClient
from utils.helpers import get_provider_models, validate_provider, load_config, save_config, get_provider_api_key, get_last_used

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["models"])


# Request/Response Models
class ProviderModelsResponse(BaseModel):
    """Response model for provider models."""
    provider: str
    models: List[str]
    status: str = "success"


class AllProvidersResponse(BaseModel):
    """Response model for all providers."""
    providers: Dict[str, List[str]]
    status: str = "success"


class LocalModelsDetail(BaseModel):
    """Detailed model information for local models."""
    name: str
    model: str
    size: int
    modified_at: str


class LocalModelsResponse(BaseModel):
    """Response for local Ollama models with details."""
    provider: str = "local"
    models: List[LocalModelsDetail]
    count: int
    status: str = "success"


# Endpoints
@router.get("/", response_model=AllProvidersResponse)
async def get_all_providers():
    """
    Get all available providers and their models.
    
    Returns:
        Dictionary mapping provider names to their model lists
    """
    providers = {
        "local": get_provider_models("local"),
        "openrouter": get_provider_models("openrouter"),
        "huggingface": get_provider_models("huggingface"),
        "openai": get_provider_models("openai"),
        "gemini": get_provider_models("gemini"),
        "claude": get_provider_models("claude")
    }
    
    # For local, try to get actual models from Ollama
    try:
        local_models = OllamaClient.list_models()
        if local_models:
            providers["local"] = [m["name"] for m in local_models]
    except Exception as e:
        logger.warning(f"Could not fetch local models: {str(e)}")
    
    return AllProvidersResponse(providers=providers)


@router.get("/{provider}", response_model=ProviderModelsResponse)
async def get_provider_models_endpoint(
    provider: str = Path(..., description="The AI provider (local, openrouter, huggingface, openai, gemini, claude)")
):
    """
    Get available models for a specific provider.
    
    Args:
        provider: The AI provider name
        
    Returns:
        List of available models for the provider
    """
    provider = provider.lower()
    
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Supported: local, openrouter, huggingface, openai, gemini, claude"
        )
    
    # Get base models from helper
    models = get_provider_models(provider)
    
    # For local provider, try to get actual Ollama models
    if provider == "local":
        try:
            ollama_models = OllamaClient.list_models()
            if ollama_models:
                models = [m["name"] for m in ollama_models]
        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {str(e)}")
            # Return default models if Ollama is not available
    
    return ProviderModelsResponse(
        provider=provider,
        models=models
    )


@router.get("/local/detailed", response_model=LocalModelsResponse)
async def get_local_models_detailed():
    """
    Get detailed information about local Ollama models.
    
    Returns:
        Detailed information about each installed Ollama model
    """
    try:
        models = OllamaClient.list_models()
        
        return LocalModelsResponse(
            provider="local",
            models=[
                LocalModelsDetail(
                    name=m.get("name", ""),
                    model=m.get("name", ""),
                    size=m.get("size", 0),
                    modified_at=m.get("modified_at", "")
                )
                for m in models
            ],
            count=len(models)
        )
    except Exception as e:
        logger.error(f"Failed to get local models: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Ollama. Make sure Ollama is running. Error: {str(e)}"
        )


@router.get("/validate/{provider}")
async def validate_provider_model(
    provider: str = Path(..., description="The AI provider"),
    model: str = Query(..., description="The model name to validate")
):
    """
    Validate if a model name is valid for a provider.
    
    Note: This endpoint now accepts ANY model name the user provides.
    The model is not validated against a predefined list, allowing users
    to use custom or newly released models.
    
    Args:
        provider: The AI provider name
        model: The model name (can be any valid model identifier)
        
    Returns:
        Validation result - always returns available=True for custom models
    """
    provider = provider.lower()
    
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )
    
    # Get available models for reference
    if provider == "local":
        try:
            available_models = [m["name"] for m in OllamaClient.list_models()]
        except Exception:
            available_models = get_provider_models(provider)
    else:
        available_models = get_provider_models(provider)
    
    # Accept any model name the user provides
    # This allows users to use custom model names (free/paid models from OpenRouter, etc.)
    return {
        "provider": provider,
        "model": model,
        "available": True,
        "available_models": available_models,
        "message": "Model accepted. You can use any valid model name for this provider."
    }


# Provider info endpoint
class ProviderInfo(BaseModel):
    """Information about a provider."""
    name: str
    display_name: str
    requires_api_key: bool
    supports_streaming: bool
    description: str


@router.get("/info/providers", response_model=List[ProviderInfo])
async def get_providers_info():
    """
    Get information about all supported providers.
    
    Returns:
        List of provider information
    """
    providers_info = [
        ProviderInfo(
            name="local",
            display_name="Ollama (Local)",
            requires_api_key=False,
            supports_streaming=True,
            description="Run models locally using Ollama. Requires Ollama to be installed and running."
        ),
        ProviderInfo(
            name="openrouter",
            display_name="OpenRouter",
            requires_api_key=True,
            supports_streaming=True,
            description="Access multiple AI models through OpenRouter API. Supports various providers."
        ),
        ProviderInfo(
            name="huggingface",
            display_name="HuggingFace",
            requires_api_key=True,
            supports_streaming=False,
            description="Access models hosted on HuggingFace Inference API."
        ),
        ProviderInfo(
            name="openai",
            display_name="OpenAI",
            requires_api_key=True,
            supports_streaming=True,
            description="Access GPT models through OpenAI API."
        ),
        ProviderInfo(
            name="gemini",
            display_name="Google Gemini",
            requires_api_key=True,
            supports_streaming=False,
            description="Access Google's Gemini models."
        ),
        ProviderInfo(
            name="claude",
            display_name="Anthropic Claude",
            requires_api_key=True,
            supports_streaming=False,
            description="Access Claude models through Anthropic API."
        )
    ]
    
    return providers_info


# Config endpoints
class SaveApiKeyRequest(BaseModel):
    """Request to save API key."""
    provider: str
    api_key: str


class SaveLastUsedRequest(BaseModel):
    """Request to save last used provider and model."""
    provider: str
    model: str


class ConfigResponse(BaseModel):
    """Response for config operations."""
    status: str
    message: str


class ApiKeyResponse(BaseModel):
    """Response for API key retrieval."""
    provider: str
    api_key: str = ""
    has_key: bool


class LastUsedResponse(BaseModel):
    """Response for last used settings."""
    provider: str = ""
    model: str = ""


@router.post("/config/api-key", response_model=ConfigResponse)
async def save_api_key(request: SaveApiKeyRequest):
    """
    Save API key for a provider.
    
    Args:
        provider: The AI provider name
        api_key: The API key to save
        
    Returns:
        Success message
    """
    provider = request.provider.lower()
    
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )
    
    config = load_config()
    
    if "providers" not in config:
        config["providers"] = {}
    
    if provider not in config["providers"]:
        config["providers"][provider] = {"api_key": "", "models": []}
    
    config["providers"][provider]["api_key"] = request.api_key
    save_config(config)
    
    return ConfigResponse(
        status="success",
        message=f"API key saved for {provider}"
    )


@router.get("/config/api-key/{provider}", response_model=ApiKeyResponse)
async def get_api_key(provider: str):
    """
    Get API key for a provider.
    
    Args:
        provider: The AI provider name
        
    Returns:
        API key (masked) for the provider
    """
    provider = provider.lower()
    
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )
    
    api_key = get_provider_api_key(provider)
    
    return ApiKeyResponse(
        provider=provider,
        api_key=api_key,
        has_key=bool(api_key)
    )


@router.post("/config/last-used", response_model=ConfigResponse)
async def save_last_used(request: SaveLastUsedRequest):
    """
    Save last used provider and model.
    
    Args:
        provider: The AI provider name
        model: The model name
        
    Returns:
        Success message
    """
    provider = request.provider.lower()
    
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider: {provider}"
        )
    
    config = load_config()
    config["last_used"] = {
        "provider": provider,
        "model": request.model
    }
    save_config(config)
    
    return ConfigResponse(
        status="success",
        message=f"Last used settings saved: {provider} / {request.model}"
    )


@router.get("/config/last-used", response_model=LastUsedResponse)
async def get_last_used_endpoint():
    """
    Get last used provider and model.
    
    Returns:
        Last used provider and model
    """
    last_used = get_last_used()
    
    return LastUsedResponse(
        provider=last_used.get("provider", ""),
        model=last_used.get("model", "")
    )

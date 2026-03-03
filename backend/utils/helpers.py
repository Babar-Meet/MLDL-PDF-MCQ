"""
Utility functions for the MCQ Generator backend.
"""

import os
import json
import uuid
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path


# Load config from config.json
CONFIG_FILE = Path(__file__).parent.parent / "config.json"


def load_config() -> Dict[str, Any]:
    """
    Load configuration from config.json file.
    
    Returns:
        Dictionary containing configuration
    """
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"providers": {}, "last_used": {}}


def save_config(config: Dict[str, Any]) -> None:
    """
    Save configuration to config.json file.
    
    Args:
        config: Configuration dictionary to save
    """
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
    except Exception:
        pass


def get_provider_api_key(provider: str) -> Optional[str]:
    """
    Get API key for a provider from config.
    
    Args:
        provider: The AI provider name
        
    Returns:
        API key if found in config, None otherwise
    """
    config = load_config()
    return config.get("providers", {}).get(provider, {}).get("api_key", "")


def get_provider_models_from_config(provider: str) -> List[str]:
    """
    Get model list for a provider from config.
    
    Args:
        provider: The AI provider name
        
    Returns:
        List of model names from config, or empty list
    """
    config = load_config()
    return config.get("providers", {}).get(provider, {}).get("models", [])


def get_last_used() -> Dict[str, str]:
    """
    Get last used provider and model from config.
    
    Returns:
        Dictionary with provider and model keys
    """
    config = load_config()
    return config.get("last_used", {})


def generate_unique_filename(original_filename: str) -> str:
    """
    Generate a unique filename to prevent conflicts.
    
    Args:
        original_filename: The original name of the uploaded file
        
    Returns:
        A unique filename with timestamp and UUID prefix
    """
    ext = Path(original_filename).suffix.lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}{ext}"


def sanitize_api_key(api_key: Optional[str]) -> Optional[str]:
    """
    Sanitize API key for logging (returns masked version).
    
    Args:
        api_key: The API key to sanitize
        
    Returns:
        Masked API key (first 4 and last 4 characters visible)
    """
    if not api_key:
        return None
    
    if len(api_key) <= 8:
        return "****"
    
    return f"{api_key[:4]}...{api_key[-4:]}"


def get_file_extension(filename: str) -> str:
    """
    Get the lowercase file extension from a filename.
    
    Args:
        filename: The name of the file
        
    Returns:
        The lowercase file extension without the dot
    """
    return Path(filename).suffix.lower().lstrip(".")


def is_pdf_file(filename: str) -> bool:
    """
    Check if the file is a PDF.
    
    Args:
        filename: The name of the file
        
    Returns:
        True if the file is a PDF, False otherwise
    """
    ext = get_file_extension(filename)
    return ext == "pdf"


def is_image_file(filename: str) -> bool:
    """
    Check if the file is an image that can be processed for OCR.
    
    Args:
        filename: The name of the file
        
    Returns:
        True if the file is an image, False otherwise
    """
    ext = get_file_extension(filename)
    return ext in ["jpg", "jpeg", "png", "bmp", "tiff", "tif", "gif", "webp"]


def is_supported_file(filename: str) -> bool:
    """
    Check if the file is supported for text extraction.
    
    Args:
        filename: The name of the file
        
    Returns:
        True if the file is supported, False otherwise
    """
    return is_pdf_file(filename) or is_image_file(filename)


def create_temp_directory(base_dir: str = "temp_uploads") -> Path:
    """
    Create a temporary directory for file uploads.
    
    Args:
        base_dir: The base directory name
        
    Returns:
        Path to the created directory
    """
    temp_dir = Path(base_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir


def cleanup_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files after processing.
    
    Args:
        file_paths: List of file paths to delete
    """
    for file_path in file_paths:
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                path.unlink()
        except Exception:
            # Silently ignore cleanup errors
            pass


def format_error_response(error: Exception, status_code: int = 500) -> Dict[str, Any]:
    """
    Format a standardized error response.
    
    Args:
        error: The exception that occurred
        status_code: HTTP status code
        
    Returns:
        A dictionary with error details
    """
    error_type = type(error).__name__
    error_message = str(error)
    
    return {
        "error": error_type,
        "message": error_message,
        "status_code": status_code
    }


def format_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """
    Format a standardized success response.
    
    Args:
        data: The data to return
        message: Optional success message
        
    Returns:
        A dictionary with success details
    """
    return {
        "message": message,
        "data": data,
        "status_code": 200
    }


def calculate_text_stats(text: str) -> Dict[str, int]:
    """
    Calculate statistics for text content.
    
    Args:
        text: The text to analyze
        
    Returns:
        Dictionary with word count, character count, etc.
    """
    words = text.split()
    return {
        "word_count": len(words),
        "char_count": len(text),
        "char_count_no_spaces": len(text.replace(" ", "")),
        "line_count": len(text.splitlines()),
        "paragraph_count": len([p for p in text.split("\n\n") if p.strip()])
    }


def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mask sensitive data in a dictionary for logging.
    
    Args:
        data: The dictionary containing potentially sensitive data
        
    Returns:
        Dictionary with sensitive values masked
    """
    sensitive_keys = ["api_key", "api-key", "password", "secret", "token", "key"]
    masked_data = data.copy()
    
    for key in masked_data:
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            if isinstance(masked_data[key], str) and masked_data[key]:
                masked_data[key] = "****"
    
    return masked_data


def get_provider_models(provider: str) -> List[str]:
    """
    Get the list of available models for a given provider.
    
    First checks config.json, then falls back to default models.
    
    Args:
        provider: The AI provider name (local, openrouter, huggingface, openai, gemini, claude)
        
    Returns:
        List of model names
    """
    # First try to get models from config
    config_models = get_provider_models_from_config(provider)
    if config_models:
        return config_models
    
    # Fallback to default models
    provider_models = {
        "local": ["llama2", "llama3", "llama3.1", "llama3.2", "mistral", "mixtral", "phi", "phi3", "codellama", "gemma", "gemma2", "qwen", "qwen2", "llava", "moondream", "near", ".command-r", "command-r7b", "deepseek-coder-v2", "deepseek-llm", "bunny-llama", "dolphin-mixtral", "falcon2", "jamba-v1", "marin-pt", "meditarm", "megadoc", "minimax-m2.1", "minimax-m2.2", "nemotron", "nitral", "olmo", "openchat", "orca2", "phi4", "phind-codellama", "pixtral", "pretrain", "pythia", "qwen2.5-coder", "qwen2.5-math", "samantha-mistral", "smollm", "spark", "stablelm2", "steel", "strider", "synthia", "tiyun", "vip", "wizardlm2", "wizardmath", "xwinlm", "zephyr"],
        "openrouter": [
            "openai/gpt-3.5-turbo",
            "openai/gpt-4-turbo-preview",
            "openai/gpt-4",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "anthropic/claude-3-opus",
            "anthropic/claude-3-sonnet",
            "anthropic/claude-3-haiku",
            "anthropic/claude-3.5-sonnet",
            "google/gemini-pro",
            "google/gemini-pro-vision",
            "google/gemini-1.5-pro",
            "google/gemini-1.5-flash",
            "google/gemini-1.5-flash-8b",
            "meta-llama/llama-3-70b-instruct",
            "meta-llama/llama-3-8b-instruct",
            "meta-llama/llama-3.1-70b-instruct",
            "meta-llama/llama-3.1-8b-instruct",
            "mistralai/mistral-7b-instruct",
            "mistralai/mixtral-8x7b-instruct",
            "cognitivecomputations/dolphin-mixtral-8x7b",
            "togethercomputer/llama-2-70b",
            "undi95/topp-a-llama-2-70b",
            "WizardLM/WizardLM-70B",
            "01-ai/yi-34b",
            "01-ai/yi-6b",
            "nvidia/llama-3.1-nemotron-70b-instruct",
            "deepseek/deepseek-chat",
            "deepseek/deepseek-coder",
            "qwen/qwen-2-72b",
            "qwen/qwen-2-7b",
            "minimax/minimax-chat",
            "minimax/minimax-coder"
        ],
        "huggingface": [
            "meta-llama/Llama-2-7b-hf",
            "meta-llama/Llama-2-13b-hf",
            "meta-llama/Llama-2-70b-hf",
            "meta-llama/Llama-3-8b",
            "meta-llama/Llama-3-70b",
            "mistralai/Mistral-7B-v0.1",
            "mistralai/Mistral-7B-Instruct-v0.2",
            "mistralai/Mixtral-8x7B-v0.1",
            "bigcode/starcoder2-15b",
            "bigcode/starcoder2-7b",
            "bigcode/starcoder2-3b",
            "microsoft/phi-2",
            "microsoft/phi-3-mini-128k",
            "microsoft/Phi-3.5-mini-instruct",
            "google/gemma-2b",
            "google/gemma-7b",
            "Qwen/Qwen2-72B",
            "Qwen/Qwen2-7B",
            "Qwen/Qwen2-1.8B",
            "deepseek-ai/deepseek-coder-33b-instruct",
            "deepseek-ai/deepseek-llm-67b-base",
            "tiiuae/falcon-7b",
            "tiiuae/falcon-40b",
            "EleutherAI/gpt-neo-2.7B",
            "EleutherAI/gpt-j-6b",
            "EleutherAI/pythia-12b",
            "codellama/CodeLlama-34b-Instruct",
            "codellama/CodeLlama-13b-Instruct",
            "codellama/CodeLlama-7b-Instruct"
        ],
        "openai": [
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-0125",
            "gpt-4-turbo",
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-4-0613",
            "gpt-4o",
            "gpt-4o-2024-05-13",
            "gpt-4o-mini",
            "gpt-4o-mini-2024-07-18",
            "o1-preview",
            "o1-mini",
            "o1",
            "o3-mini",
            "gpt-4-1106-preview"
        ],
        "gemini": [
            "gemini-pro",
            "gemini-pro-vision",
            "gemini-1.5-pro",
            "gemini-1.5-pro-002",
            "gemini-1.5-flash",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-8b",
            "gemini-1.5-flash-8b-001",
            "gemini-2.0-flash-exp",
            "gemini-exp-1206"
        ],
        "claude": [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-3.5-sonnet-20241022",
            "claude-3.5-sonnet-20240620",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2",
            "claude-instant-1",
            "claude-3-opus",
            "claude-3-sonnet",
            "claude-3-haiku"
        ]
    }
    
    return provider_models.get(provider.lower(), [])


def validate_provider(provider: str) -> bool:
    """
    Validate if the provider is supported.
    
    Args:
        provider: The AI provider name
        
    Returns:
        True if provider is valid, False otherwise
    """
    valid_providers = ["local", "openrouter", "huggingface", "openai", "gemini", "claude"]
    return provider.lower() in valid_providers

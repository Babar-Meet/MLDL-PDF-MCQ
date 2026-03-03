"""
AI Model Router service.
Handles routing to different AI model providers:
- Local (Ollama)
- OpenRouter
- HuggingFace
- OpenAI
- Gemini
- Claude (Anthropic)
"""

import json
import logging
import asyncio
from typing import Optional, Dict, Any, List, AsyncGenerator
from abc import ABC, abstractmethod

import requests

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Custom exception for LLM errors."""
    pass


class BaseLLMClient(ABC):
    """Base class for LLM clients."""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        model: str,
        **kwargs
    ) -> str:
        """Generate a response from the model."""
        pass
    
    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from the model."""
        pass


class OllamaClient(BaseLLMClient):
    """Client for local Ollama models."""
    
    DEFAULT_BASE_URL = "http://localhost:11434"
    
    def __init__(self, base_url: str = DEFAULT_BASE_URL):
        self.base_url = base_url
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate response using Ollama."""
        import ollama
        
        try:
            # Build options - Ollama uses 'options' for advanced parameters
            options = {
                "temperature": temperature,
            }
            
            # Add any additional options from kwargs
            for key, value in kwargs.items():
                if key not in ['stream', 'model', 'prompt']:
                    options[key] = value
            
            response = ollama.generate(
                model=model,
                prompt=prompt,
                options=options
            )
            return response.get("response", "")
        except Exception as e:
            raise LLMError(f"Ollama generation failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using Ollama."""
        import ollama
        
        try:
            options = {"temperature": temperature}
            response = await asyncio.to_thread(
                ollama.generate,
                model=model,
                prompt=prompt,
                options=options,
                stream=True
            )
            
            for chunk in response:
                if "response" in chunk:
                    yield chunk["response"]
        except Exception as e:
            raise LLMError(f"Ollama streaming failed: {str(e)}")
    
    @staticmethod
    def list_models() -> List[Dict[str, Any]]:
        """List available Ollama models."""
        try:
            import ollama
            models = ollama.list()
            return [
                {
                    "name": m.get("name", ""),
                    "model": m.get("name", ""),
                    "size": m.get("size", 0),
                    "modified_at": m.get("modified_at", "")
                }
                for m in models.get("models", [])
            ]
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            return []


class OpenRouterClient(BaseLLMClient):
    """Client for OpenRouter API."""
    
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mcq-generator.local",
            "X-Title": "MCQ Generator"
        }
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate response using OpenRouter."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        
        # Add any extra params
        for key, value in kwargs.items():
            if key not in ['stream']:
                payload[key] = value
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                timeout=None  # No timeout - let user's PC be the limit
            )
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            raise LLMError(f"OpenRouter request failed: {str(e)}")
        except (KeyError, IndexError) as e:
            raise LLMError(f"OpenRouter response parsing failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using OpenRouter."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": True,
        }
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                stream=True,
                timeout=None
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    line = line.decode("utf-8")
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            json_data = json.loads(data)
                            content = json_data["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except requests.exceptions.RequestException as e:
            raise LLMError(f"OpenRouter streaming failed: {str(e)}")


class HuggingFaceClient(BaseLLMClient):
    """Client for HuggingFace Inference API."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        max_new_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate response using HuggingFace."""
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_new_tokens,
            }
        }
        
        for key, value in kwargs.items():
            if key not in ['stream']:
                payload["parameters"][key] = value
        
        try:
            url = f"https://api-inference.huggingface.co/models/{model}"
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=None  # No timeout
            )
            response.raise_for_status()
            
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "")
            return str(data)
        except requests.exceptions.RequestException as e:
            raise LLMError(f"HuggingFace request failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Streaming not supported for HuggingFace Inference API."""
        result = await self.generate(prompt, model, temperature, **kwargs)
        yield result


class OpenAIClient(BaseLLMClient):
    """Client for OpenAI API."""
    
    BASE_URL = "https://api.openai.com/v1/chat/completions"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate response using OpenAI."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        
        for key, value in kwargs.items():
            if key not in ['stream']:
                payload[key] = value
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                timeout=None  # No timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            raise LLMError(f"OpenAI request failed: {str(e)}")
        except (KeyError, IndexError) as e:
            raise LLMError(f"OpenAI response parsing failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using OpenAI."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": True,
        }
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                stream=True,
                timeout=None
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    line = line.decode("utf-8")
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            json_data = json.loads(data)
                            content = json_data["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except requests.exceptions.RequestException as e:
            raise LLMError(f"OpenAI streaming failed: {str(e)}")


class GeminiClient(BaseLLMClient):
    """Client for Google Gemini API."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/"
    
    async def generate(
        self,
        prompt: str,
        model: str = "gemini-pro",
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate response using Gemini."""
        url = f"{self.base_url}{model}:generateContent?key={self.api_key}"
        
        config = {
            "temperature": temperature,
        }
        
        for key, value in kwargs.items():
            config[key] = value
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": config
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                timeout=None  # No timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except requests.exceptions.RequestException as e:
            raise LLMError(f"Gemini request failed: {str(e)}")
        except (KeyError, IndexError) as e:
            raise LLMError(f"Gemini response parsing failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str = "gemini-pro",
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Streaming not fully supported for Gemini."""
        result = await self.generate(prompt, model, temperature, **kwargs)
        yield result


class ClaudeClient(BaseLLMClient):
    """Client for Anthropic Claude API."""
    
    BASE_URL = "https://api.anthropic.com/v1/messages"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
    
    async def generate(
        self,
        prompt: str,
        model: str = "claude-3-sonnet-20240229",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> str:
        """Generate response using Claude."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        for key, value in kwargs.items():
            if key not in ['stream']:
                payload[key] = value
        
        try:
            response = requests.post(
                self.BASE_URL,
                headers=self.headers,
                json=payload,
                timeout=None  # No timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return data["content"][0]["text"]
        except requests.exceptions.RequestException as e:
            raise LLMError(f"Claude request failed: {str(e)}")
        except (KeyError, IndexError) as e:
            raise LLMError(f"Claude response parsing failed: {str(e)}")
    
    async def generate_stream(
        self,
        prompt: str,
        model: str = "claude-3-sonnet-20240229",
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Streaming not fully supported for Claude."""
        result = await self.generate(prompt, model, temperature, **kwargs)
        yield result


class LLMRouter:
    """Router for selecting and using different LLM providers."""
    
    PROVIDER_CLIENTS = {
        "local": OllamaClient,
        "openrouter": OpenRouterClient,
        "huggingface": HuggingFaceClient,
        "openai": OpenAIClient,
        "gemini": GeminiClient,
        "claude": ClaudeClient
    }
    
    def __init__(self, provider: str, api_key: Optional[str] = None):
        """
        Initialize the LLM router.
        
        Args:
            provider: The provider name (local, openrouter, huggingface, openai, gemini, claude)
            api_key: API key for the provider (not required for local)
        """
        self.provider = provider.lower()
        
        if self.provider not in self.PROVIDER_CLIENTS:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Get the client class
        client_class = self.PROVIDER_CLIENTS[self.provider]
        
        # Initialize the client
        if self.provider == "local":
            self.client = client_class()
        else:
            if not api_key:
                raise ValueError(f"API key required for provider: {provider}")
            self.client = client_class(api_key)
    
    async def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        stream: bool = False,
        **kwargs
    ) -> str:
        """
        Generate a response from the model.
        
        Args:
            prompt: The prompt to send
            model: The model name
            temperature: Sampling temperature
            stream: Whether to stream the response
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Generated text response
        """
        if stream:
            # For streaming, collect all chunks
            chunks = []
            async for chunk in self.client.generate_stream(
                prompt, model, temperature, **kwargs
            ):
                chunks.append(chunk)
            return "".join(chunks)
        else:
            return await self.client.generate(
                prompt, model, temperature, **kwargs
            )
    
    async def generate_stream(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.7,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response from the model.
        
        Args:
            prompt: The prompt to send
            model: The model name
            temperature: Sampling temperature
            **kwargs: Additional provider-specific parameters
            
        Yields:
            Chunks of generated text
        """
        async for chunk in self.client.generate_stream(
            prompt, model, temperature, **kwargs
        ):
            yield chunk
    
    @staticmethod
    def get_available_models(provider: str) -> List[str]:
        """
        Get available models for a provider.
        
        Args:
            provider: The provider name
            
        Returns:
            List of available model names
        """
        from utils.helpers import get_provider_models
        
        if provider.lower() == "local":
            models = OllamaClient.list_models()
            return [m["name"] for m in models]
        
        return get_provider_models(provider)


def create_llm_router(provider: str, api_key: Optional[str] = None) -> LLMRouter:
    """
    Factory function to create an LLM router.
    
    Args:
        provider: The provider name
        api_key: API key for the provider
        
    Returns:
        LLMRouter instance
    """
    return LLMRouter(provider, api_key)

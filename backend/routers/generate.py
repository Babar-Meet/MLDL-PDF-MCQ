"""
Router for MCQ generation endpoints.
Handles file uploads, text extraction, chunking, and AI model routing.
"""

import os
import time
import logging
import tempfile
import json
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse

from services.extractor import TextExtractor, ExtractionError
from services.chunker import chunk_text_with_metadata
from services.llm_router import LLMRouter, LLMError
from utils.helpers import (
    generate_unique_filename,
    is_supported_file,
    sanitize_api_key,
    validate_provider,
    format_error_response
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generate", tags=["generate"])

# System prompt template
SYSTEM_PROMPT_PREFIX = (
    "You are an MCQ generator. Generate ONLY the multiple choice questions without any introductory text, explanations, or acknowledgments. "
    "Do NOT write phrases like 'Here are X questions:', 'Based on the text:', 'Below are:', or any similar preamble. "
    "Output ONLY the questions directly, one after another. "
    "Each question should have the question number, question text, and 4 options (A, B, C, D) with the correct answer marked. "
    "Do NOT add any additional text, explanations, or commentary before or after the questions.\n\n"
)


# Request/Response Models
class GenerateRequest(BaseModel):
    """Request model for MCQ generation."""
    prompt: str = Field(..., description="The prompt/instruction for MCQ generation")
    model_name: str = Field(..., description="The model to use")
    provider: str = Field(..., description="The AI provider (local, openrouter, huggingface, openai, gemini, claude)")
    api_key: Optional[str] = Field(None, description="API key for the provider")
    temperature: float = Field(0.5, ge=0.0, le=2.0, description="Sampling temperature")
    stream: bool = Field(False, description="Whether to stream the response")
    min_chunk_size: int = Field(1000, ge=100, le=2000, description="Minimum words per chunk")
    max_chunk_size: int = Field(5000, ge=2000, le=10000, description="Maximum words per chunk")
    mcq_count: int = Field(10, ge=1, le=500, description="Number of MCQs to generate")


class GenerateResponse(BaseModel):
    """Response model for MCQ generation."""
    model_used: str
    provider: str
    total_chunks: int
    generated_output: str
    processing_time: float
    status: str = "success"


class GenerateStreamResponse(BaseModel):
    """Response model for streaming MCQ generation."""
    model_used: str
    provider: str
    total_chunks: int
    status: str = "streaming"


class ExtractionResponse(BaseModel):
    """Response model for text extraction."""
    files_processed: int
    total_text_length: int
    extracted_texts: dict
    status: str = "success"


class ChunkResponse(BaseModel):
    """Response model for text chunking."""
    total_chunks: int
    total_words: int
    chunks: List[str]
    metadata: List[dict]
    status: str = "success"


# Helper functions
async def save_upload_files(files: List[UploadFile]) -> List[str]:
    """
    Save uploaded files to temporary directory.
    
    Args:
        files: List of uploaded files
        
    Returns:
        List of file paths
    """
    temp_dir = tempfile.mkdtemp(prefix="mcq_gen_")
    file_paths = []
    
    for file in files:
        if not is_supported_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.filename}. Supported: PDF, JPG, JPEG, PNG, BMP, TIFF, GIF, WEBP"
            )
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        file_path = os.path.join(temp_dir, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_paths.append(file_path)
    
    return file_paths


def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files.
    
    Args:
        file_paths: List of file paths to delete
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            # Try to remove parent temp directory
            parent_dir = os.path.dirname(file_path)
            if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                os.rmdir(parent_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup file {file_path}: {str(e)}")


def build_mcq_prompt(user_prompt: str, chunk_text: str, mcq_count: int = 10) -> str:
    """
    Build the full prompt for MCQ generation.
    
    Args:
        user_prompt: The user's prompt/instruction
        chunk_text: The text chunk to generate questions from
        mcq_count: Number of MCQs to generate
        
    Returns:
        Full prompt string
    """
    return (
        f"Generate exactly {mcq_count} multiple choice questions (MCQs) ONLY from the text below.\n\n"
        f"RULES:\n"
        f"1. Output ONLY the questions - NO introductions, NO explanations, NO summaries, NO conclusions.\n"
        f"2. Do NOT write phrases like 'Here are', 'Based on', 'Below are', 'Thank you', etc.\n"
        f"3. Each question must have: question number, question text, 4 options (A, B, C, D), and the correct answer.\n"
        f"4. If the text doesn't contain enough information, generate fewer questions but never add external information.\n"
        f"5. Generate EXACTLY {mcq_count} questions - no more, no less.\n\n"
        f"TEXT:\n{chunk_text}\n\n"
        f"MCQs (exactly {mcq_count}):\n"
    )


# Endpoints
@router.post("/upload", response_model=ExtractionResponse)
async def upload_and_extract(
    files: List[UploadFile] = File(..., description="PDF or image files to extract text from")
):
    """
    Upload files and extract text from them.
    
    Args:
        files: List of uploaded files
        
    Returns:
        Extracted text from all files
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Save uploaded files
    file_paths = []
    temp_dir = tempfile.mkdtemp(prefix="mcq_extract_")
    
    try:
        for file in files:
            if not is_supported_file(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.filename}"
                )
            
            unique_filename = generate_unique_filename(file.filename)
            file_path = os.path.join(temp_dir, unique_filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            file_paths.append(file_path)
        
        # Extract text from all files
        extracted_texts = {}
        total_length = 0
        
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            try:
                text = TextExtractor.extract(file_path)
                extracted_texts[filename] = text
                total_length += len(text)
            except ExtractionError as e:
                extracted_texts[filename] = f"[ERROR: {str(e)}]"
                logger.error(f"Extraction error for {filename}: {str(e)}")
        
        return ExtractionResponse(
            files_processed=len(files),
            total_text_length=total_length,
            extracted_texts=extracted_texts
        )
        
    finally:
        # Cleanup
        cleanup_temp_files(file_paths)


@router.post("/chunk", response_model=ChunkResponse)
async def chunk_text_endpoint(
    text: str = Form(..., description="Text to chunk"),
    min_chunk_size: int = Form(1000, ge=100, le=2000),
    max_chunk_size: int = Form(5000, ge=2000, le=10000)
):
    """
    Chunk text into smaller pieces for processing.
    
    Args:
        text: The text to chunk
        min_chunk_size: Minimum words per chunk
        max_chunk_size: Maximum words per chunk
        
    Returns:
        Chunked text with metadata
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    result = chunk_text_with_metadata(
        text=text,
        min_chunk_size=min_chunk_size,
        max_chunk_size=max_chunk_size
    )
    
    return ChunkResponse(
        total_chunks=result["total_chunks"],
        total_words=result["total_words"],
        chunks=result["chunks"],
        metadata=result["metadata"]
    )


@router.post("", response_model=GenerateResponse)
async def generate_mcq(
    files: List[UploadFile] = File(..., description="PDF or image files"),
    prompt: str = Form(..., description="The prompt/instruction for MCQ generation"),
    model_name: str = Form(..., description="The model to use"),
    provider: str = Form(..., description="The AI provider"),
    api_key: Optional[str] = Form(None, description="API key for the provider"),
    temperature: float = Form(0.7, ge=0.0, le=2.0),
    stream: bool = Form(False),
    min_chunk_size: int = Form(1000, ge=100, le=2000),
    max_chunk_size: int = Form(5000, ge=2000, le=10000),
    mcq_count: int = Form(10, ge=1, le=500)
):
    """
    Generate MCQs from uploaded files.
    
    Args:
        files: List of uploaded PDF or image files
        prompt: The prompt/instruction for MCQ generation
        model_name: The model to use
        provider: The AI provider
        api_key: API key for the provider
        temperature: Sampling temperature
        stream: Whether to stream the response
        min_chunk_size: Minimum words per chunk
        max_chunk_size: Maximum words per chunk
        mcq_count: Number of MCQs to generate
        
    Returns:
        Generated MCQ output
    """
    start_time = time.time()
    
    # Validate provider
    provider = provider.lower()
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Supported: local, openrouter, huggingface, openai, gemini, claude"
        )
    
    # Log request (without API key)
    logger.info(f"MCQ Generation request: provider={provider}, model={model_name}, files={len(files)}")
    if api_key:
        logger.debug(f"API key provided (masked): {sanitize_api_key(api_key)}")
    
    # Save uploaded files
    file_paths = []
    temp_dir = tempfile.mkdtemp(prefix="mcq_gen_")
    
    try:
        # Save files
        for file in files:
            if not is_supported_file(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.filename}"
                )
            
            unique_filename = generate_unique_filename(file.filename)
            file_path = os.path.join(temp_dir, unique_filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            file_paths.append(file_path)
        
        # Extract text from all files
        extracted_texts = {}
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            try:
                text = TextExtractor.extract(file_path)
                extracted_texts[filename] = text
            except ExtractionError as e:
                extracted_texts[filename] = f"[ERROR: {str(e)}]"
                logger.error(f"Extraction error for {filename}: {str(e)}")
        
        # Combine all extracted text
        combined_text = "\n\n".join(extracted_texts.values())
        
        if not combined_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text could be extracted from the provided files"
            )
        
        # NOTE: We process the FULL text in ONE call to avoid duplicate/overlapping MCQs
        # This ensures unique questions from the entire document
        # The chunking is only used to count chunks for logging purposes
        
        # Get total word count for logging
        total_words = len(combined_text.split())
        logger.info(f"Processing full text: {total_words} words")
        
        # Create LLM router
        try:
            llm_router = LLMRouter(provider, api_key)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Generate ALL MCQs from the FULL text in ONE call
        logger.info(f"Generating {mcq_count} MCQs from full text")
        full_prompt = build_mcq_prompt(prompt, combined_text, mcq_count)
        
        try:
            final_output = await llm_router.generate(
                prompt=full_prompt,
                model=model_name,
                temperature=temperature,
                stream=False
            )
        except LLMError as e:
            logger.error(f"LLM error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error generating MCQs: {str(e)}")
        
        processing_time = time.time() - start_time
        
        logger.info(f"MCQ Generation completed: 1 chunk (full text), {processing_time:.2f}s")
        
        return GenerateResponse(
            model_used=model_name,
            provider=provider,
            total_chunks=1,
            generated_output=final_output,
            processing_time=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup
        cleanup_temp_files(file_paths)


@router.post("/stream")
async def generate_mcq_stream(
    files: List[UploadFile] = File(..., description="PDF or image files"),
    prompt: str = Form(..., description="The prompt/instruction for MCQ generation"),
    model_name: str = Form(..., description="The model to use"),
    provider: str = Form(..., description="The AI provider"),
    api_key: Optional[str] = Form(None, description="API key for the provider"),
    temperature: float = Form(0.7, ge=0.0, le=2.0),
    min_chunk_size: int = Form(1000, ge=100, le=2000),
    max_chunk_size: int = Form(5000, ge=2000, le=10000),
    mcq_count: int = Form(10, ge=1, le=500)
):
    """
    Generate MCQs from uploaded files with streaming response.
    
    Args:
        files: List of uploaded PDF or image files
        prompt: The prompt/instruction for MCQ generation
        model_name: The model to use
        provider: The AI provider
        api_key: API key for the provider
        temperature: Sampling temperature
        min_chunk_size: Minimum words per chunk
        max_chunk_size: Maximum words per chunk
        mcq_count: Number of MCQs to generate
        
    Returns:
        Streaming response with generated MCQ output
    """
    # Validate provider
    provider = provider.lower()
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Supported: local, openrouter, huggingface, openai, gemini, claude"
        )
    
    logger.info(f"MCQ Generation request (stream): provider={provider}, model={model_name}")
    
    # Save uploaded files
    file_paths = []
    temp_dir = tempfile.mkdtemp(prefix="mcq_gen_stream_")
    
    try:
        # Save files
        for file in files:
            if not is_supported_file(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {file.filename}"
                )
            
            unique_filename = generate_unique_filename(file.filename)
            file_path = os.path.join(temp_dir, unique_filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            file_paths.append(file_path)
        
        # Extract text
        extracted_texts = {}
        for file_path in file_paths:
            filename = os.path.basename(file_path)
            try:
                text = TextExtractor.extract(file_path)
                extracted_texts[filename] = text
            except ExtractionError as e:
                extracted_texts[filename] = f"[ERROR: {str(e)}]"
        
        # Combine text
        combined_text = "\n\n".join(extracted_texts.values())
        
        if not combined_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text could be extracted from the provided files"
            )
        
        # Get total word count
        total_words = len(combined_text.split())
        logger.info(f"Streaming MCQ generation: {total_words} words, {mcq_count} MCQs")
        
        # Create LLM router
        llm_router = LLMRouter(provider, api_key)
        
        # Build prompt for FULL text (not chunks) to avoid duplicates
        full_prompt = build_mcq_prompt(prompt, combined_text, mcq_count)
        
        async def generate_stream():
            """Generate streaming response from full text."""
            try:
                async for token in llm_router.generate_stream(
                    prompt=full_prompt,
                    model=model_name,
                    temperature=temperature
                ):
                    yield f"data: {token}\n\n"
            except LLMError as e:
                yield f"data: [Error: {str(e)}]\n\n"
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "X-Accel-Buffering": "no"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        cleanup_temp_files(file_paths)


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Status of the service
    """
    return {
        "status": "healthy",
        "service": "MCQ Generator",
        "version": "1.0.0"
    }


# New endpoint for generating from pre-extracted text
@router.post("/generate-text", response_model=GenerateResponse)
async def generate_from_text(
    text: str = Form(..., description="Pre-extracted text to generate MCQs from"),
    prompt: str = Form(..., description="The prompt/instruction for MCQ generation"),
    model_name: str = Form(..., description="The model to use"),
    provider: str = Form(..., description="The AI provider"),
    api_key: Optional[str] = Form(None, description="API key for the provider"),
    temperature: float = Form(0.7, ge=0.0, le=2.0),
    min_chunk_size: int = Form(1000, ge=100, le=2000),
    max_chunk_size: int = Form(5000, ge=2000, le=10000),
    mcq_count: int = Form(10, ge=1, le=500)
):
    """
    Generate MCQs from pre-extracted text.
    """
    start_time = time.time()
    
    # Validate provider
    provider = provider.lower()
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Supported: local, openrouter, huggingface, openai, gemini, claude"
        )
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    # Get total word count for logging
    total_words = len(text.split())
    logger.info(f"Processing full text: {total_words} words")
    
    # Create LLM router
    try:
        llm_router = LLMRouter(provider, api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Generate ALL MCQs from the FULL text in ONE call (no chunking)
    # This prevents duplicate/overlapping questions
    logger.info(f"Generating {mcq_count} MCQs from full text")
    full_prompt = build_mcq_prompt(prompt, text, mcq_count)
    
    try:
        final_output = await llm_router.generate(
            prompt=full_prompt,
            model=model_name,
            temperature=temperature,
            stream=False
        )
    except LLMError as e:
        logger.error(f"LLM error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating MCQs: {str(e)}")
    
    processing_time = time.time() - start_time
    
    logger.info(f"MCQ Generation completed: 1 chunk (full text), {processing_time:.2f}s")
    
    return GenerateResponse(
        model_used=model_name,
        provider=provider,
        total_chunks=1,
        generated_output=final_output,
        processing_time=processing_time
    )


# Streaming endpoint with progress updates
@router.get("/stream-progress")
async def stream_progress(
    text: str = Query(..., description="Pre-extracted text to generate MCQs from"),
    prompt: str = Query(..., description="The prompt/instruction for MCQ generation"),
    model_name: str = Query(..., description="The model to use"),
    provider: str = Query(..., description="The AI provider"),
    api_key: str = Query("", description="API key for the provider"),
    temperature: float = Query(0.7, ge=0.0, le=2.0),
    min_chunk_size: int = Query(1000, ge=100, le=2000),
    max_chunk_size: int = Query(5000, ge=2000, le=10000),
    mcq_count: int = Query(10, ge=1, le=500)
):
    """
    Generate MCQs with streaming progress updates using Server-Sent Events.
    """
    start_time = time.time()
    
    # Validate provider
    provider = provider.lower()
    if not validate_provider(provider):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Supported: local, openrouter, huggingface, openai, gemini, claude"
        )
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    
    # Clean API key
    api_key = api_key if api_key else None
    
    # Get total word count
    total_words = len(text.split())
    logger.info(f"Streaming MCQ generation: {total_words} words, {mcq_count} MCQs")
    
    async def generate_with_progress():
        """Generate MCQs while sending progress updates."""
        try:
            # Send initial progress
            yield f"data: {json.dumps({'type': 'progress', 'status': 'initializing', 'message': 'Starting MCQ generation...', 'percentage': 0})}\n\n"
            
            # Create LLM router
            try:
                llm_router = LLMRouter(provider, api_key)
            except ValueError as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                return
            
            # Send model loading progress
            yield f"data: {json.dumps({'type': 'progress', 'status': 'loading_model', 'message': f'Loading {model_name} model...', 'percentage': 5})}\n\n"
            
            # Generate MCQs from FULL text in ONE call (no chunks to avoid duplicates)
            yield f"data: {json.dumps({'type': 'progress', 'status': 'generating', 'message': f'Generating {mcq_count} MCQs from full text...', 'percentage': 10})}\n\n"
            
            # Build prompt for full text
            full_prompt = build_mcq_prompt(prompt, text, mcq_count)
            
            try:
                output = await llm_router.generate(
                    prompt=full_prompt,
                    model=model_name,
                    temperature=temperature,
                    stream=False
                )
                final_output = output
                
                # Send completion message
                processing_time = time.time() - start_time
                yield f"data: {json.dumps({'type': 'complete', 'message': 'Generation complete!', 'processingTime': round(processing_time, 2), 'totalChunks': 1, 'metadata': {'model_used': model_name, 'provider': provider, 'total_chunks': 1, 'processing_time': round(processing_time, 2)}})}\n\n"
                
                # Send the actual output
                yield f"data: {final_output}\n\n"
                
            except LLMError as e:
                logger.error(f"LLM error: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': f'Error generating MCQs: {str(e)}'})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_with_progress(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

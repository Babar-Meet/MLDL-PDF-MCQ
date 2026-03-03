"""
Text chunking service for splitting large text content into manageable chunks.
"""

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class TextChunker:
    """Handles text chunking for processing large documents."""
    
    # Default chunking parameters
    DEFAULT_MIN_CHUNK_SIZE = 500  # Minimum words per chunk
    DEFAULT_MAX_CHUNK_SIZE = 1500  # Maximum words per chunk
    DEFAULT_OVERLAP = 100  # Overlap between chunks in words
    
    def __init__(
        self,
        min_chunk_size: int = DEFAULT_MIN_CHUNK_SIZE,
        max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
        overlap: int = DEFAULT_OVERLAP
    ):
        """
        Initialize the TextChunker.
        
        Args:
            min_chunk_size: Minimum number of words per chunk
            max_chunk_size: Maximum number of words per chunk
            overlap: Number of words to overlap between chunks
        """
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.overlap = overlap
        
        if min_chunk_size > max_chunk_size:
            raise ValueError("min_chunk_size cannot be greater than max_chunk_size")
        if overlap < 0:
            raise ValueError("overlap cannot be negative")
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks.
        
        Args:
            text: The text to chunk
            
        Returns:
            List of text chunks
        """
        # Handle empty or very short text
        if not text or not text.strip():
            return []
        
        # Clean and normalize text
        text = self._preprocess_text(text)
        
        # Check if text is short enough to not need chunking
        word_count = len(text.split())
        if word_count <= self.max_chunk_size:
            return [text]
        
        # Split into paragraphs first for better context preservation
        paragraphs = self._split_into_paragraphs(text)
        
        # Combine paragraphs into chunks
        chunks = self._combine_paragraphs(paragraphs)
        
        logger.info(f"Split text into {len(chunks)} chunks (total {word_count} words)")
        return chunks
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text before chunking.
        
        Args:
            text: Raw text
            
        Returns:
            Cleaned text
        """
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove excessive newlines within paragraphs
        text = re.sub(r'\n(?!\n)', ' ', text)
        # Restore paragraph breaks
        text = re.sub(r' {2,}', '\n\n', text)
        
        return text.strip()
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs.
        
        Args:
            text: The text to split
            
        Returns:
            List of paragraphs
        """
        # Split on double newlines or single newlines with significant content
        paragraphs = re.split(r'\n\s*\n|\n', text)
        
        # Filter out empty paragraphs and clean up
        cleaned_paragraphs = []
        for para in paragraphs:
            para = para.strip()
            if para:
                cleaned_paragraphs.append(para)
        
        return cleaned_paragraphs
    
    def _combine_paragraphs(self, paragraphs: List[str]) -> List[str]:
        """
        Combine paragraphs into chunks of appropriate size.
        
        Args:
            paragraphs: List of paragraphs
            
        Returns:
            List of text chunks
        """
        chunks = []
        current_chunk = []
        current_word_count = 0
        
        for para in paragraphs:
            para_word_count = len(para.split())
            
            # If single paragraph exceeds max, split it further
            if para_word_count > self.max_chunk_size:
                # First, flush current chunk if not empty
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_word_count = 0
                
                # Split large paragraph
                sub_chunks = self._split_large_paragraph(para)
                chunks.extend(sub_chunks)
                
            # Check if adding this paragraph would exceed max size
            elif current_word_count + para_word_count > self.max_chunk_size:
                # Save current chunk if it meets minimum size
                if current_word_count >= self.min_chunk_size:
                    chunks.append(" ".join(current_chunk))
                    
                    # Start new chunk with overlap
                    current_chunk, current_word_count = self._create_chunk_with_overlap(
                        current_chunk, current_word_count
                    )
                
                # Add current paragraph
                current_chunk.append(para)
                current_word_count += para_word_count
                
            else:
                # Add paragraph to current chunk
                current_chunk.append(para)
                current_word_count += para_word_count
        
        # Don't forget the last chunk
        if current_chunk and current_word_count >= self.min_chunk_size:
            chunks.append(" ".join(current_chunk))
        elif current_chunk:
            # If last chunk is small, merge with previous if possible
            if chunks:
                chunks[-1] = chunks[-1] + " " + " ".join(current_chunk)
            else:
                chunks.append(" ".join(current_chunk))
        
        return chunks
    
    def _split_large_paragraph(self, paragraph: str) -> List[str]:
        """
        Split a large paragraph into smaller chunks.
        
        Args:
            paragraph: The paragraph to split
            
        Returns:
            List of smaller chunks
        """
        chunks = []
        words = paragraph.split()
        
        if len(words) <= self.max_chunk_size:
            return [paragraph]
        
        # Split by sentences if possible
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        
        current_chunk = []
        current_word_count = 0
        
        for sentence in sentences:
            sentence_word_count = len(sentence.split())
            
            if current_word_count + sentence_word_count > self.max_chunk_size:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = [sentence]
                    current_word_count = sentence_word_count
                else:
                    # Single sentence is too large, split by words
                    sub_chunks = self._split_by_words(words)
                    chunks.extend(sub_chunks)
                    break
            else:
                current_chunk.append(sentence)
                current_word_count += sentence_word_count
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks
    
    def _split_by_words(self, words: List[str]) -> List[str]:
        """
        Split a list of words into chunks.
        
        Args:
            words: List of words
            
        Returns:
            List of word chunks
        """
        chunks = []
        
        for i in range(0, len(words), self.max_chunk_size):
            chunk_words = words[i:i + self.max_chunk_size]
            chunks.append(" ".join(chunk_words))
        
        return chunks
    
    def _create_chunk_with_overlap(
        self,
        previous_chunk: List[str],
        word_count: int
    ) -> tuple[List[str], int]:
        """
        Create a new chunk with overlap from the previous chunk.
        
        Args:
            previous_chunk: The previous chunk words
            word_count: Word count of previous chunk
            
        Returns:
            Tuple of (new chunk, word count)
        """
        if not previous_chunk or self.overlap == 0:
            return [], 0
        
        # Get the last few words for overlap
        all_words = " ".join(previous_chunk).split()
        overlap_words = all_words[-self.overlap:] if len(all_words) > self.overlap else all_words
        
        return [" ".join(overlap_words)], len(overlap_words)
    
    def get_chunk_metadata(self, chunks: List[str]) -> List[Dict[str, Any]]:
        """
        Get metadata for each chunk.
        
        Args:
            chunks: List of text chunks
            
        Returns:
            List of metadata dictionaries
        """
        metadata = []
        
        for i, chunk in enumerate(chunks):
            word_count = len(chunk.split())
            char_count = len(chunk)
            
            metadata.append({
                "chunk_index": i,
                "word_count": word_count,
                "char_count": char_count,
                "preview": chunk[:100] + "..." if len(chunk) > 100 else chunk
            })
        
        return metadata


# Default chunker instance
default_chunker = TextChunker()


def chunk_text(
    text: str,
    min_chunk_size: int = 500,
    max_chunk_size: int = 1500,
    overlap: int = 100
) -> List[str]:
    """
    Convenience function to chunk text.
    
    Args:
        text: The text to chunk
        min_chunk_size: Minimum words per chunk
        max_chunk_size: Maximum words per chunk
        overlap: Overlap between chunks
        
    Returns:
        List of text chunks
    """
    chunker = TextChunker(
        min_chunk_size=min_chunk_size,
        max_chunk_size=max_chunk_size,
        overlap=overlap
    )
    return chunker.chunk_text(text)


def chunk_text_with_metadata(
    text: str,
    min_chunk_size: int = 500,
    max_chunk_size: int = 1500,
    overlap: int = 100
) -> Dict[str, Any]:
    """
    Chunk text and return with metadata.
    
    Args:
        text: The text to chunk
        min_chunk_size: Minimum words per chunk
        max_chunk_size: Maximum words per chunk
        overlap: Overlap between chunks
        
    Returns:
        Dictionary with chunks and metadata
    """
    chunker = TextChunker(
        min_chunk_size=min_chunk_size,
        max_chunk_size=max_chunk_size,
        overlap=overlap
    )
    
    chunks = chunker.chunk_text(text)
    metadata = chunker.get_chunk_metadata(chunks)
    
    return {
        "chunks": chunks,
        "metadata": metadata,
        "total_chunks": len(chunks),
        "total_words": sum(m["word_count"] for m in metadata)
    }

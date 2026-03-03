"""
Text extraction service for PDF and image files.
Supports PDF extraction using pdfplumber and image OCR using pytesseract.
"""

import io
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

import pdfplumber
from PIL import Image
import pytesseract

# Configure logging
logger = logging.getLogger(__name__)


class ExtractionError(Exception):
    """Custom exception for extraction errors."""
    pass


class PDFExtractor:
    """Extracts text from PDF files using pdfplumber."""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        """
        Extract text from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content
            
        Raises:
            ExtractionError: If extraction fails
        """
        text_content = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    try:
                        # Extract text from the page
                        page_text = page.extract_text()
                        
                        if page_text:
                            text_content.append(page_text)
                            logger.debug(f"Extracted {len(page_text)} chars from page {page_num}")
                        else:
                            logger.warning(f"No text found on page {page_num} in {file_path}")
                            
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num}: {str(e)}")
                        continue
                        
            if not text_content:
                raise ExtractionError(f"No text could be extracted from PDF: {file_path}")
                
            full_text = "\n\n".join(text_content)
            logger.info(f"Successfully extracted {len(full_text)} chars from PDF: {file_path}")
            return full_text
            
        except pdfplumber.pdfplumber.PDFPasswordError:
            raise ExtractionError("PDF is password protected")
        except Exception as e:
            raise ExtractionError(f"Failed to extract PDF text: {str(e)}")


class ImageExtractor:
    """Extracts text from images using pytesseract OCR."""
    
    @staticmethod
    def extract_from_image(file_path: str, lang: str = "eng") -> str:
        """
        Extract text from an image file using OCR.
        
        Args:
            file_path: Path to the image file
            lang: Language for OCR (default: English)
            
        Returns:
            Extracted text content
            
        Raises:
            ExtractionError: If extraction fails
        """
        try:
            # Open the image file
            image = Image.open(file_path)
            
            # Convert to RGB if necessary (handles RGBA, palette modes, etc.)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            
            # Perform OCR
            text = pytesseract.image_to_string(image, lang=lang)
            
            # Clean up the extracted text
            text = ImageExtractor._clean_text(text)
            
            if not text.strip():
                raise ExtractionError(f"No text could be extracted from image: {file_path}")
                
            logger.info(f"Successfully extracted {len(text)} chars from image: {file_path}")
            return text
            
        except pytesseract.pytesseract.TesseractNotFoundError:
            raise ExtractionError("Tesseract OCR is not installed or not in PATH")
        except Exception as e:
            raise ExtractionError(f"Failed to extract image text: {str(e)}")
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Clean up extracted OCR text.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        lines = text.splitlines()
        cleaned_lines = []
        
        for line in lines:
            # Strip leading/trailing whitespace
            line = line.strip()
            # Replace multiple spaces with single space
            line = " ".join(line.split())
            if line:
                cleaned_lines.append(line)
        
        # Join lines with proper line breaks
        return "\n".join(cleaned_lines)


class TextExtractor:
    """Main text extraction class that routes to appropriate extractor."""
    
    # Supported file extensions
    PDF_EXTENSIONS = {"pdf"}
    IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "tiff", "tif", "gif", "webp"}
    
    @classmethod
    def extract(cls, file_path: str) -> str:
        """
        Extract text from a file based on its type.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Extracted text content
            
        Raises:
            ExtractionError: If file type is unsupported or extraction fails
        """
        path = Path(file_path)
        extension = path.suffix.lower().lstrip(".")
        
        if extension in cls.PDF_EXTENSIONS:
            return PDFExtractor.extract_from_pdf(file_path)
        elif extension in cls.IMAGE_EXTENSIONS:
            return ImageExtractor.extract_from_image(file_path)
        else:
            raise ExtractionError(f"Unsupported file type: {extension}")
    
    @classmethod
    def extract_multiple(cls, file_paths: List[str]) -> Dict[str, str]:
        """
        Extract text from multiple files.
        
        Args:
            file_paths: List of file paths
            
        Returns:
            Dictionary mapping filename to extracted text
        """
        results = {}
        
        for file_path in file_paths:
            try:
                filename = Path(file_path).name
                text = cls.extract(file_path)
                results[filename] = text
            except ExtractionError as e:
                logger.error(f"Failed to extract from {file_path}: {str(e)}")
                results[Path(file_path).name] = f"[ERROR: {str(e)}]"
            except Exception as e:
                logger.error(f"Unexpected error extracting from {file_path}: {str(e)}")
                results[Path(file_path).name] = f"[ERROR: Unexpected error]"
        
        return results
    
    @classmethod
    def combine_text(cls, text_dict: Dict[str, str]) -> str:
        """
        Combine multiple text sources into a single text.
        
        Args:
            text_dict: Dictionary mapping filename to text
            
        Returns:
            Combined text with source labels
        """
        combined_parts = []
        
        for filename, text in text_dict.items():
            combined_parts.append(f"[Source: {filename}]\n{text}")
        
        return "\n\n".join(combined_parts)


async def extract_text_from_upload(
    file_content: bytes,
    filename: str,
    temp_dir: str = "temp_uploads"
) -> str:
    """
    Extract text from an uploaded file.
    
    Args:
        file_content: The raw file content
        filename: The original filename
        temp_dir: Directory to save temporary files
        
    Returns:
        Extracted text
    """
    from utils.helpers import generate_unique_filename
    
    # Create temp directory
    temp_path = Path(temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename and save
    unique_filename = generate_unique_filename(filename)
    file_path = temp_path / unique_filename
    
    try:
        # Write file content
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Extract text
        text = TextExtractor.extract(str(file_path))
        return text
        
    finally:
        # Cleanup - delete temp file
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass


async def extract_texts_from_uploads(
    file_contents: List[bytes],
    filenames: List[str],
    temp_dir: str = "temp_uploads"
) -> Dict[str, str]:
    """
    Extract text from multiple uploaded files.
    
    Args:
        file_contents: List of raw file contents
        filenames: List of original filenames
        temp_dir: Directory to save temporary files
        
    Returns:
        Dictionary mapping filename to extracted text
    """
    results = {}
    
    for content, filename in zip(file_contents, filenames):
        try:
            text = await extract_text_from_upload(content, filename, temp_dir)
            results[filename] = text
        except ExtractionError as e:
            results[filename] = f"[ERROR: {str(e)}]"
        except Exception as e:
            results[filename] = f"[ERROR: Unexpected error: {str(e)}]"
    
    return results

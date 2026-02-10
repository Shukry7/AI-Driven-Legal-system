"""
PDF Service - Handles PDF file processing and text extraction.

This service receives PDF bytes and converts them into clean, structured text
suitable for legal document analysis and ML model processing.
"""

import re
from io import BytesIO
from typing import Tuple
import logging
import os

try:
    import pdfplumber
    PDF_LIBRARY = 'pdfplumber'
except ImportError:
    try:
        import PyPDF2
        PDF_LIBRARY = 'pypdf2'
    except ImportError:
        PDF_LIBRARY = None


def pdf_bytes_to_text(pdf_bytes: bytes) -> Tuple[bool, str]:
    """
    Extract and clean text from PDF bytes.
    
    Args:
        pdf_bytes: Raw bytes of a PDF file
        
    Returns:
        Tuple[bool, str]: (success_status, extracted_text_or_error_message)
        - If successful: (True, cleaned_text)
        - If failed: (False, error_message)
    """
    if PDF_LIBRARY is None:
        return False, "No PDF library installed. Install pdfplumber or PyPDF2."
    
    try:
        if PDF_LIBRARY == 'pdfplumber':
            ok, result = _extract_with_pdfplumber(pdf_bytes)
        else:
            ok, result = _extract_with_pypdf2(pdf_bytes)

        if ok:
            return True, result

        # If PDF libraries couldn't extract text, try OCR fallback for scanned PDFs
        if isinstance(result, str) and 'no text could be extracted' in result.lower():
            ocr_ok, ocr_result = _ocr_fallback(pdf_bytes)
            if ocr_ok:
                return True, ocr_result
            return False, f"PDF extraction failed: {result}; OCR fallback failed: {ocr_result}"

        return False, result
    except Exception as e:
        return False, f"PDF extraction failed: {str(e)}"


def _extract_with_pdfplumber(pdf_bytes: bytes) -> Tuple[bool, str]:
    """
    Extract text using pdfplumber (preferred method - better formatting).
    
    Args:
        pdf_bytes: Raw PDF bytes
        
    Returns:
        Tuple[bool, str]: Success status and extracted text
    """
    try:
        text_parts = []
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            total_pages = len(pdf.pages)
            
            if total_pages == 0:
                return False, "PDF has no pages"
            
            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text()
                if page_text:
                    # Add page marker for reference
                    text_parts.append(f"\n--- Page {page_num} ---\n")
                    text_parts.append(page_text)
        
        raw_text = "\n".join(text_parts)
        
        if not raw_text.strip():
            return False, "No text could be extracted from PDF"
        
        # Clean and normalize the extracted text
        cleaned_text = clean_extracted_text(raw_text)
        return True, cleaned_text
        
    except Exception as e:
        return False, f"pdfplumber extraction error: {str(e)}"


def _extract_with_pypdf2(pdf_bytes: bytes) -> Tuple[bool, str]:
    """
    Extract text using PyPDF2 (fallback method).
    
    Args:
        pdf_bytes: Raw PDF bytes
        
    Returns:
        Tuple[bool, str]: Success status and extracted text
    """
    try:
        text_parts = []
        pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
        total_pages = len(pdf_reader.pages)
        
        if total_pages == 0:
            return False, "PDF has no pages"
        
        for page_num, page in enumerate(pdf_reader.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"\n--- Page {page_num} ---\n")
                text_parts.append(page_text)
        
        raw_text = "\n".join(text_parts)
        
        if not raw_text.strip():
            return False, "No text could be extracted from PDF"
        
        cleaned_text = clean_extracted_text(raw_text)
        return True, cleaned_text
        
    except Exception as e:
        return False, f"PyPDF2 extraction error: {str(e)}"


def clean_extracted_text(text: str) -> str:
    """
    Clean and normalize extracted text from PDF.
    
    Operations performed:
    - Remove excessive whitespace and blank lines
    - Normalize line breaks
    - Remove special characters that may interfere with ML processing
    - Preserve legal formatting (sections, clauses, numbering)
    
    Args:
        text: Raw extracted text
        
    Returns:
        str: Cleaned and normalized text
    """
    if not text:
        return ""
    
    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove excessive blank lines (more than 2 consecutive)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove trailing/leading whitespace from each line
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove excessive spaces (but preserve single spaces)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Remove non-printable characters except newlines and tabs
    text = re.sub(r'[^\x20-\x7E\n\t\u0080-\uFFFF]+', '', text)
    
    # Trim overall whitespace
    text = text.strip()
    
    return text


def extract_metadata_from_text(text: str) -> dict:
    """
    Extract basic metadata from legal judgment text.
    
    This is a simple extraction - can be extended based on document structure.
    
    Args:
        text: Extracted and cleaned text
        
    Returns:
        dict: Dictionary containing extracted metadata
    """
    metadata = {
        'total_characters': len(text),
        'total_words': len(text.split()),
        'total_lines': len(text.split('\n')),
        'has_content': bool(text.strip())
    }
    
    # Try to extract case number (common pattern in Indian judgments)
    case_number_pattern = r'(?:Case No\.|C\.A\. No\.|Civil Appeal No\.|Criminal Appeal No\.)\s*(\d+/\d+)'
    match = re.search(case_number_pattern, text, re.IGNORECASE)
    if match:
        metadata['case_number'] = match.group(1)
    
    return metadata


def _ocr_fallback(pdf_bytes: bytes) -> Tuple[bool, str]:
    """
    OCR fallback using `pdf2image` to convert pages to images and `pytesseract` to extract text.

    Returns (True, text) on success or (False, error_message) on failure.
    """
    logger = logging.getLogger(__name__)

    try:
        from pdf2image import convert_from_bytes
    except Exception as e:
        logger.info("OCR fallback unavailable: pdf2image import failed: %s", e)
        return False, "pdf2image is not installed or not available: " + str(e)

    try:
        import pytesseract
    except Exception as e:
        logger.info("OCR fallback unavailable: pytesseract import failed: %s", e)
        return False, "pytesseract is not installed or Tesseract binary not available: " + str(e)

    try:
        logger.info("OCR fallback: starting pdf2image conversion")
        poppler_path = os.environ.get('POPPLER_PATH') or os.environ.get('PDF2IMAGE_POPPLER_PATH')
        if poppler_path:
            logger.info("Using POPPLER_PATH=%s for pdf2image", poppler_path)
            images = convert_from_bytes(pdf_bytes, dpi=300, poppler_path=poppler_path)
        else:
            images = convert_from_bytes(pdf_bytes, dpi=300)
        logger.info("OCR fallback: conversion complete, %d pages", len(images))
    except Exception as e:
        logger.info("OCR fallback: pdf2image conversion failed: %s", e)
        return False, f"pdf2image conversion failed: {e}"

    ocr_parts = []
    try:
        logger.info("OCR fallback: starting Tesseract OCR on pages")
        for idx, img in enumerate(images, start=1):
            text = pytesseract.image_to_string(img, lang='eng')
            logger.info("OCR page %d done, %d chars", idx, len(text or ""))
            if text and text.strip():
                ocr_parts.append(f"\n--- Page {idx} (OCR) ---\n")
                ocr_parts.append(text)

        raw_text = "\n".join(ocr_parts)
        if not raw_text.strip():
            logger.info("OCR fallback: produced no text")
            return False, "OCR produced no text"

        cleaned = clean_extracted_text(raw_text)
        logger.info("OCR fallback: complete, total_chars=%d", len(cleaned))
        return True, cleaned
    except Exception as e:
        logger.info("OCR extraction error: %s", e)
        return False, f"OCR extraction error: {e}"

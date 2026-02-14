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

# For PDF generation
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def strip_bold_markers(text: str) -> str:
    """
    Remove formatting markers from text for display purposes.
    
    Args:
        text: Text that may contain <<F:...>>...<</F>> markers
        
    Returns:
        str: Text with markers removed
    """
    import re
    # Remove format markers
    text = re.sub(r'<<F:[^>]+>>', '', text)
    text = re.sub(r'<</F>>', '', text)
    # Also remove old-style markers for backward compatibility
    text = re.sub(r'<<BOLD>>', '', text)
    text = re.sub(r'<</BOLD>>', '', text)
    return text


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
    Preserves bold text by marking it with special markers.
    
    Args:
        pdf_bytes: Raw PDF bytes
        
    Returns:
        Tuple[bool, str]: Success status and extracted text with bold markers
    """
    try:
        text_parts = []
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            total_pages = len(pdf.pages)
            
            if total_pages == 0:
                return False, "PDF has no pages"
            
            for page_num, page in enumerate(pdf.pages, start=1):
                # Add page marker for reference
                text_parts.append(f"\n--- Page {page_num} ---\n")
                
                # Extract with character-level info to detect bold text
                try:
                    chars = page.chars
                    if chars:
                        # Group characters into words/lines with formatting info
                        page_text = _extract_text_with_formatting(chars, page)
                        text_parts.append(page_text)
                    else:
                        # Fallback to regular extraction if no char info
                        page_text = page.extract_text(layout=True, x_tolerance=2, y_tolerance=3)
                        if page_text:
                            text_parts.append(page_text)
                except:
                    # Fallback to regular extraction on any error
                    page_text = page.extract_text(layout=True, x_tolerance=2, y_tolerance=3)
                    if page_text:
                        text_parts.append(page_text)
        
        raw_text = "\n".join(text_parts)
        
        if not raw_text.strip():
            return False, "No text could be extracted from PDF"
        
        # Clean with minimal processing to preserve layout
        cleaned_text = clean_extracted_text_preserve_layout(raw_text)
        return True, cleaned_text
        
    except Exception as e:
        return False, f"pdfplumber extraction error: {str(e)}"


def _extract_text_with_formatting(chars, page):
    """
    Extract text from character-level data, preserving formatting (bold, underline, font size).
    Formatting is preserved with markers: <<F:size=14,bold=1,underline=1>>text<</F>>
    
    Args:
        chars: List of character dictionaries from pdfplumber
        page: Page object for layout extraction
        
    Returns:
        str: Text with formatting markers
    """
    try:
        # Sort characters by position (top to bottom, left to right)
        sorted_chars = sorted(chars, key=lambda c: (round(c['top'], 1), c['x0']))
        
        lines = []
        current_line = []
        current_y = None
        prev_format = None
        y_tolerance = 3
        
        for char in sorted_chars:
            char_y = round(char['top'], 1)
            char_text = char.get('text', '')
            font_name = char.get('fontname', '').lower()
            font_size = round(char.get('size', 10))
            
            # Detect formatting attributes
            is_bold = 'bold' in font_name
            # Check for underline - some PDFs store this in font name or as separate property
            # This is a heuristic - underline detection varies by PDF
            
            # Create format signature
            current_format = {
                'size': font_size,
                'bold': 1 if is_bold else 0,
            }
            
            # Check if we're on a new line
            if current_y is None:
                current_y = char_y
            elif abs(char_y - current_y) > y_tolerance:
                # New line - save current line
                if current_line:
                    if prev_format:
                        current_line.append('<</F>>')
                    lines.append(''.join(current_line))
                current_line = []
                current_y = char_y
                prev_format = None
            
            # Check if format changed
            if prev_format != current_format:
                if prev_format:
                    current_line.append('<</F>>')
                # Only add format marker if different from default (size=10, bold=0)
                if current_format['size'] != 10 or current_format['bold'] != 0:
                    marker = f"<<F:size={current_format['size']},bold={current_format['bold']}>>"
                    current_line.append(marker)
                prev_format = current_format
            
            current_line.append(char_text)
        
        # Add last line
        if current_line:
            if prev_format:
                current_line.append('<</F>>')
            lines.append(''.join(current_line))
        
        return '\n'.join(lines)
        
    except Exception as e:
        # On any error, fallback to simple extraction
        return page.extract_text(layout=True, x_tolerance=2, y_tolerance=3) or ''


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


def clean_extracted_text_preserve_layout(text: str) -> str:
    """
    Clean extracted text while preserving layout, spacing, and formatting.
    
    This version is less aggressive than clean_extracted_text() and maintains:
    - Multiple spaces for alignment
    - Indentation
    - Original line spacing
    - Column alignment
    
    Args:
        text: Raw extracted text
        
    Returns:
        str: Cleaned text with preserved layout
    """
    if not text:
        return ""
    
    # Normalize line endings only
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove excessive blank lines (more than 3 consecutive)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    
    # Remove trailing whitespace from each line (but preserve leading spaces/indentation)
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove non-printable characters except newlines, tabs, and spaces
    text = re.sub(r'[^\x20-\x7E\n\t\u0080-\uFFFF]+', '', text)
    
    # Trim overall leading/trailing whitespace
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


def text_to_pdf(text: str) -> bytes:
    """
    Convert text to PDF with preserved layout and formatting.
    Supports format markers: <<F:size=14,bold=1>>text<</F>>
    
    Args:
        text: Text content to convert to PDF (may contain format markers)
        
    Returns:
        bytes: PDF file as bytes
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation. Install with: pip install reportlab")
    
    buffer = BytesIO()
    
    # Create PDF with A4 page size
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Set up margins and text positioning
    margin_left = 50
    margin_right = 50
    margin_top = 50
    margin_bottom = 50
    
    max_width = width - margin_left - margin_right
    
    # Starting position
    y = height - margin_top
    
    # Split text into lines
    lines = text.split('\n')
    
    for line in lines:
        # Calculate line height based on max font size in the line
        max_font_size = _get_max_font_size_in_line(line)
        line_height = max_font_size * 1.2  # 120% of font size for spacing
        
        # Check if we need a new page
        if y < margin_bottom + line_height:
            pdf.showPage()
            y = height - margin_top
        
        # Parse line for format markers and render with formatting
        _render_line_with_formatting(pdf, line, margin_left, y, max_width)
        y -= line_height
    
    # Save PDF
    pdf.save()
    
    # Get PDF bytes
    buffer.seek(0)
    return buffer.getvalue()


def _get_max_font_size_in_line(line: str) -> float:
    """Get the maximum font size used in a line."""
    import re
    max_size = 10  # default
    
    # Find all format markers
    for match in re.finditer(r'<<F:size=(\d+)', line):
        size = int(match.group(1))
        max_size = max(max_size, size)
    
    return max_size

def _render_line_with_formatting(pdf, line, x, y, max_width):
    """
    Render a line of text with formatting support (font size, bold).
    Parses markers like: <<F:size=14,bold=1>>text<</F>>
    
    Args:
        pdf: ReportLab canvas object
        line: Text line (may contain <<F:...>>text<</F>> markers)
        x: X position to start rendering
        y: Y position to render at
        max_width: Maximum width for text
    """
    import re
    
    # Pattern: <<F:size=(\d+),bold=(\d+)>>(.*?)<</F>>
    format_pattern = re.compile(r'<<F:size=(\d+),bold=(\d+)>>(.*?)<</F>>')
    
    parts = []
    current_pos = 0
    
    for match in format_pattern.finditer(line):
        # Add text before formatted section (if any) - use default formatting
        if match.start() > current_pos:
            parts.append({
                'text': line[current_pos:match.start()],
                'size': 10,
                'bold': False
            })
        
        # Add formatted section
        size = int(match.group(1))
        bold = int(match.group(2)) == 1
        text = match.group(3)
        
        parts.append({
            'text': text,
            'size': size,
            'bold': bold
        })
        
        current_pos = match.end()
    
    # Add remaining text after last formatted section
    if current_pos < len(line):
        parts.append({
            'text': line[current_pos:],
            'size': 10,
            'bold': False
        })
    
    # If no format markers found, render as normal
    if not parts:
        pdf.setFont("Courier", 10)
        pdf.drawString(x, y, line)
        return
    
    # Render each part with appropriate font
    current_x = x
    for part in parts:
        text = part['text']
        size = part['size']
        bold = part['bold']
        
        if not text:
            continue
        
        # Choose font based on bold
        if bold:
            font_name = "Courier-Bold"
        else:
            font_name = "Courier"
        
        pdf.setFont(font_name, size)
        
        # Check if text fits
        text_width = pdf.stringWidth(text, font_name, size)
        if current_x + text_width > x + max_width:
            # Text wrapping needed - for simplicity, just render what fits
            pass
        
        pdf.drawString(current_x, y, text)
        current_x += text_width

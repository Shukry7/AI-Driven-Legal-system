"""
FastAPI routes for PDF processing and clause detection.
Migrated from Flask to consolidate all endpoints into FastAPI.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
import logging
import os
import json
import datetime
import re
from pathlib import Path
from io import BytesIO

# Import services from the app directory
import sys
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from app.services.pdf_service import pdf_bytes_to_text, text_to_pdf, strip_bold_markers
from app.services.clause_detection_service import analyze_clause_detection
from app.services.clause_patterns import CLAUSE_DEFINITIONS
from app.services.corruption_detection_service import detect_corruptions

logger = logging.getLogger(__name__)

router = APIRouter()

# Get uploads directory path
UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def secure_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent directory traversal attacks.
    Similar to werkzeug.utils.secure_filename.
    """
    # Remove any path components
    filename = os.path.basename(filename)
    # Replace unsafe characters with underscores
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    # Remove leading/trailing whitespace and dots
    filename = filename.strip().strip('.')
    # Collapse multiple underscores
    filename = re.sub(r'_+', '_', filename)
    return filename or 'unnamed'


class TextSaveRequest(BaseModel):
    """Request model for saving text."""
    filename: str
    content: str


class PDFGenerateRequest(BaseModel):
    """Request model for PDF generation."""
    text: str
    filename: Optional[str] = "document_completed.pdf"


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Receive a PDF file and return extracted text.
    
    - Saves the original PDF into `uploads/` directory
    - Converts PDF bytes to cleaned text using pdf_service
    - Returns JSON with success, preview, full_text, and file paths
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No selected file")
    
    filename = secure_filename(file.filename)
    saved_path = UPLOADS_DIR / filename
    
    try:
        # Read and save file
        file_bytes = await file.read()
        logger.info(f"upload-pdf: received file={filename} size={len(file_bytes)}")
        
        with open(saved_path, 'wb') as f:
            f.write(file_bytes)
        logger.info(f"upload-pdf: saved PDF to {saved_path}")
        
        # Write metadata with upload timestamp
        try:
            meta = {
                'filename': filename,
                'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
            }
            with open(str(saved_path) + '.meta.json', 'w', encoding='utf-8') as m:
                json.dump(meta, m)
        except Exception as e:
            logger.exception(f'upload-pdf: failed to write metadata for {saved_path}')
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to save uploaded file: {e}')
    
    # Extract text from PDF
    ok, result = pdf_bytes_to_text(file_bytes)
    extracted_text = None
    
    if not ok:
        logger.info(f"upload-pdf: initial extraction failed: {result}; attempting OCR fallback")
        try:
            from app.services.pdf_service import _ocr_fallback
            ocr_ok, ocr_result = _ocr_fallback(file_bytes)
        except Exception as e:
            ocr_ok, ocr_result = False, str(e)
        
        if not ocr_ok:
            raise HTTPException(
                status_code=500, 
                detail=f'Extraction failed: {result}; OCR fallback failed: {ocr_result}'
            )
        
        extracted_text = ocr_result
        logger.info(f"upload-pdf: OCR fallback succeeded, extracted length={len(extracted_text)}")
    else:
        extracted_text = result
        logger.info(f"upload-pdf: completed text extraction length={len(extracted_text)}")
    
    # Save extracted text to a .txt file beside the PDF
    txt_path = str(saved_path) + '.txt'
    try:
        with open(txt_path, 'w', encoding='utf-8') as t:
            t.write(extracted_text)
        logger.info(f"upload-pdf: saved extracted text to {txt_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to save extracted text: {e}')
    
    # Keep bold markers in the response - frontend will handle display
    preview = extracted_text[:2000]
    
    return JSONResponse(content={
        'success': True,
        'preview': preview,
        'full_text': extracted_text,
        'full_text_path': txt_path
    })


@router.post("/analyze-clauses")
async def analyze_clauses(
    file: Optional[UploadFile] = File(None),
    filename: Optional[str] = Form(None),
    original_filename: Optional[str] = Form(None)
):
    """
    Complete endpoint for clause detection in legal judgments.
    
    This endpoint:
    1. Receives a PDF file (Supreme Court judgment) OR references an existing file
    2. Extracts and cleans text from the PDF
    3. Analyzes the text for 28 predefined legal clauses
    4. Returns structured results with clause status
    
    Supports two modes:
    - Direct file upload (multipart/form-data with 'file')
    - Reference to existing file via 'filename' form field
    """
    extracted_text = None
    saved_pdf_path = None
    txt_path = None
    file_name = None
    
    # Mode 1: Direct file upload
    if file and file.filename:
        # Use provided original_filename or filename form field, fallback to uploaded filename
        save_name = secure_filename(original_filename or filename or file.filename)
        file_name = save_name
        saved_pdf_path = UPLOADS_DIR / save_name
        
        try:
            file_bytes = await file.read()
            with open(saved_pdf_path, 'wb') as f:
                f.write(file_bytes)
            logger.info(f"analyze-clauses: saved uploaded PDF to {saved_pdf_path}")
            
            # Write metadata
            try:
                meta = {
                    'filename': save_name,
                    'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                with open(str(saved_pdf_path) + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta, m)
            except Exception:
                logger.exception(f'analyze-clauses: failed to write metadata for {saved_pdf_path}')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to save uploaded PDF: {e}')
        
        # Extract text from PDF
        ok, result = pdf_bytes_to_text(file_bytes)
        if not ok:
            raise HTTPException(status_code=500, detail=f'PDF text extraction failed: {result}')
        
        extracted_text = result
        logger.info(f"analyze-clauses: completed text extraction length={len(extracted_text)}")
        
        # Save extracted text
        txt_path = str(saved_pdf_path) + '.txt'
        try:
            with open(txt_path, 'w', encoding='utf-8') as t:
                t.write(extracted_text)
            logger.info(f"analyze-clauses: saved extracted text to {txt_path}")
            
            # Write metadata for text file
            try:
                meta_txt = {
                    'filename': os.path.basename(txt_path),
                    'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                with open(txt_path + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta_txt, m)
            except Exception:
                logger.exception(f'analyze-clauses: failed to write metadata for {txt_path}')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to save extracted text: {str(e)}')
    
    # Mode 2: Reference to existing file
    elif filename:
        if not filename.strip():
            raise HTTPException(status_code=400, detail='please upload document to start analysis')
        
        file_name = secure_filename(filename)
        candidate_path = UPLOADS_DIR / file_name
        
        # Security check - ensure file is within uploads directory
        try:
            candidate_path.resolve().relative_to(UPLOADS_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid filename or path')
        
        if not candidate_path.exists():
            raise HTTPException(status_code=404, detail=f'File not found: {file_name}')
        
        # Expect a .txt file previously produced by /upload-pdf
        if not file_name.lower().endswith('.txt'):
            raise HTTPException(
                status_code=400, 
                detail='analyze-clauses expects a .txt filename previously generated by /upload-pdf'
            )
        
        try:
            with open(candidate_path, 'r', encoding='utf-8') as t:
                extracted_text = t.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to read text file: {e}')
        
        saved_pdf_path = None
        txt_path = str(candidate_path)
        logger.info(f"analyze-clauses: using existing text file {txt_path} (len={len(extracted_text)})")
    
    else:
        raise HTTPException(status_code=400, detail="No file uploaded and no 'filename' provided.")
    
    # Analyze clauses
    try:
        logger.info("analyze-clauses: starting clause analysis")
        clause_analysis = analyze_clause_detection(extracted_text)
        
        # Run corruption detection heuristics
        try:
            corruptions = detect_corruptions(extracted_text)
        except Exception as e:
            logger.exception('corruption detection failed')
            corruptions = []
        
        logger.info("analyze-clauses: clause analysis completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Clause analysis failed: {str(e)}')
    
    # Return structured response
    response = {
        'success': True,
        'filename': file_name,
        'saved_pdf_path': str(saved_pdf_path) if saved_pdf_path else None,
        'saved_text_path': txt_path,
        'text_preview': extracted_text[:500] + '...' if len(extracted_text) > 500 else extracted_text,
        'full_text': extracted_text,
        'clause_analysis': clause_analysis,
        'corruptions': corruptions
    }
    
    # Log summary
    stats = clause_analysis.get('statistics', {}) if isinstance(clause_analysis, dict) else {}
    logger.info(
        f"analyze-clauses: finished; total_clauses={stats.get('total_clauses')} "
        f"present={stats.get('present')} missing={stats.get('missing')}"
    )
    
    return JSONResponse(content=response)


@router.get("/clauses/list")
async def list_clauses():
    """
    Get the list of all 28 predefined legal clauses.
    
    Returns the complete list of clauses that the system
    will detect in Supreme Court judgment documents.
    """
    clause_list = [
        {
            "key": key,
            "name": info["name"],
            "description": info["description"]
        }
        for key, info in CLAUSE_DEFINITIONS.items()
    ]
    
    return JSONResponse(content={
        'success': True,
        'total_clauses': len(clause_list),
        'clauses': clause_list
    })


@router.post("/save-text")
async def save_text(data: TextSaveRequest):
    """
    Save/overwrite an extracted .txt file in the uploads directory.
    
    Expects JSON body: { "filename": "somefile.pdf.txt", "content": "...text..." }
    Returns { success: true } on success
    """
    filename = data.filename
    content = data.content
    
    if not filename or not isinstance(filename, str):
        raise HTTPException(status_code=400, detail='filename is required')
    
    if not content or not isinstance(content, str):
        raise HTTPException(status_code=400, detail='content is required')
    
    # Only allow .txt files
    if not filename.lower().endswith('.txt'):
        raise HTTPException(status_code=400, detail='Only .txt files may be saved via this endpoint')
    
    candidate_path = UPLOADS_DIR / filename
    
    # Security check - ensure file is within uploads directory
    try:
        candidate_path.resolve().relative_to(UPLOADS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid filename or path')
    
    try:
        with open(candidate_path, 'w', encoding='utf-8') as f:
            f.write(content)
        logger.info(f"save-text: updated {candidate_path}")
        return JSONResponse(content={'success': True})
    except Exception as e:
        logger.exception('Failed to write text file')
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-pdf")
async def generate_pdf(data: PDFGenerateRequest):
    """
    Generate a PDF from modified text content.
    
    Expects JSON: { "text": "...", "filename": "..." }
    Returns: PDF file as binary download
    """
    try:
        text = data.text
        filename = data.filename
        
        # Generate PDF from text
        pdf_bytes = text_to_pdf(text)
        
        logger.info(f"generate-pdf: created PDF, size={len(pdf_bytes)} bytes for filename={filename}")
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.exception('generate-pdf failed')
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uploads/recent")
async def recent_uploads():
    """
    Return the most recent .txt uploaded/extracted files (most recent first).
    
    Response: { success: true, files: [ { filename, mtime, iso_timestamp } ] }
    """
    try:
        UPLOADS_DIR.mkdir(exist_ok=True)
        entries = []
        
        for path in UPLOADS_DIR.glob("*.txt"):
            try:
                mtime = path.stat().st_mtime
                entries.append((path.name, mtime))
            except Exception:
                continue
        
        # Sort by mtime desc and take first 4
        entries.sort(key=lambda e: e[1], reverse=True)
        recent = []
        
        for name, mtime in entries[:4]:
            recent.append({
                'filename': name,
                'mtime': mtime,
                'iso_timestamp': datetime.datetime.fromtimestamp(mtime).isoformat()
            })
        
        return JSONResponse(content={'success': True, 'files': recent})
    except Exception as e:
        logger.exception('recent_uploads failed')
        raise HTTPException(status_code=500, detail=str(e))

"""
FastAPI routes for clause detection in legal documents.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
import json
import datetime
import re

# Custom secure_filename function
def secure_filename(filename: str) -> str:
    """Make a filename safe for filesystem use."""
    # Remove any directory components
    filename = os.path.basename(filename)
    # Replace problematic characters
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Remove leading dots and dashes
    filename = filename.lstrip('.-')
    return filename or 'unnamed'

# Import services from app directory (shared services)
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.services.pdf_service import pdf_bytes_to_text
from app.services.clause_detection_service import analyze_clause_detection
from app.services.clause_patterns import CLAUSE_DEFINITIONS
from app.services.corruption_detection_service import detect_corruptions

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class ClauseInfo(BaseModel):
    """Model for clause information."""
    key: str
    name: str
    description: str


class ClauseListResponse(BaseModel):
    """Response model for clause list."""
    success: bool
    total_clauses: int
    clauses: List[ClauseInfo]


class ClauseAnalysisResponse(BaseModel):
    """Response model for clause analysis."""
    success: bool
    filename: str
    saved_pdf_path: Optional[str]
    saved_text_path: Optional[str]
    text_preview: str
    full_text: str
    clause_analysis: Dict[str, Any]
    corruptions: List[Dict[str, Any]]


@router.get("/clauses/list", response_model=ClauseListResponse)
async def list_clauses():
    """
    Get the list of all predefined legal clauses.
    
    This endpoint returns the complete list of clauses that the system
    will detect in Supreme Court judgment documents.
    
    Returns:
        ClauseListResponse with all clause definitions
    """
    clause_list = [
        ClauseInfo(
            key=key,
            name=info["name"],
            description=info["description"]
        )
        for key, info in CLAUSE_DEFINITIONS.items()
    ]
    
    return ClauseListResponse(
        success=True,
        total_clauses=len(clause_list),
        clauses=clause_list
    )


@router.post("/analyze-clauses")
async def analyze_clauses(
    file: Optional[UploadFile] = File(None),
    original_filename: Optional[str] = Form(None),
    filename: Optional[str] = Form(None)
):
    """
    Complete endpoint for clause detection in legal judgments.
    
    This endpoint:
    1. Receives a PDF file (Supreme Court judgment)
    2. Extracts and cleans text from the PDF
    3. Analyzes the text for predefined legal clauses
    4. Returns structured results with clause status
    
    Args:
        file: PDF file upload
        original_filename: Optional custom filename for saving
        filename: For referencing existing files in uploads/
        
    Returns:
        JSON with clause analysis results
    """
    # Determine uploads directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    uploads_dir = os.path.join(backend_dir, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)

    extracted_text = None
    saved_pdf_path = None
    txt_path = None
    result_filename = None

    # Mode 1: File upload
    if file is not None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file has no filename")

        # Use provided filename or fall back to uploaded filename
        save_name = secure_filename(original_filename or filename or file.filename)
        result_filename = save_name
        saved_pdf_path = os.path.join(uploads_dir, save_name)

        try:
            # Read and save PDF
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
                with open(saved_pdf_path + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta, m)
            except Exception as e:
                logger.exception(f'Failed to write metadata: {e}')

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded PDF: {e}")

        # Extract text from PDF
        ok, result = pdf_bytes_to_text(file_bytes)
        if not ok:
            raise HTTPException(status_code=500, detail=f"PDF text extraction failed: {result}")

        extracted_text = result
        logger.info(f"analyze-clauses: completed text extraction length={len(extracted_text)}")

        # Save extracted text
        txt_path = saved_pdf_path + '.txt'
        try:
            with open(txt_path, 'w', encoding='utf-8') as t:
                t.write(extracted_text)
            logger.info(f"analyze-clauses: saved extracted text to {txt_path}")
            
            # Write text metadata
            try:
                meta_txt = {
                    'filename': os.path.basename(txt_path),
                    'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                with open(txt_path + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta_txt, m)
            except Exception:
                logger.exception(f'Failed to write text metadata')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save extracted text: {e}")

    else:
        # Mode 2: Reference to existing file
        if not filename:
            raise HTTPException(
                status_code=400, 
                detail="No file uploaded and no 'filename' provided."
            )

        if not filename.strip():
            raise HTTPException(
                status_code=400, 
                detail="Please upload document to start analysis"
            )

        result_filename = secure_filename(filename)
        candidate_path = os.path.abspath(os.path.join(uploads_dir, result_filename))
        uploads_dir_abs = os.path.abspath(uploads_dir)
        
        # Security check
        if not (candidate_path == uploads_dir_abs or candidate_path.startswith(uploads_dir_abs + os.sep)):
            raise HTTPException(status_code=400, detail="Invalid filename or path")

        if not os.path.exists(candidate_path):
            raise HTTPException(status_code=404, detail=f"File not found: {result_filename}")

        # Expect a text file
        if not result_filename.lower().endswith('.txt'):
            raise HTTPException(
                status_code=400, 
                detail="analyze-clauses expects a .txt filename previously generated"
            )

        try:
            with open(candidate_path, 'r', encoding='utf-8') as t:
                extracted_text = t.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read text file: {e}")

        saved_pdf_path = None
        txt_path = candidate_path
        logger.info(f"analyze-clauses: using existing text file {txt_path} (len={len(extracted_text)})")
    
    # Analyze clauses
    try:
        logger.info("analyze-clauses: starting clause analysis")
        clause_analysis = analyze_clause_detection(extracted_text)
        
        # Run corruption detection
        try:
            corruptions = detect_corruptions(extracted_text)
        except Exception as e:
            logger.exception('Corruption detection failed')
            corruptions = []
            
        logger.info("analyze-clauses: clause analysis completed")
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Clause analysis failed: {str(e)}"
        )
    
    # Build response
    text_preview = extracted_text[:500] + '...' if len(extracted_text) > 500 else extracted_text
    
    response = {
        'success': True,
        'filename': result_filename,
        'saved_pdf_path': saved_pdf_path,
        'saved_text_path': txt_path,
        'text_preview': text_preview,
        'full_text': extracted_text,
        'clause_analysis': clause_analysis,
        'corruptions': corruptions
    }
    
    # Log summary
    try:
        stats = clause_analysis.get('statistics', {}) if isinstance(clause_analysis, dict) else {}
        logger.info(
            f"analyze-clauses: finished; total_clauses={stats.get('total_clauses')} "
            f"present={stats.get('present')} missing={stats.get('missing')}"
        )
    except Exception:
        pass
    
    return JSONResponse(content=response, status_code=200)


@router.get("/health")
async def health_check():
    """Health check endpoint for clause detection service."""
    return {
        "status": "ok",
        "service": "clause_detection",
        "clauses_available": len(CLAUSE_DEFINITIONS)
    }

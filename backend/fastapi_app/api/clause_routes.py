"""
FastAPI routes for clause detection in legal documents.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
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
from app.services.clause_prediction_service import (
    predict_missing_clauses,
    get_prediction_mode,
    get_predictable_clause_list,
    detect_missing_predictable_clauses,
    PREDICTABLE_CLAUSES,
)
from app.services.suggestion_storage_service import (
    save_suggestion_decision,
    get_all_decisions,
    get_accepted_suggestions,
    clear_suggestions,
)

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
    
    # Auto-mode: run LLM prediction automatically if configured
    predictions = None
    prediction_mode = get_prediction_mode()
    if prediction_mode == "auto":
        try:
            logger.info("analyze-clauses: auto-mode — running LLM prediction")
            predictions = await predict_missing_clauses(extracted_text)
            logger.info(f"analyze-clauses: auto predictions done, source={predictions.get('source')}")
        except Exception as e:
            logger.exception(f"analyze-clauses: auto prediction failed (non-fatal): {e}")
            predictions = None

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
        'corruptions': corruptions,
        'prediction_mode': prediction_mode,
        'predictions': predictions,
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


# ─── Clause Prediction Endpoints ──────────────────────────────────────────────


@router.post("/predict-clauses")
async def predict_clauses(
    filename: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    force_refresh: bool = Form(False),
):
    """
    Generate AI suggestions for missing clauses using LLM.
    
    This is the "manual" mode endpoint - user clicks "Get AI Suggestions"
    after seeing the initial clause detection results.
    
    Can receive either:
    - A file upload (PDF)
    - A filename reference to an existing .txt in uploads/
    
    The service:
    1. Detects which predictable clauses are missing (separate regex scan)
    2. Extracts relevant context from the document
    3. Sends batched request to OpenAI GPT
    4. Returns structured suggestions with confidence scores
    5. Caches results to avoid redundant LLM calls
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    uploads_dir = os.path.join(backend_dir, 'uploads')
    extracted_text = None

    # Mode 1: File upload
    if file is not None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file has no filename")
        try:
            file_bytes = await file.read()
            ok, result = pdf_bytes_to_text(file_bytes)
            if not ok:
                raise HTTPException(status_code=500, detail=f"PDF text extraction failed: {result}")
            extracted_text = result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")
    # Mode 2: Existing text file
    elif filename:
        safe_name = secure_filename(filename)
        # Ensure it's a .txt file
        if not safe_name.lower().endswith('.txt'):
            safe_name = safe_name + '.txt'
        candidate = os.path.abspath(os.path.join(uploads_dir, safe_name))
        uploads_dir_abs = os.path.abspath(uploads_dir)
        if not (candidate == uploads_dir_abs or candidate.startswith(uploads_dir_abs + os.sep)):
            raise HTTPException(status_code=400, detail="Invalid filename")
        if not os.path.exists(candidate):
            raise HTTPException(status_code=404, detail=f"Text file not found: {safe_name}")
        try:
            with open(candidate, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read text file: {e}")
    else:
        raise HTTPException(status_code=400, detail="No file or filename provided")

    if not extracted_text or len(extracted_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Document text too short for prediction")

    # Run prediction
    try:
        logger.info(f"predict-clauses: starting LLM prediction (force_refresh={force_refresh})")
        predictions = await predict_missing_clauses(extracted_text, force_refresh=force_refresh)
        logger.info(
            f"predict-clauses: completed. "
            f"missing={predictions.get('total_missing', 0)}, "
            f"source={predictions.get('source', 'unknown')}"
        )
        return JSONResponse(content={
            "success": True,
            **predictions
        })
    except Exception as e:
        logger.exception(f"predict-clauses: prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Clause prediction failed: {str(e)}")


@router.get("/prediction-config")
async def get_prediction_config():
    """
    Get current clause prediction configuration.
    
    Returns:
    - mode: "auto" or "manual"
    - predictable_clauses: list of all predictable clause definitions
    - llm_configured: whether OpenAI API key is set
    """
    import os as _os
    return {
        "mode": get_prediction_mode(),
        "llm_configured": bool(_os.getenv("OPENAI_API_KEY", "").strip() and _os.getenv("OPENAI_API_KEY", "") != "your-openai-api-key-here"),
        "model": _os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "predictable_clauses": get_predictable_clause_list(),
        "total_predictable": len(PREDICTABLE_CLAUSES),
    }


@router.post("/accept-suggestion")
async def accept_suggestion(
    filename: str = Form(...),
    clause_key: str = Form(...),
    suggestion_text: str = Form(...),
    status: str = Form(...),  # "accepted", "rejected", "edited"
    confidence: Optional[float] = Form(None),
    edited_text: Optional[str] = Form(None)
):
    """
    Save user's decision on a clause suggestion.
    
    Args:
        filename: The document filename
        clause_key: The clause identifier (e.g., "judge_names")
        suggestion_text: The original LLM suggestion
        status: "accepted", "rejected", or "edited"
        confidence: Optional confidence score
        edited_text: Optional user-edited version
    """
    try:
        decision = save_suggestion_decision(
            filename=filename,
            clause_key=clause_key,
            suggestion_text=suggestion_text,
            status=status,
            confidence=confidence,
            edited_text=edited_text
        )
        
        logger.info(f"Saved suggestion decision for {filename}/{clause_key}: {status}")
        
        return {
            "success": True,
            "decision": decision,
            "message": f"Suggestion {status}"
        }
    except Exception as e:
        logger.error(f"Error saving suggestion decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestion-decisions/{filename}")
async def get_suggestion_decisions(filename: str):
    """
    Get all stored suggestion decisions for a document.
    """
    try:
        decisions = get_all_decisions(filename)
        return {
            "filename": filename,
            "decisions": decisions,
            "total": len(decisions)
        }
    except Exception as e:
        logger.error(f"Error retrieving suggestion decisions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finalize-document")
async def finalize_document(filename: str = Form(...)):
    """
    Generate final document with all accepted clause suggestions inserted.
    Returns the modified text content.
    """
    try:
        from app.services.document_finalization_service import finalize_document_with_suggestions
        
        result = await finalize_document_with_suggestions(filename)
        
        logger.info(f"Finalized document {filename} with {result['inserted_count']} suggestions")
        
        return result
    except Exception as e:
        logger.error(f"Error finalizing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-document/{filename}")
async def download_document(filename: str):
    """
    Download the finalized document with accepted suggestions.
    
    Args:
        filename: The finalized document filename
    """
    try:
        from pathlib import Path
        
        # Get the upload folder path
        upload_folder = Path(__file__).parent.parent.parent.parent / "uploads"
        file_path = upload_folder / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
        logger.info(f"Downloading finalized document: {filename}")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint for clause detection service."""
    return {
        "status": "ok",
        "service": "clause_detection",
        "clauses_available": len(CLAUSE_DEFINITIONS),
        "prediction_mode": get_prediction_mode(),
        "predictable_clauses": len(PREDICTABLE_CLAUSES),
    }

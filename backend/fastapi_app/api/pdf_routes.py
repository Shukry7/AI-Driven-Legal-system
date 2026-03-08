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

from app.services.pdf_service import pdf_bytes_to_text, pdf_bytes_to_dual_text, text_to_pdf, strip_bold_markers
from app.services.clause_detection_service import analyze_clause_detection
from app.services.hybrid_clause_detection_service import analyze_with_hybrid_detection
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
        
        # Metadata will be created after text extraction (see below)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to save uploaded file: {e}')
    
    # Extract text from PDF (dual version - tagged and clean)
    ok, result = pdf_bytes_to_dual_text(file_bytes)
    
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
        
        # OCR doesn't produce formatting, so use same for both
        extracted_tagged = ocr_result
        extracted_clean = strip_bold_markers(ocr_result)
        logger.info(f"upload-pdf: OCR fallback succeeded, extracted length={len(extracted_clean)}")
    else:
        extracted_tagged = result['tagged']
        extracted_clean = result['clean']
        logger.info(f"upload-pdf: completed text extraction - tagged: {len(extracted_tagged)}, clean: {len(extracted_clean)}")
    
    # Save both versions to separate files
    # Tagged version: filename.pdf.tagged.txt (master version with formatting)
    # Clean version: filename.pdf.clean.txt (for UI and analysis)
    
    tagged_path = str(saved_path) + '.tagged.txt'
    clean_path = str(saved_path) + '.clean.txt'
    
    try:
        # Save tagged version
        with open(tagged_path, 'w', encoding='utf-8') as t:
            t.write(extracted_tagged)
        logger.info(f"upload-pdf: saved tagged text to {tagged_path}")
        
        # Save clean version
        with open(clean_path, 'w', encoding='utf-8') as c:
            c.write(extracted_clean)
        logger.info(f"upload-pdf: saved clean text to {clean_path}")
        
        # IMPORTANT: Create .original backup of clean version
        # This preserves the original state before any user edits
        # Used by document finalization service to detect changes
        original_clean_path = clean_path + '.original'
        with open(original_clean_path , 'w', encoding='utf-8') as o:
            o.write(extracted_clean)
        logger.info(f"upload-pdf: created original backup at {original_clean_path}")
        
        # Create ONE consolidated metadata file for the PDF
        # Tracks all artifacts created for this upload
        meta = {
            'filename': filename,
            'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z',
            'artifacts': [
                os.path.basename(clean_path),
                os.path.basename(original_clean_path),
                os.path.basename(tagged_path)
            ]
        }
        meta_path = str(saved_path) + '.meta.json'
        try:
            with open(meta_path, 'w', encoding='utf-8') as m:
                json.dump(meta, m)
            logger.info(f"upload-pdf: created consolidated metadata at {meta_path}")
        except Exception as e:
            logger.exception(f'upload-pdf: failed to write metadata')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to save extracted text: {e}')
    
    # Return clean version for preview (user-friendly)
    preview = extracted_clean[:2000]
    
    return JSONResponse(content={
        'success': True,
        'preview': preview,
        'full_text': extracted_clean,  # UI receives clean version
        'full_text_path': clean_path,  # Point to clean version
        'tagged_text_path': tagged_path  # Also provide tagged path for reference
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
            
            # Metadata will be created after text extraction (see below)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to save uploaded PDF: {e}')
        
        # Extract text from PDF (dual version)
        ok, result = pdf_bytes_to_dual_text(file_bytes)
        if not ok:
            raise HTTPException(status_code=500, detail=f'PDF text extraction failed: {result}')
        
        extracted_tagged = result['tagged']
        extracted_clean = result['clean']
        logger.info(f"analyze-clauses: completed text extraction - tagged: {len(extracted_tagged)}, clean: {len(extracted_clean)}")
        
        # Save both versions
        tagged_path = str(saved_pdf_path) + '.tagged.txt'
        clean_path = str(saved_pdf_path) + '.clean.txt'
        
        try:
            # Save tagged version (master with formatting)
            with open(tagged_path, 'w', encoding='utf-8') as t:
                t.write(extracted_tagged)
            logger.info(f"analyze-clauses: saved tagged text to {tagged_path}")
            
            # Save clean version (for analysis and UI)
            with open(clean_path, 'w', encoding='utf-8') as c:
                c.write(extracted_clean)
            logger.info(f"analyze-clauses: saved clean text to {clean_path}")
            
            # Create .original backup if it doesn't exist
            original_clean_path = clean_path + '.original'
            if not os.path.exists(original_clean_path):
                with open(original_clean_path, 'w', encoding='utf-8') as o:
                    o.write(extracted_clean)
            
            # Create ONE consolidated metadata file for the PDF
            meta = {
                'filename': save_name,
                'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z',
                'artifacts': [
                    os.path.basename(clean_path),
                    os.path.basename(original_clean_path),
                    os.path.basename(tagged_path)
                ]
            }
            meta_path = str(saved_pdf_path) + '.meta.json'
            try:
                with open(meta_path, 'w', encoding='utf-8') as m:
                    json.dump(meta, m)
                logger.info(f"analyze-clauses: created consolidated metadata at {meta_path}")
            except Exception:
                logger.exception(f'analyze-clauses: failed to write metadata')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to save extracted text: {str(e)}')
        
        txt_path = clean_path  # Use clean path for analysis
        extracted_text = extracted_clean  # Use clean text for analysis
    
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
        
        # Expect a .clean.txt file (or legacy .txt) previously produced by /upload-pdf
        # We use the clean version for analysis
        if file_name.lower().endswith('.clean.txt'):
            # New dual-file system
            clean_path = candidate_path
            tagged_path = UPLOADS_DIR / file_name.replace('.clean.txt', '.tagged.txt')
        elif file_name.lower().endswith('.txt'):
            # Legacy single file or explicitly requesting analysis on any .txt
            clean_path = candidate_path
            # Try to find tagged version if it exists
            base_name = str(candidate_path)[:-4]  # Remove .txt
            tagged_path = Path(base_name + '.tagged.txt')
            if not tagged_path.exists():
                # Legacy single file - treat as clean
                tagged_path = None
        else:
            raise HTTPException(
                status_code=400, 
                detail='analyze-clauses expects a .clean.txt or .txt filename'
            )
        
        try:
            with open(clean_path, 'r', encoding='utf-8') as t:
                extracted_text = t.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Failed to read text file: {e}')
        
        saved_pdf_path = None
        txt_path = str(clean_path)
        logger.info(f"analyze-clauses: using existing clean text file {txt_path} (len={len(extracted_text)})")
    
    else:
        raise HTTPException(status_code=400, detail="No file uploaded and no 'filename' provided.")
    
    # Analyze clauses with hybrid detection (ML + Regex)
    try:
        logger.info("analyze-clauses: starting HYBRID clause analysis (ML + Regex)")
        clause_analysis = analyze_with_hybrid_detection(extracted_text)
        
        # Run corruption detection heuristics
        try:
            corruptions = detect_corruptions(extracted_text)
        except Exception as e:
            logger.exception('corruption detection failed')
            corruptions = []
        
        logger.info(f"analyze-clauses: hybrid analysis completed - method={clause_analysis.get('method')}")
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
    
    Note: In the dual-file system, users edit the CLEAN version.
    This endpoint saves the clean version. The tagged version remains unchanged
    until document finalization, where changes are merged back.
    
    Expects JSON body: { "filename": "somefile.pdf.clean.txt", "content": "...text..." }
    Returns { success: true } on success
    """
    filename = data.filename
    content = data.content
    
    if not filename or not isinstance(filename, str):
        raise HTTPException(status_code=400, detail='filename is required')
    
    if not content or not isinstance(content, str):
        raise HTTPException(status_code=400, detail='content is required')
    
    # Only allow .txt files (including .clean.txt and .tagged.txt)
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
    Generate a PDF from text content.
    
    IMPORTANT: For formatted PDF with preserved bold/font sizes, pass the TAGGED version text.
    For plain text PDF, pass the clean version.
    
    Expects JSON: { "text": "...", "filename": "..." }
    Returns: PDF file as binary download
    """
    try:
        text = data.text
        filename = data.filename
        
        # Generate PDF from text (supports formatting markers <<F:...>>)
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


@router.post("/download-formatted-pdf")
async def download_formatted_pdf(filename: str = Form(...)):
    """
    Download PDF from the TAGGED version (preserves formatting).
    
    Use this for downloading the original document as PDF with formatting preserved.
    Does NOT apply any edits - just converts the tagged text to PDF.
    
    Args:
        filename: The uploaded file identifier (e.g., "case.pdf" or "case.pdf.clean.txt")
        
    Returns:
        PDF file with preserved formatting (bold, font sizes, etc.)
    """
    try:
        # Determine the tagged file path
        base_name = filename.replace('.clean.txt', '').replace('.txt', '')
        tagged_filename = base_name + '.tagged.txt'
        tagged_path = UPLOADS_DIR / tagged_filename
        
        # Check if tagged file exists
        if not tagged_path.exists():
            # Try without .tagged suffix (legacy)
            alt_path = UPLOADS_DIR / (base_name + '.txt')
            if alt_path.exists():
                tagged_path = alt_path
            else:
                raise HTTPException(status_code=404, detail=f"Tagged text file not found: {tagged_filename}")
        
        # Read tagged text
        with open(tagged_path, 'r', encoding='utf-8') as f:
            tagged_text = f.read()
        
        logger.info(f"download-formatted-pdf: read tagged file {tagged_path}, length={len(tagged_text)}")
        
        # Generate PDF from tagged text (preserves formatting)
        pdf_bytes = text_to_pdf(tagged_text)
        
        # Create output filename
        output_filename = f"{base_name}.pdf"
        
        logger.info(f"download-formatted-pdf: generated PDF, size={len(pdf_bytes)} bytes")
        
        # Return PDF as download
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{output_filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'download-formatted-pdf failed for {filename}')
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finalize-and-download-pdf")
async def finalize_and_download_pdf(
    filename: str = Form(...),
    apply_suggestions: bool = Form(False)
):
    """
    ONE-STEP convenience endpoint: Finalize document + Generate formatted PDF.
    
    This endpoint:
    1. Finalizes the document (merges clean edits into tagged version)
    2. Optionally applies AI suggestions if apply_suggestions=True
    3. Generates PDF from the finalized TAGGED version (preserves formatting)
    4. Returns the formatted PDF for download
    
    Args:
        filename: Document filename (e.g., "case.pdf.clean.txt")
        apply_suggestions: If True, include accepted AI suggestions; if False, skip them (default: False)
        
    Returns:
        PDF file with preserved formatting (bold, font sizes, etc.)
    """
    try:
        from app.services.document_finalization_service import finalize_document_with_suggestions
        
        # Step 1: Finalize document (merge clean changes into tagged version)
        # IMPORTANT: By default, do NOT auto-insert AI suggestions unless explicitly requested
        # The document should only have user's manual edits, not AI suggestions (unless apply_suggestions=True)
        result = await finalize_document_with_suggestions(filename, skip_suggestions=(not apply_suggestions))
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail="Document finalization failed")
        
        # Step 2: Get the finalized TAGGED text (with formatting preserved)
        finalized_tagged_text = result.get('finalized_tagged_text')
        
        if not finalized_tagged_text:
            # Fallback to clean text if tagged not available
            logger.warning(f"No tagged version available for {filename}, using clean text")
            finalized_tagged_text = result.get('modified_text', '')
        
        # Step 3: Generate PDF from tagged version (preserves formatting)
        pdf_bytes = text_to_pdf(finalized_tagged_text)
        
        # Create output filename
        base_filename = filename.replace('.clean.txt', '').replace('.txt', '')
        output_filename = f"{base_filename}_final.pdf"
        
        logger.info(f"finalize-and-download-pdf: generated formatted PDF for {filename}, size={len(pdf_bytes)} bytes")
        
        # Return PDF as download
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{output_filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'finalize-and-download-pdf failed for {filename}')
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uploads/recent")
async def recent_uploads():
    """
    Return the most recent .txt uploaded/extracted files (most recent first).
    
    Response: { success: true, files: [ { filename, mtime, iso_timestamp } ] }
    """
    try:
        UPLOADS_DIR.mkdir(exist_ok=True)
        # Map PDF base names to the newest mtime among their .txt artifacts
        pdf_map = {}  # pdf_name -> mtime

        for path in UPLOADS_DIR.glob("*.txt"):
            try:
                mtime = path.stat().st_mtime
                name = path.name
                lower = name.lower()

                # Recognise dual-file system names like 'case.pdf.clean.txt' or 'case.pdf.tagged.txt'
                if lower.endswith('.clean.txt'):
                    pdf_name = name[:-10]  # strip '.clean.txt'
                elif lower.endswith('.tagged.txt'):
                    pdf_name = name[:-11]  # strip '.tagged.txt'
                else:
                    # Skip other .txt files that are not part of the PDF dual-file system
                    continue

                # Only include entries that map back to a .pdf filename
                if not pdf_name.lower().endswith('.pdf'):
                    continue

                # Keep the most recent mtime for a given pdf_name
                existing = pdf_map.get(pdf_name)
                if existing is None or mtime > existing:
                    pdf_map[pdf_name] = mtime
            except Exception:
                continue

        # Sort PDFs by mtime desc and take first 4
        sorted_pdfs = sorted(pdf_map.items(), key=lambda kv: kv[1], reverse=True)[:4]
        recent = []
        for pdf_name, mtime in sorted_pdfs:
            recent.append({
                'filename': pdf_name,
                'mtime': mtime,
                'iso_timestamp': datetime.datetime.fromtimestamp(mtime).isoformat()
            })

        return JSONResponse(content={'success': True, 'files': recent})
    except Exception as e:
        logger.exception('recent_uploads failed')
        raise HTTPException(status_code=500, detail=str(e))

# backend/fastapi_app/api/lineage_routes.py

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging
from pathlib import Path

from traitlets import Any

# Import your own PDF extraction function
from app.services.precedent_preprocessing_service import preprocess_judgment_for_lineage
from fastapi_app.services.lineage_analysis_service import analyze_judgment_lineage, is_model_loaded, load_processed_acts_data

router = APIRouter()
logger = logging.getLogger(__name__)

# Define the uploads folder path (relative to project root)
UPLOADS_FOLDER = Path(__file__).parent.parent.parent / "uploads"

# Pydantic models for request/response
class LineageAnalysisRequest(BaseModel):
    filename: str  # The name of the PDF file in the uploads folder

class ActTreatmentResult(BaseModel):
    case: str
    act: str
    treatment: str
    confidence: float

class LineageAnalysisResponse(BaseModel):
    filename: str
    results: List[ActTreatmentResult]
    message: Optional[str] = None

class ActSearchRequest(BaseModel):
    act_name: str
    min_similarity: Optional[float] = 0.6
    search_type: Optional[str] = "similar"  # "similar", "exact", "treatment", "year"

class ActSearchResult(BaseModel):
    file_id: str
    filename: str
    case_title: str
    year: Optional[int]
    act_name: str
    act_id: str
    treatment: str
    confidence: float
    similarity_score: Optional[float] = None
    context_preview: Optional[str] = None

class ActSearchResponse(BaseModel):
    query: str
    search_type: str
    total_results: int
    results: List[ActSearchResult]
    message: Optional[str] = None

def extract_text_from_pdf_like_notebook(pdf_path: Path) -> str:
    """
    Extract text from PDF exactly like your notebook does.
    Uses pymupdf (imported as pymupdf) just like in your notebook.
    """
    try:
        # Try to import pymupdf (exactly like your notebook)
        try:
            import pymupdf
            logger.info("Using pymupdf for PDF extraction")
        except ImportError:
            try:
                import fitz as pymupdf
                logger.info("Using fitz as pymupdf for PDF extraction")
            except ImportError:
                logger.error("PyMuPDF not installed")
                raise HTTPException(status_code=500, detail="PyMuPDF not installed. Please install with: pip install PyMuPDF")
        
        # Open the PDF (exactly like your notebook)
        logger.info(f"Opening PDF: {pdf_path}")
        doc = pymupdf.open(pdf_path)
        
        # Extract text from all pages (exactly like your notebook)
        text = ""
        for page in doc:
            text += page.get_text() + " "
        
        doc.close()
        
        # Clean the text exactly like your notebook's first step
        text = text.strip().replace("\n", " ")
        
        logger.info(f"✅ Extracted {len(text)} characters from PDF")
        return text
        
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")

@router.post("/lineage/analyze-lineage", response_model=LineageAnalysisResponse)
async def analyze_lineage(request: LineageAnalysisRequest):
    logger.info(f"Received lineage analysis request for file: {request.filename}")

    if not is_model_loaded():
        raise HTTPException(status_code=503, detail="Lineage analysis model is currently unavailable.")

    pdf_path = UPLOADS_FOLDER / request.filename
    
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"File {request.filename} not found in uploads folder.")
    
    # Extract text
    raw_text = extract_text_from_pdf_like_notebook(pdf_path)
    
    # DEBUG: Save the extracted text to a file for comparison
    debug_file = Path(__file__).parent.parent.parent / "debug_extracted_text.txt"
    with open(debug_file, "w", encoding="utf-8") as f:
        f.write(raw_text)
    logger.info(f"✅ Saved extracted text to {debug_file} for debugging")
    
    # Preprocess
    try:
        preprocessed_data = preprocess_judgment_for_lineage(raw_text)
        preprocessed_data["file_name"] = request.filename
        logger.info(f"Preprocessing complete. Found {len(preprocessed_data['acts_list'])} acts.")
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to preprocess document.")

    # Analyze
    try:
        analysis_results = analyze_judgment_lineage(preprocessed_data)
        logger.info(f"Analysis complete. Generated {len(analysis_results)} treatment entries.")
    except Exception as e:
        logger.error(f"Lineage analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Lineage analysis failed.")

    return LineageAnalysisResponse(
        filename=request.filename,
        results=[ActTreatmentResult(**res) for res in analysis_results],
        message="Analysis completed successfully."
    )

@router.post("/lineage/upload-and-analyze", response_model=LineageAnalysisResponse)
async def upload_and_analyze(file: UploadFile = File(...)):
    """
    Endpoint to upload a judgment PDF file, save it to uploads folder, extract text,
    and perform lineage analysis using your notebook's method.
    """
    logger.info(f"Received file upload for analysis: {file.filename}")

    # 1. Check model
    if not is_model_loaded():
        raise HTTPException(status_code=503, detail="Lineage analysis model is currently unavailable.")

    # 2. Ensure uploads folder exists
    UPLOADS_FOLDER.mkdir(exist_ok=True)
    
    # 3. Save the uploaded file to uploads folder
    file_path = UPLOADS_FOLDER / file.filename
    
    try:
        # Read the uploaded file content
        content = await file.read()
        
        # Save to uploads folder
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File saved to {file_path}")
        
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")
    
    # 4. Extract text from the saved PDF using your notebook's method
    try:
        raw_text = extract_text_from_pdf_like_notebook(file_path)
        
        if not raw_text or len(raw_text.strip()) == 0:
            # Clean up the saved file if text extraction fails
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
        
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        # Clean up the saved file
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")

    # 5. Preprocess the text
    try:
        preprocessed_data = preprocess_judgment_for_lineage(raw_text)
        preprocessed_data["file_name"] = file.filename
        logger.info(f"Preprocessing complete. Found {len(preprocessed_data['acts_list'])} acts.")
    except Exception as e:
        logger.error(f"Preprocessing failed for {file.filename}: {e}")
        # Clean up the saved file
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail="Failed to preprocess document.")

    # 6. Analyze
    try:
        analysis_results = analyze_judgment_lineage(preprocessed_data)
    except Exception as e:
        logger.error(f"Lineage analysis failed for {file.filename}: {e}")
        # Clean up the saved file
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail="Lineage analysis failed.")

    return LineageAnalysisResponse(
        filename=file.filename,
        results=[ActTreatmentResult(**res) for res in analysis_results],
        message="Analysis completed successfully."
    )

@router.post("/lineage/search-act", response_model=ActSearchResponse)
async def search_act(request: ActSearchRequest):
    """
    Search for acts similar to the given act name in the processed acts database.
    Returns all matching acts with their metadata.
    """
    logger.info(f"🔍 Received act search request: '{request.act_name}' (type: {request.search_type})")
    
    try:
        # Import the search functions
        from fastapi_app.services.lineage_analysis_service import (
            search_similar_acts,
            get_act_by_exact_name,
            get_acts_by_treatment
        )
        
        results = []
        
        # Perform search based on type
        if request.search_type == "exact":
            results = get_act_by_exact_name(request.act_name)
            # Convert to the same format as similar search
            formatted_results = []
            for r in results:
                formatted_results.append({
                    "file_id": r.get('file_id', ''),
                    "filename": r.get('filename', ''),
                    "case_title": r.get('case_title', ''),
                    "year": r.get('year'),
                    "act_name": r.get('act_name', ''),
                    "act_id": r.get('act_id', ''),
                    "treatment": r.get('treatment', ''),
                    "confidence": r.get('confidence', 0),
                    "similarity_score": 1.0  # Exact match
                })
            results = formatted_results
            
        elif request.search_type == "treatment":
            treatment_results = get_acts_by_treatment(request.act_name)
            results = []
            for r in treatment_results:
                results.append({
                    "file_id": r.get('file_id', ''),
                    "filename": r.get('filename', ''),
                    "case_title": r.get('case_title', ''),
                    "year": r.get('year'),
                    "act_name": r.get('act_name', ''),
                    "act_id": r.get('act_id', ''),
                    "treatment": r.get('treatment', ''),
                    "confidence": r.get('confidence', 0)
                })
                
        else:  # default to similar search
            similar_results = search_similar_acts(request.act_name, request.min_similarity)
            results = similar_results
        
        logger.info(f"✅ Search complete. Found {len(results)} matches")
        
        return ActSearchResponse(
            query=request.act_name,
            search_type=request.search_type,
            total_results=len(results),
            results=[ActSearchResult(**r) for r in results],
            message=f"Found {len(results)} matching acts"
        )
        
    except Exception as e:
        logger.error(f"❌ Error searching acts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search acts: {str(e)}")

# Optional: Add a route to get statistics about the processed data
class StatsResponse(BaseModel):
    total_files: int
    files_with_acts: int
    total_acts: int
    treatment_distribution: Dict[str, int]

@router.get("/lineage/stats", response_model=StatsResponse)
async def get_lineage_stats():
    """
    Get statistics about the processed acts data.
    """
    try:
        from fastapi_app.services.lineage_analysis_service import load_processed_acts_data
        
        data = load_processed_acts_data()
        if not data:
            raise HTTPException(status_code=404, detail="Processed acts data not found")
        
        metadata = data.get('metadata', {})
        
        # Get treatment distribution
        treatment_counts = {}
        for file_data in data.get('files', []):
            for act_data in file_data.get('acts', []):
                treatment = act_data.get('treatment', 'UNKNOWN')
                treatment_counts[treatment] = treatment_counts.get(treatment, 0) + 1
        
        return StatsResponse(
            total_files=metadata.get('total_files_processed', 0),
            files_with_acts=metadata.get('files_with_acts', 0),
            total_acts=metadata.get('total_acts_found', 0),
            treatment_distribution=treatment_counts
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")
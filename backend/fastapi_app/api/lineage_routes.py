# backend/fastapi_app/api/lineage_routes.py

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import logging
from pathlib import Path

# Import PDF service to extract text from the stored PDF file
from app.services.pdf_service import extract_text_from_pdf
from app.services.precedent_preprocessing_service import preprocess_judgment_for_lineage
from fastapi_app.services.lineage_analysis_service import analyze_judgment_lineage, is_model_loaded

router = APIRouter()
logger = logging.getLogger(__name__)

# Define the uploads folder path (relative to project root)
UPLOADS_FOLDER = Path(__file__).parent.parent.parent / "uploads"

# Pydantic models for request/response
class LineageAnalysisRequest(BaseModel):
    filename: str  # The name of the PDF file in the uploads folder (e.g., "judgment_123.pdf")

class ActTreatmentResult(BaseModel):
    case: str
    act: str
    treatment: str
    confidence: float

class LineageAnalysisResponse(BaseModel):
    filename: str
    results: List[ActTreatmentResult]
    message: Optional[str] = None

@router.post("/analyze-lineage", response_model=LineageAnalysisResponse)
async def analyze_lineage(request: LineageAnalysisRequest):
    """
    Endpoint to perform lineage analysis on a judgment PDF file from the uploads folder.
    It expects a filename, reads the PDF from /uploads, extracts text, preprocesses it,
    and runs the act treatment classifier.
    """
    logger.info(f"Received lineage analysis request for file: {request.filename}")

    # 1. Check if the model is loaded
    if not is_model_loaded():
        logger.error("Lineage model is not loaded. Cannot process request.")
        raise HTTPException(status_code=503, detail="Lineage analysis model is currently unavailable.")

    # 2. Construct the full path to the PDF file in uploads folder
    pdf_path = UPLOADS_FOLDER / request.filename
    
    # Check if file exists
    if not pdf_path.exists():
        logger.error(f"File not found: {pdf_path}")
        raise HTTPException(status_code=404, detail=f"File {request.filename} not found in uploads folder.")
    
    # 3. Extract text from the PDF file using Faizal's pdf_service
    try:
        logger.info(f"Extracting text from PDF: {pdf_path}")
        with open(pdf_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()
        
        # Call Faizal's PDF service to extract text
        raw_text = extract_text_from_pdf(pdf_bytes)
        
        if not raw_text or len(raw_text.strip()) == 0:
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
        
        logger.info(f"Successfully extracted {len(raw_text)} characters from PDF")
        
    except Exception as e:
        logger.error(f"Failed to extract text from PDF {request.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")

    # 4. Preprocess the text (cleaning, act extraction)
    try:
        preprocessed_data = preprocess_judgment_for_lineage(raw_text)
        # Add the filename to the data for the analysis service
        preprocessed_data["file_name"] = request.filename
        logger.info(f"Preprocessing complete. Found acts: {preprocessed_data['acts_mentioned']}")
    except Exception as e:
        logger.error(f"Preprocessing failed for {request.filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to preprocess document.")

    # 5. Run the lineage analysis
    try:
        analysis_results = analyze_judgment_lineage(preprocessed_data)
        logger.info(f"Analysis complete. Generated {len(analysis_results)} treatment entries.")
    except Exception as e:
        logger.error(f"Lineage analysis failed for {request.filename}: {e}")
        raise HTTPException(status_code=500, detail="Lineage analysis failed.")

    # 6. Format and return the response
    return LineageAnalysisResponse(
        filename=request.filename,
        results=[ActTreatmentResult(**res) for res in analysis_results],
        message="Analysis completed successfully."
    )

# Alternative endpoint that handles file upload directly
@router.post("/upload-and-analyze", response_model=LineageAnalysisResponse)
async def upload_and_analyze(file: UploadFile = File(...)):
    """
    Endpoint to upload a judgment PDF file, save it to uploads folder, extract text,
    and perform lineage analysis.
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
    
    # 4. Extract text from the saved PDF
    try:
        raw_text = extract_text_from_pdf(content)
        
        if not raw_text or len(raw_text.strip()) == 0:
            # Clean up the saved file if text extraction fails
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
        
        logger.info(f"Successfully extracted {len(raw_text)} characters from PDF")
        
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
    except Exception as e:
        logger.error(f"Preprocessing failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to preprocess document.")

    # 6. Analyze
    try:
        analysis_results = analyze_judgment_lineage(preprocessed_data)
    except Exception as e:
        logger.error(f"Lineage analysis failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail="Lineage analysis failed.")

    return LineageAnalysisResponse(
        filename=file.filename,
        results=[ActTreatmentResult(**res) for res in analysis_results],
        message="Analysis completed successfully."
    )
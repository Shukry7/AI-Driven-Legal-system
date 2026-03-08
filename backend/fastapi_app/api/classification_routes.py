"""
FastAPI routes for legal risk classification API.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import logging
import sys
import re
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from fastapi_app.services.classifier import classifier
from app.services.pdf_service import pdf_bytes_to_text

logger = logging.getLogger(__name__)

router = APIRouter()


class TextInput(BaseModel):
    """Request model for text input."""
    text: str


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    models_loaded: bool
    device: str


@router.get("/", response_class=HTMLResponse)
async def get_test_interface():
    """Serve a simple HTML test interface."""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Legal Risk Classifier - Test Interface</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .header {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                margin-bottom: 20px;
            }
            .header h1 {
                color: #667eea;
                margin-bottom: 10px;
            }
            .header p {
                color: #666;
            }
            .main-card {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
            }
            .tab {
                padding: 10px 20px;
                cursor: pointer;
                border: none;
                background: none;
                font-size: 16px;
                color: #666;
                border-bottom: 3px solid transparent;
                transition: all 0.3s;
            }
            .tab.active {
                color: #667eea;
                border-bottom-color: #667eea;
            }
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
            }
            textarea {
                width: 100%;
                min-height: 200px;
                padding: 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                resize: vertical;
            }
            textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            input[type="file"] {
                margin: 10px 0;
            }
            button {
                background: #667eea;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
                margin-top: 15px;
            }
            button:hover {
                background: #5568d3;
            }
            button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            #result {
                margin-top: 30px;
            }
            .result-header {
                background: #f7fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .stat-card {
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .stat-card.total {
                background: #e6f7ff;
                border: 2px solid #91d5ff;
            }
            .stat-card.high {
                background: #fee;
                border: 2px solid #fca5a5;
            }
            .stat-card.medium {
                background: #fef3cd;
                border: 2px solid #fcd34d;
            }
            .stat-card.low {
                background: #d1fae5;
                border: 2px solid #6ee7b7;
            }
            .stat-number {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 14px;
                color: #666;
            }
            .clause-item {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 15px;
                transition: box-shadow 0.3s;
            }
            .clause-item:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .clause-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .clause-id {
                font-weight: bold;
                color: #667eea;
            }
            .risk-badge {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .risk-badge.high {
                background: #fee;
                color: #dc2626;
            }
            .risk-badge.medium {
                background: #fef3cd;
                color: #d97706;
            }
            .risk-badge.low {
                background: #d1fae5;
                color: #059669;
            }
            .clause-text {
                color: #333;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .confidence {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            .progress-bar {
                flex-grow: 1;
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: #667eea;
                transition: width 0.3s;
            }
            .key-factors {
                margin-top: 10px;
            }
            .factor-tag {
                display: inline-block;
                background: #f1f5f9;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                margin: 4px 4px 4px 0;
                color: #475569;
            }
            .loading {
                text-align: center;
                padding: 40px;
                color: #667eea;
            }
            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .error {
                background: #fee;
                border: 2px solid #fca5a5;
                padding: 20px;
                border-radius: 8px;
                color: #dc2626;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚖️ Legal Risk Classification System</h1>
                <p>AI-powered clause segmentation and risk assessment for Sri Lankan civil court judgments</p>
            </div>
            
            <div class="main-card">
                <div class="tabs">
                    <button class="tab active" onclick="switchTab('text')">Text Input</button>
                    <button class="tab" onclick="switchTab('file')">File Upload</button>
                </div>
                
                <div id="text-tab" class="tab-content active">
                    <h3>Enter Legal Text</h3>
                    <textarea id="textInput" placeholder="Paste the judgment text here...

Example:
The Court finds that the Defendant did breach the contract by failing to deliver the materials within the agreed timeframe. The Plaintiff has provided sufficient evidence of financial losses. However, the damages claimed appear excessive. The Court orders the Defendant to pay Rs. 2,500,000 within 60 days."></textarea>
                    <button onclick="analyzeText()">Analyze Text</button>
                </div>
                
                <div id="file-tab" class="tab-content">
                    <h3>Upload Text File</h3>
                    <input type="file" id="fileInput" accept=".txt" />
                    <button onclick="analyzeFile()">Analyze File</button>
                </div>
                
                <div id="result"></div>
            </div>
        </div>
        
        <script>
            function switchTab(tab) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                if (tab === 'text') {
                    document.querySelector('.tab:nth-child(1)').classList.add('active');
                    document.getElementById('text-tab').classList.add('active');
                } else {
                    document.querySelector('.tab:nth-child(2)').classList.add('active');
                    document.getElementById('file-tab').classList.add('active');
                }
            }
            
            async function analyzeText() {
                const text = document.getElementById('textInput').value.trim();
                if (!text) {
                    alert('Please enter some text');
                    return;
                }
                
                showLoading();
                
                try {
                    const response = await fetch('/api/classify/text', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        displayResults(data);
                    } else {
                        showError(data.detail || 'An error occurred');
                    }
                } catch (error) {
                    showError('Failed to connect to server: ' + error.message);
                }
            }
            
            async function analyzeFile() {
                const fileInput = document.getElementById('fileInput');
                const file = fileInput.files[0];
                
                if (!file) {
                    alert('Please select a file');
                    return;
                }
                
                showLoading();
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const response = await fetch('/api/classify/file', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        displayResults(data);
                    } else {
                        showError(data.detail || 'An error occurred');
                    }
                } catch (error) {
                    showError('Failed to connect to server: ' + error.message);
                }
            }
            
            function showLoading() {
                document.getElementById('result').innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Analyzing text through two-stage pipeline...</p>
                        <p style="font-size: 14px; color: #666; margin-top: 10px;">Stage 1: Clause Segmentation (BIO Tagging)<br>Stage 2: Risk Classification</p>
                    </div>
                `;
            }
            
            function showError(message) {
                document.getElementById('result').innerHTML = `
                    <div class="error">
                        <strong>Error:</strong> ${message}
                    </div>
                `;
            }
            
            function displayResults(data) {
                let html = `
                    <div class="result-header">
                        <h2>Analysis Results</h2>
                        <div class="stats">
                            <div class="stat-card total">
                                <div class="stat-number">${data.total_clauses}</div>
                                <div class="stat-label">Total Clauses</div>
                            </div>
                            <div class="stat-card high">
                                <div class="stat-number">${data.risk_summary.High}</div>
                                <div class="stat-label">High Risk</div>
                            </div>
                            <div class="stat-card medium">
                                <div class="stat-number">${data.risk_summary.Medium}</div>
                                <div class="stat-label">Medium Risk</div>
                            </div>
                            <div class="stat-card low">
                                <div class="stat-number">${data.risk_summary.Low}</div>
                                <div class="stat-label">Low Risk</div>
                            </div>
                        </div>
                    </div>
                `;
                
                if (data.clauses && data.clauses.length > 0) {
                    data.clauses.forEach(clause => {
                        html += `
                            <div class="clause-item">
                                <div class="clause-header">
                                    <span class="clause-id">Clause #${clause.id}</span>
                                    <span class="risk-badge ${clause.risk.toLowerCase()}">${clause.risk} Risk</span>
                                </div>
                                <div class="clause-text">"${clause.text}"</div>
                                <div class="confidence">
                                    <strong>Confidence:</strong>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${clause.confidence}%"></div>
                                    </div>
                                    <strong>${clause.confidence}%</strong>
                                </div>
                                <div class="key-factors">
                                    <strong style="font-size: 14px;">Key Factors:</strong><br>
                                    ${clause.keyFactors.map(f => `<span class="factor-tag">${f}</span>`).join('')}
                                </div>
                            </div>
                        `;
                    });
                }
                
                html += `
                    <div style="margin-top: 20px; padding: 15px; background: #f7fafc; border-radius: 8px; font-size: 12px; color: #666;">
                        <strong>Model Information:</strong><br>
                        Segmentation: ${data.model_info.segmentation_model}<br>
                        Classification: ${data.model_info.classification_model}<br>
                        Device: ${data.model_info.device}
                    </div>
                `;
                
                document.getElementById('result').innerHTML = html;
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        models_available = classifier.has_segmentation and classifier.has_classification
        return {
            "status": "healthy" if models_available else "partial",
            "models_loaded": models_available,
            "device": str(classifier.device)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "models_loaded": False,
                "device": "unknown"
            }
        )


@router.post("/classify/text")
async def classify_text(input_data: TextInput):
    """
    Classify risk for input text.
    
    Performs two-stage analysis:
    1. Clause segmentation using BIO tagging
    2. Risk classification for each clause
    """
    try:
        if not input_data.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        logger.info(f"Received text input: {len(input_data.text)} characters")
        
        # Run analysis pipeline
        results = classifier.analyze_text(input_data.text)
        
        return JSONResponse(content=results)
        
    except Exception as e:
        logger.error(f"Error in text classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify/file")
async def classify_file(file: UploadFile = File(...)):
    """
    Classify risk for uploaded file (PDF or TXT).
    
    Accepts .pdf and .txt files and performs the same two-stage analysis.
    For PDFs, extracts text automatically with OCR fallback if needed.
    """
    try:
        # Validate file type
        if not (file.filename.endswith('.txt') or file.filename.endswith('.pdf')):
            raise HTTPException(
                status_code=400,
                detail="Only .txt and .pdf files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        if file.filename.endswith('.pdf'):
            logger.info(f"Extracting text from PDF: {file.filename}")
            
            # Use same PDF extraction as translation section (which works well)
            ok, raw_text = pdf_bytes_to_text(content)
            
            if not ok:
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF extraction failed: {raw_text}"
                )
            
            # Strip formatting markers (same as translation section does)
            text = re.sub(r"<<F:[^>]+>>", "", raw_text)
            text = re.sub(r"<</F>>", "", text)
            text = re.sub(r"<<BOLD>>|<</BOLD>>", "", text)
            
            logger.info(f"Successfully extracted {len(text)} characters from PDF")
        else:
            # TXT file
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="File encoding not supported. Please use UTF-8 encoded text files."
                )
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty or text extraction failed")
        
        logger.info(f"Processing file: {file.filename}, {len(text)} characters")
        
        # Run analysis pipeline
        results = classifier.analyze_text(text)
        
        # Add the extracted text to the response for display
        results["document_text"] = text
        
        return JSONResponse(content=results)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# CLASSIFICATION RESULTS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

# Directory for storing classification results
RESULTS_DIR = Path(backend_path) / "classification_results"
RESULTS_DIR.mkdir(exist_ok=True, parents=True)

import json
import datetime
from fastapi.responses import FileResponse


@router.post("/save")
async def save_classification(request: dict):
    """
    Save classification results for later retrieval.
    
    Request body:
    {
        "filename": str,
        "result": ClassificationResult object
    }
    """
    try:
        filename = request.get("filename", "unknown")
        result = request.get("result", {})
        
        # Generate unique ID
        timestamp = datetime.datetime.now()
        result_id = timestamp.strftime("%Y%m%d_%H%M%S") + "_" + filename.replace(" ", "_")[:50]
        
        # Save to JSON file
        result_file = RESULTS_DIR / f"{result_id}.json"
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump({
                "id": result_id,
                "filename": filename,
                "timestamp": timestamp.isoformat(),
                "result": result
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved classification result: {result_id}")
        return JSONResponse(content={"success": True, "id": result_id})
    
    except Exception as e:
        logger.error(f"Error saving classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_classifications():
    """
    Get list of recent classification results.
    
    Returns last 10 classifications ordered by timestamp (newest first).
    """
    try:
        RESULTS_DIR.mkdir(exist_ok=True, parents=True)
        
        classifications = []
        for result_file in RESULTS_DIR.glob("*.json"):
            try:
                with open(result_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    result = data.get("result", {})
                    risk_summary = result.get("risk_summary", {})
                    
                    classifications.append({
                        "id": data.get("id"),
                        "filename": data.get("filename"),
                        "timestamp": data.get("timestamp"),
                        "totalClauses": result.get("total_clauses", 0),
                        "riskSummary": risk_summary
                    })
            except Exception as e:
                logger.warning(f"Error reading {result_file}: {e}")
                continue
        
        # Sort by timestamp descending
        classifications.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return JSONResponse(content={
            "success": True,
            "classifications": classifications[:10]
        })
    
    except Exception as e:
        logger.error(f"Error loading recent classifications: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result/{result_id}")
async def get_classification_result(result_id: str):
    """
    Get full classification result by ID.
    """
    try:
        result_file = RESULTS_DIR / f"{result_id}.json"
        if not result_file.exists():
            raise HTTPException(status_code=404, detail="Classification result not found")
        
        with open(result_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return JSONResponse(content={
            "success": True,
            "result": data.get("result")
        })
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading classification result: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete/{result_id}")
async def delete_classification(result_id: str):
    """
    Delete a saved classification result.
    """
    try:
        result_file = RESULTS_DIR / f"{result_id}.json"
        if result_file.exists():
            result_file.unlink()
            logger.info(f"Deleted classification: {result_id}")
        
        return JSONResponse(content={"success": True})
    
    except Exception as e:
        logger.error(f"Error deleting classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/{result_id}/{format}")
async def export_classification(result_id: str, format: str):
    """
    Export classification result in different formats (pdf, json, txt).
    """
    try:
        result_file = RESULTS_DIR / f"{result_id}.json"
        if not result_file.exists():
            raise HTTPException(status_code=404, detail="Classification result not found")
        
        with open(result_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        result = data.get("result", {})
        filename = data.get("filename", "classification")
        
        if format == "json":
            # Export as JSON
            export_file = RESULTS_DIR / f"{result_id}_export.json"
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            return FileResponse(
                export_file,
                media_type="application/json",
                filename=f"{filename}_classification.json"
            )
        
        elif format == "txt":
            # Export as plain text with clauses
            export_file = RESULTS_DIR / f"{result_id}_export.txt"
            with open(export_file, 'w', encoding='utf-8') as f:
                f.write(f"LEGAL RISK CLASSIFICATION REPORT\n")
                f.write(f"{'=' * 80}\n\n")
                f.write(f"Document: {filename}\n")
                f.write(f"Total Clauses: {result.get('total_clauses', 0)}\n\n")
                
                # Risk summary
                risk_summary = result.get('risk_summary', {})
                f.write(f"Risk Summary:\n")
                f.write(f"  High Risk: {risk_summary.get('High', 0)} clauses\n")
                f.write(f"  Medium Risk: {risk_summary.get('Medium', 0)} clauses\n")
                f.write(f"  Low Risk: {risk_summary.get('Low', 0)} clauses\n\n")
                
                # Clauses
                f.write(f"{'=' * 80}\n")
                f.write(f"CLASSIFIED CLAUSES\n")
                f.write(f"{'=' * 80}\n\n")
                
                for clause in result.get('clauses', []):
                    risk = clause.get('risk', 'Unknown')
                    confidence = clause.get('confidence', 0)
                    text = clause.get('text', '')
                    
                    f.write(f"[{risk.upper()} RISK - {confidence}% Confidence]\n")
                    f.write(f"{text}\n")
                    f.write(f"{'-' * 80}\n\n")
            
            return FileResponse(
                export_file,
                media_type="text/plain",
                filename=f"{filename}_classification.txt"
            )
        
        elif format == "pdf":
            # For PDF, reuse the existing PDF download functionality
            # Just return the clauses data and let frontend handle it
            raise HTTPException(
                status_code=400,
                detail="PDF export should be done from the workspace view"
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

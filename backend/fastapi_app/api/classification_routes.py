"""
FastAPI routes for legal risk classification API.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import logging

from fastapi_app.services.classifier import classifier

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
        return {
            "status": "healthy",
            "models_loaded": True,
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
    Classify risk for uploaded text file.
    
    Accepts .txt files and performs the same two-stage analysis.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.txt'):
            raise HTTPException(
                status_code=400,
                detail="Only .txt files are supported"
            )
        
        # Read file content
        content = await file.read()
        text = content.decode('utf-8')
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info(f"Received file: {file.filename}, {len(text)} characters")
        
        # Run analysis pipeline
        results = classifier.analyze_text(text)
        
        return JSONResponse(content=results)
        
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File encoding not supported. Please use UTF-8 encoded text files."
        )
    except Exception as e:
        logger.error(f"Error in file classification: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

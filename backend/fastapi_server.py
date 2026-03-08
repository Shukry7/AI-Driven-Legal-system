"""
Main FastAPI application for Legal Risk Classification API.
"""
import logging
import os
import sys
import subprocess
from dotenv import load_dotenv
load_dotenv()  # Load .env before any other imports that read env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.background import BackgroundScheduler

from fastapi_app.api.classification_routes import router as classification_router
from fastapi_app.api.clause_routes import router as clause_router
from fastapi_app.api.pdf_routes import router as pdf_router
from fastapi_app.api.lineage_routes import router as lineage_router
from fastapi_app.api.translation_routes import router as translation_router, preload_models as preload_translation_models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI-Driven Legal System API",
    description="AI-powered legal document analysis including translation, clause detection, segmentation, and risk assessment using Legal-BERT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(classification_router, prefix="/api", tags=["classification"])
app.include_router(clause_router, prefix="/api", tags=["clause_detection"])
app.include_router(pdf_router, tags=["pdf_processing"])
app.include_router(lineage_router, prefix="/api", tags=["lineage_analysis"])
app.include_router(translation_router, prefix="/api", tags=["translation"])

# Initialize background scheduler for cleanup tasks
scheduler = BackgroundScheduler()

def cleanup_old_uploads():
    """Run the upload cleanup script to delete expired case files."""
    try:
        script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'run_one_off_cleanup.py')
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        if result.returncode == 0:
            logger.info(f"✓ Upload cleanup completed: {result.stdout.strip()}")
        else:
            logger.error(f"✗ Upload cleanup failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        logger.error("✗ Upload cleanup timed out after 5 minutes")
    except Exception as e:
        logger.error(f"✗ Upload cleanup error: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup."""
    logger.info("=" * 60)
    logger.info("Starting AI-Driven Legal System API")
    logger.info("=" * 60)
    logger.info("✓ PDF processing service ready")
    logger.info("✓ Clause detection service ready")

     # Preload translation models in background thread
    import threading
    threading.Thread(target=preload_translation_models, daemon=True).start()
    logger.info("✓ Translation model loading initiated (background)")
    
    # Log clause prediction configuration
    prediction_mode = os.getenv("CLAUSE_PREDICTION_MODE", "manual")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    llm_configured = bool(openai_key.strip() and openai_key != "your-openai-api-key-here")
    logger.info(f"✓ Clause prediction mode: {prediction_mode}")
    logger.info(f"✓ OpenAI model: {openai_model}")
    logger.info(f"{'✓' if llm_configured else '⚠'} OpenAI API key: {'configured' if llm_configured else 'NOT SET (will use fallback templates)'}")
    
    try:
        # Models are loaded when importing classifier
        from fastapi_app.services.classifier import classifier
        if classifier.has_segmentation and classifier.has_classification:
            logger.info("✓ ML Classification models loaded")
        else:
            logger.warning("⚠ ML models not available (optional)")
        logger.info(f"✓ Device: {classifier.device}")
    except Exception as e:
        logger.warning(f"⚠ Classification models unavailable: {str(e)}")
        logger.info("✓ API will continue without ML features")
    
    # Start background cleanup scheduler
    try:
        cleanup_interval = int(os.getenv('UPLOAD_CLEANUP_INTERVAL_MINUTES', '5'))
        if not scheduler.running:
            scheduler.add_job(
                cleanup_old_uploads,
                'interval',
                minutes=cleanup_interval,
                id='upload_cleanup',
                name='Cleanup old uploads',
                replace_existing=True
            )
            scheduler.start()
            logger.info(f"✓ Upload cleanup scheduler started (runs every {cleanup_interval} minutes)")
    except Exception as e:
        logger.warning(f"⚠ Failed to start cleanup scheduler: {str(e)}")
    
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("✓ Cleanup scheduler stopped")
    logger.info("Shutting down AI-Driven Legal System API")


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return JSONResponse(
        content={
            "message": "AI-Driven Legal System API",
            "version": "1.0.0",
            "status": "ok",
            "endpoints": {
                "pdf_processing": {
                    "upload_pdf": "/upload-pdf",
                    "analyze_clauses": "/analyze-clauses",
                    "list_clauses": "/clauses/list",
                    "save_text": "/save-text",
                    "generate_pdf": "/generate-pdf",
                    "recent_uploads": "/uploads/recent"
                },
                "classification": {
                    "test_interface": "/api",
                    "classify_text": "/api/classify/text",
                    "classify_file": "/api/classify/file",
                    "analyze_clauses": "/api/analyze-clauses",
                    "list_clauses": "/api/clauses/list",
                    "health": "/api/health"
                },
                "lineage_analysis": {
                    "upload_and_analyze": "/api/lineage/analyze-lineage",
                    "search_and_fetch": "/api/lineage/search-act",
                    "get_stats": "/api/lineage/stats",
                    "list_uploads": "/api/lineage/list-uploads"
                },
                "docs": "/docs",
                "redoc": "/redoc"
            }
        }
    )


@app.get("/ping")
async def ping():
    """Simple ping endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

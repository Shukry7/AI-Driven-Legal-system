"""
Main FastAPI application for Legal Risk Classification API.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from fastapi_app.api.classification_routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Legal Risk Classification API",
    description="AI-powered clause segmentation and risk assessment for legal documents using Legal-BERT",
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
app.include_router(router, prefix="/api", tags=["classification"])


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup."""
    logger.info("=" * 60)
    logger.info("Starting Legal Risk Classification API")
    logger.info("=" * 60)
    try:
        # Models are loaded when importing classifier
        from fastapi_app.services.classifier import classifier
        logger.info("✓ Models loaded successfully")
        logger.info(f"✓ Device: {classifier.device}")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"✗ Failed to load models: {str(e)}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Legal Risk Classification API")


@app.get("/")
async def root():
    """Root endpoint - redirect to test interface."""
    return JSONResponse(
        content={
            "message": "Legal Risk Classification API",
            "version": "1.0.0",
            "endpoints": {
                "test_interface": "/api",
                "classify_text": "/api/classify/text",
                "classify_file": "/api/classify/file",
                "health": "/api/health",
                "docs": "/docs"
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

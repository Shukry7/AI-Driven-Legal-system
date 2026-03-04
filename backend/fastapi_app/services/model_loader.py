"""
Model loader service for Legal-BERT models.
Loads and caches the clause segmentation and risk classification models.
"""
import os
import logging
from pathlib import Path
from transformers import (
    BertForTokenClassification,
    BertForSequenceClassification,
    BertTokenizer,
    AutoTokenizer
)
import torch

logger = logging.getLogger(__name__)

class ModelLoader:
    """Singleton class to load and manage ML models."""
    
    _instance = None
    _models_loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._models_loaded:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info(f"Using device: {self.device}")
            
            # Get model paths - go up to backend/, then into app/ml_models/
            base_path = Path(__file__).parent.parent.parent / "app" / "ml_models"
            self.segmentation_path = base_path / "legalbert_clause_segmentation_model"
            self.classification_path = base_path / "legalbert_risk_classification_model"
            
            # Load models
            self.load_models()
            ModelLoader._models_loaded = True
    
    def load_models(self):
        """Load both segmentation and classification models."""
        try:
            # Initialize models as None
            self.segmentation_model = None
            self.segmentation_tokenizer = None
            self.segmentation_labels = None
            self.classification_model = None
            self.classification_tokenizer = None
            self.classification_labels = None
            
            # Try to load segmentation model from local path
            logger.info("Checking for clause segmentation model...")
            if self.segmentation_path.exists():
                logger.info(f"Loading segmentation model from {self.segmentation_path}")
                self.segmentation_tokenizer = AutoTokenizer.from_pretrained(
                    str(self.segmentation_path)
                )
                self.segmentation_model = BertForTokenClassification.from_pretrained(
                    str(self.segmentation_path)
                ).to(self.device)
                self.segmentation_model.eval()
                self.segmentation_labels = self.segmentation_model.config.id2label
                logger.info("✓ Clause segmentation model loaded successfully")
            else:
                logger.warning(f"Segmentation model not found at {self.segmentation_path}")
                logger.warning("Segmentation features will be unavailable")
            
            # Try to load classification model from local path
            logger.info("Checking for risk classification model...")
            if self.classification_path.exists():
                logger.info(f"Loading classification model from {self.classification_path}")
                self.classification_tokenizer = AutoTokenizer.from_pretrained(
                    str(self.classification_path)
                )
                self.classification_model = BertForSequenceClassification.from_pretrained(
                    str(self.classification_path)
                ).to(self.device)
                self.classification_model.eval()
                self.classification_labels = self.classification_model.config.id2label
                logger.info("✓ Risk classification model loaded successfully")
            else:
                logger.warning(f"Classification model not found at {self.classification_path}")
                logger.warning("Classification features will be unavailable")
            
            # Log final status
            models_loaded = []
            if self.segmentation_model:
                models_loaded.append("Segmentation")
            if self.classification_model:
                models_loaded.append("Classification")
            
            if models_loaded:
                logger.info(f"Models loaded: {', '.join(models_loaded)}")
            else:
                logger.warning("No ML models loaded - API will run without ML features")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            # Don't raise - allow server to start without models
            logger.warning("Server will continue without ML models")
    
    def get_segmentation_model(self):
        """Get the clause segmentation model and tokenizer."""
        if self.segmentation_model is None:
            raise RuntimeError("Segmentation model not loaded. Please place model files in app/ml_models/")
        return self.segmentation_model, self.segmentation_tokenizer
    
    def get_classification_model(self):
        """Get the risk classification model and tokenizer."""
        if self.classification_model is None:
            raise RuntimeError("Classification model not loaded. Please place model files in app/ml_models/")
        return self.classification_model, self.classification_tokenizer
    
    def has_segmentation_model(self):
        """Check if segmentation model is available."""
        return self.segmentation_model is not None
    
    def has_classification_model(self):
        """Check if classification model is available."""
        return self.classification_model is not None
    
    def get_device(self):
        """Get the current device (CPU/GPU)."""
        return self.device
    
    def get_labels(self):
        """Get label mappings for both models."""
        return {
            "segmentation": self.segmentation_labels,
            "classification": self.classification_labels
        }


# Global instance
model_loader = ModelLoader()

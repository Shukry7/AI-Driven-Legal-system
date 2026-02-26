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
            logger.info("Loading clause segmentation model...")
            self.segmentation_tokenizer = AutoTokenizer.from_pretrained(
                str(self.segmentation_path)
            )
            self.segmentation_model = BertForTokenClassification.from_pretrained(
                str(self.segmentation_path)
            ).to(self.device)
            self.segmentation_model.eval()
            logger.info("✓ Clause segmentation model loaded successfully")
            
            logger.info("Loading risk classification model...")
            self.classification_tokenizer = AutoTokenizer.from_pretrained(
                str(self.classification_path)
            )
            self.classification_model = BertForSequenceClassification.from_pretrained(
                str(self.classification_path)
            ).to(self.device)
            self.classification_model.eval()
            logger.info("✓ Risk classification model loaded successfully")
            
            # Load label mappings
            self.segmentation_labels = self.segmentation_model.config.id2label
            self.classification_labels = self.classification_model.config.id2label
            
            logger.info(f"Segmentation labels: {self.segmentation_labels}")
            logger.info(f"Classification labels: {self.classification_labels}")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def get_segmentation_model(self):
        """Get the clause segmentation model and tokenizer."""
        return self.segmentation_model, self.segmentation_tokenizer
    
    def get_classification_model(self):
        """Get the risk classification model and tokenizer."""
        return self.classification_model, self.classification_tokenizer
    
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

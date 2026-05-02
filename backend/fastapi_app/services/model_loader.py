"""
Model loader service for Legal-BERT models.
Loads and caches the clause segmentation and risk classification models.
"""
import logging
from transformers import (
    BertForTokenClassification,
    BertForSequenceClassification,
    AutoModelForSequenceClassification,
    AutoTokenizer
)
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_MODELS_REPO = "Dedsec-24/Legal-assistance-models"
HF_MODEL_SUBFOLDERS = {
    "segmentation": "legalbert_clause_segmentation_model",
    "classification": "legalbert_risk_classification_model",
    "lineage": "act_treatment_classifier",
}

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

            self.segmentation_model = None
            self.segmentation_tokenizer = None
            self.segmentation_labels = None
            self.classification_model = None
            self.classification_tokenizer = None
            self.classification_labels = None
            self.lineage_model = None
            self.lineage_tokenizer = None
            self.lineage_labels = None

            ModelLoader._models_loaded = True

    def _load_tokenizer(self, subfolder: str):
        return AutoTokenizer.from_pretrained(
            HF_MODELS_REPO,
            subfolder=subfolder,
            trust_remote_code=True,
        )

    def _load_segmentation_bundle(self):
        self.segmentation_tokenizer = self._load_tokenizer(HF_MODEL_SUBFOLDERS["segmentation"])
        self.segmentation_model = BertForTokenClassification.from_pretrained(
            HF_MODELS_REPO,
            subfolder=HF_MODEL_SUBFOLDERS["segmentation"],
            trust_remote_code=True,
        ).to(self.device)
        self.segmentation_model.eval()
        self.segmentation_labels = self.segmentation_model.config.id2label

    def _load_classification_bundle(self):
        self.classification_tokenizer = self._load_tokenizer(HF_MODEL_SUBFOLDERS["classification"])
        self.classification_model = BertForSequenceClassification.from_pretrained(
            HF_MODELS_REPO,
            subfolder=HF_MODEL_SUBFOLDERS["classification"],
            trust_remote_code=True,
        ).to(self.device)
        self.classification_model.eval()
        self.classification_labels = self.classification_model.config.id2label

    def _load_lineage_bundle(self):
        self.lineage_tokenizer = self._load_tokenizer(HF_MODEL_SUBFOLDERS["lineage"])
        self.lineage_model = AutoModelForSequenceClassification.from_pretrained(
            HF_MODELS_REPO,
            subfolder=HF_MODEL_SUBFOLDERS["lineage"],
            trust_remote_code=True,
        ).to(self.device)
        self.lineage_model.eval()
        self.lineage_labels = self.lineage_model.config.id2label
    
    def load_models(self):
        """Load all Hugging Face-backed models on demand."""
        try:
            self._load_segmentation_bundle()
            self._load_classification_bundle()
            self._load_lineage_bundle()

            models_loaded = ["Segmentation", "Classification", "Lineage"]
            
            logger.info(f"Models loaded: {', '.join(models_loaded)}")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            # Don't raise - allow server to start without models
            logger.warning("Server will continue without ML models")
    
    def get_segmentation_model(self):
        """Get the clause segmentation model and tokenizer."""
        if self.segmentation_model is None:
            self._load_segmentation_bundle()
        return self.segmentation_model, self.segmentation_tokenizer
    
    def get_classification_model(self):
        """Get the risk classification model and tokenizer."""
        if self.classification_model is None:
            self._load_classification_bundle()
        return self.classification_model, self.classification_tokenizer
    
    def get_lineage_model(self):
        """Get the act treatment lineage model and tokenizer."""
        if self.lineage_model is None:
            self._load_lineage_bundle()
        return self.lineage_model, self.lineage_tokenizer
    
    def has_segmentation_model(self):
        """Check if segmentation model is available."""
        return self.segmentation_model is not None
    
    def has_classification_model(self):
        """Check if classification model is available."""
        return self.classification_model is not None
    
    def has_lineage_model(self):
        """Check if lineage model is available."""
        return self.lineage_model is not None
    
    def get_device(self):
        """Get the current device (CPU/GPU)."""
        return self.device
    
    def get_labels(self):
        """Get label mappings for both models."""
        return {
            "segmentation": self.segmentation_labels,
            "classification": self.classification_labels,
            "lineage": self.lineage_labels
        }


# Global instance
model_loader = ModelLoader()

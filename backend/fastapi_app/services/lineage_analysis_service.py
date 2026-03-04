# backend/fastapi_app/services/lineage_analysis_service.py

import torch
import logging
from typing import List, Dict, Any, Optional, Tuple
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from app.services.precedent_preprocessing_service import extract_act_contexts
from fastapi_app.services.model_loader import model_loader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model and tokenizer (to be loaded once at startup)
_model = None
_tokenizer = None
_id2label = None
_model_loaded = False

def load_lineage_model(model_path: str):
    """
    Loads the act treatment classifier model and tokenizer.
    To be called during application startup (e.g., in a lifespan function).
    """
    global _model, _tokenizer, _id2label, _model_loaded
    try:
        logger.info(f"Loading lineage model from {model_path}...")
        _tokenizer = AutoTokenizer.from_pretrained(model_path)
        _model = AutoModelForSequenceClassification.from_pretrained(model_path)
        _model.eval()
        _id2label = _model.config.id2label
        _model_loaded = True
        logger.info("Lineage model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load lineage model: {e}")
        _model_loaded = False
        # Depending on requirements, you might want to raise the exception
        # or simply have the service fail gracefully later.

def is_model_loaded() -> bool:
    """Check if the lineage model is loaded."""
    return model_loader.has_lineage_model()

def predict_treatment(context: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Predicts the treatment (FOLLOWED, OVERRULED, etc.) for a given context.
    Returns (label, confidence) or (None, None) if model not loaded.
    """
    if not model_loader.has_lineage_model():
        logger.error("Model not loaded. Cannot predict treatment.")
        return None, None

    try:
        model, tokenizer = model_loader.get_lineage_model()
        id2label = model.config.id2label  # Get directly from model config
        
        inputs = tokenizer(
            context,
            truncation=True,
            padding="max_length",
            max_length=256,
            return_tensors="pt"
        )
        
        # Move inputs to the same device as model
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred_id = torch.argmax(probs).item()
            confidence = probs[0][pred_id].item()
        
        # Convert pred_id to string for dictionary lookup
        label = id2label[str(pred_id)]
        logger.debug(f"Prediction: {label} (confidence: {confidence:.3f})")
        return label, confidence
        
    except Exception as e:
        logger.error(f"Error during treatment prediction: {e}")
        return None, None

def analyze_judgment_lineage(judgment_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Performs the full lineage analysis on a preprocessed judgment.
    Takes the output from precedent_preprocessing_service.preprocess_judgment_for_lineage()
    and returns a list of act treatment results.
    """
    if not model_loader.has_lineage_model():
        logger.error("Lineage model not loaded. Cannot perform analysis.")
        return []

    cleaned_text = judgment_data.get("cleaned_text")
    acts_string = judgment_data.get("acts_mentioned")
    case_id = judgment_data.get("file_name", "unknown_case")

    if not cleaned_text or not acts_string:
        logger.warning("Missing cleaned_text or acts_mentioned for analysis.")
        return []

    results = []
    acts_list = [act.strip() for act in acts_string.split(";") if act.strip()]

    logger.info(f"Analyzing lineage for case '{case_id}' with {len(acts_list)} acts.")

    for act in acts_list:
        contexts = extract_act_contexts(cleaned_text, act, window=400)
        
        for ctx in contexts[:3]:  # Limit to first 3 contexts
            label, conf = predict_treatment(ctx)
            if label and conf is not None:
                results.append({
                    "case": case_id,
                    "act": act,
                    "treatment": label,
                    "confidence": round(conf, 3)
                })
                logger.info(f"  {act} → {label} (conf: {conf:.3f})")
            else:
                logger.warning(f"Prediction failed for act '{act}' in case '{case_id}'.")

    logger.info(f"Analysis complete. Generated {len(results)} treatment entries.")
    return results
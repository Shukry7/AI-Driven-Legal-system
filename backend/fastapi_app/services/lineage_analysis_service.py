import torch
import logging
from typing import List, Dict, Any, Optional, Tuple

from app.services.precedent_preprocessing_service import extract_act_contexts
from fastapi_app.services.model_loader import model_loader

logger = logging.getLogger(__name__)

def is_model_loaded() -> bool:
    """Check if the lineage model is loaded."""
    return model_loader.has_lineage_model()

def predict_treatment(context: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Predicts the treatment (FOLLOWED, OVERRULED, etc.) for a given context.
    Returns (label, confidence) or (None, None) if model not loaded.
    Matches the EXACT logic from your working test script.
    """
    if not model_loader.has_lineage_model():
        logger.error("Model not loaded. Cannot predict treatment.")
        return None, None

    try:
        model, tokenizer = model_loader.get_lineage_model()
        
        # Get the id2label mapping directly from model config
        id2label = model.config.id2label
        logger.debug(f"Label mapping: {id2label}")
        
        # Tokenize exactly like your test script
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
        
        # Use integer key directly (exactly like your test script)
        label = id2label[pred_id]
        
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
    Matches the logic from your working test script.
    """
    if not model_loader.has_lineage_model():
        logger.error("Lineage model not loaded. Cannot perform analysis.")
        return []

    cleaned_text = judgment_data.get("cleaned_text")
    acts_list = judgment_data.get("acts_list", [])
    case_id = judgment_data.get("file_name", "unknown_case")

    if not cleaned_text:
        logger.warning("Missing cleaned_text for analysis.")
        return []

    logger.info(f"Analyzing lineage for case '{case_id}' with {len(acts_list)} acts.")

    results = []
    for act in acts_list:
        logger.info(f"\n--- Analyzing act: {act} ---")
        
        # Find contexts for this act (exactly like test script)
        contexts = extract_act_contexts(cleaned_text, act, window=400)
        logger.info(f"   Found {len(contexts)} context windows")
        
        for i, ctx in enumerate(contexts[:3]):  # Limit to first 3 contexts
            logger.info(f"   Context {i+1} (first 100 chars): {ctx[:100]}...")
            
            # Get prediction (exactly like test script)
            label, conf = predict_treatment(ctx)
            
            if label and conf is not None:
                results.append({
                    "case": case_id,
                    "act": act,
                    "treatment": label,
                    "confidence": round(conf, 3)
                })
                logger.info(f"   ✅ {act} → {label} (conf: {conf:.3f})")
            else:
                logger.warning(f"   ❌ Prediction failed for act: {act}")

    logger.info(f"Analysis complete. Generated {len(results)} treatment entries.")
    return results
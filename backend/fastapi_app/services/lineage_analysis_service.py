from difflib import SequenceMatcher
import json
from pathlib import Path
import re
import torch
import logging
from typing import List, Dict, Any, Optional, Tuple

from app.services.precedent_preprocessing_service import extract_act_contexts
from fastapi_app.services.model_loader import model_loader

PROCESSED_DATA_FILE = Path(__file__).parent.parent.parent / "processed_acts_data.json"

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

def load_processed_acts_data() -> Optional[Dict[str, Any]]:
    """
    Load the processed acts data from the JSON file.
    Returns None if file doesn't exist or is invalid.
    """
    try:
        if not PROCESSED_DATA_FILE.exists():
            logger.warning(f"Processed acts data file not found at {PROCESSED_DATA_FILE}")
            return None
        
        with open(PROCESSED_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"✅ Loaded processed acts data with {data['metadata']['total_acts_found']} acts from {data['metadata']['total_files_processed']} files")
        return data
    except Exception as e:
        logger.error(f"Error loading processed acts data: {e}")
        return None

def normalize_act_name(act_name: str) -> str:
    """
    Normalize act name for better matching by removing extra spaces,
    standardizing punctuation, and converting to lowercase.
    """
    # Convert to lowercase
    normalized = act_name.lower()
    
    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Standardize "No." format
    normalized = re.sub(r'no\.?\s*', 'no ', normalized)
    
    # Standardize "of" format
    normalized = re.sub(r'\s+of\s+', ' of ', normalized)
    
    return normalized.strip()

def calculate_similarity(act1: str, act2: str) -> float:
    """
    Calculate similarity ratio between two act names.
    Returns a value between 0 and 1.
    """
    # Normalize both names
    norm1 = normalize_act_name(act1)
    norm2 = normalize_act_name(act2)
    
    # Use sequence matcher for fuzzy matching
    return SequenceMatcher(None, norm1, norm2).ratio()

def search_similar_acts(search_act: str, min_similarity: float = 0.6) -> List[Dict[str, Any]]:
    """
    Search for acts similar to the given act name in the processed data.
    Returns a list of matching act occurrences with their metadata.
    
    Args:
        search_act: The act name to search for
        min_similarity: Minimum similarity threshold (0-1)
    
    Returns:
        List of matching acts with their file information
    """
    logger.info(f"🔍 Searching for acts similar to: '{search_act}'")
    
    # Load the processed data
    data = load_processed_acts_data()
    if not data:
        return []
    
    matches = []
    seen_combinations = set()  # To avoid duplicate (file_id, act_name) combinations
    
    # Normalize the search term
    search_normalized = normalize_act_name(search_act)
    
    # Search through all acts in all files
    for file_data in data.get('files', []):
        file_id = file_data.get('file_id', '')
        filename = file_data.get('filename', '')
        case_title = file_data.get('case_title', '')
        year = file_data.get('year')
        
        for act_data in file_data.get('acts', []):
            act_name = act_data.get('act_name', '')
            
            # Calculate similarity
            similarity = calculate_similarity(search_act, act_name)
            
            # Check if it's a match
            if similarity >= min_similarity:
                # Create a unique key for this combination
                combo_key = f"{file_id}|{act_name}"
                
                if combo_key not in seen_combinations:
                    seen_combinations.add(combo_key)
                    
                    matches.append({
                        "file_id": file_id,
                        "filename": filename,
                        "case_title": case_title,
                        "year": year,
                        "act_name": act_name,
                        "act_id": act_data.get('act_id', ''),
                        "treatment": act_data.get('treatment', ''),
                        "confidence": act_data.get('confidence', 0),
                        "similarity_score": round(similarity, 3),
                        "context_preview": act_data.get('first_context', '')
                    })
                    
                    logger.debug(f"  Match found: '{act_name}' (similarity: {similarity:.3f})")
    
    # Sort by similarity score (highest first)
    matches.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    logger.info(f"✅ Found {len(matches)} similar acts")
    return matches

def get_act_by_exact_name(act_name: str) -> List[Dict[str, Any]]:
    """
    Get all occurrences of an exact act name from the processed data.
    Uses the index for fast lookup.
    """
    logger.info(f"🔍 Looking up exact act: '{act_name}'")
    
    data = load_processed_acts_data()
    if not data:
        return []
    
    # Use the index for fast lookup
    index = data.get('indexes', {}).get('by_act_name', {})
    matches = index.get(act_name, [])
    
    if not matches:
        # Try case-insensitive match
        act_name_lower = act_name.lower()
        for key in index.keys():
            if key.lower() == act_name_lower:
                matches = index[key]
                break
    
    logger.info(f"✅ Found {len(matches)} exact matches")
    return matches

def get_acts_by_treatment(treatment: str) -> List[Dict[str, Any]]:
    """
    Get all acts with a specific treatment.
    """
    logger.info(f"🔍 Looking up acts with treatment: '{treatment}'")
    
    data = load_processed_acts_data()
    if not data:
        return []
    
    # Use the index for fast lookup
    index = data.get('indexes', {}).get('by_treatment', {})
    matches = index.get(treatment.upper(), [])
    
    logger.info(f"✅ Found {len(matches)} acts with treatment '{treatment}'")
    return matches

def get_acts_by_year(year: int) -> List[Dict[str, Any]]:
    """
    Get all acts from cases of a specific year.
    """
    logger.info(f"🔍 Looking up acts from year: {year}")
    
    data = load_processed_acts_data()
    if not data:
        return []
    
    # Use the index for fast lookup
    index = data.get('indexes', {}).get('by_year', {})
    file_ids = index.get(str(year), [])
    
    # Get the actual act data for these files
    results = []
    for file_id in file_ids:
        # Find the file data
        for file_data in data.get('files', []):
            if file_data.get('file_id') == file_id:
                for act_data in file_data.get('acts', []):
                    results.append({
                        "file_id": file_id,
                        "filename": file_data.get('filename'),
                        "case_title": file_data.get('case_title'),
                        "year": year,
                        "act_name": act_data.get('act_name'),
                        "treatment": act_data.get('treatment'),
                        "confidence": act_data.get('confidence')
                    })
                break
    
    logger.info(f"✅ Found {len(results)} acts from year {year}")
    return results
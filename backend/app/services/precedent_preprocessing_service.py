# backend/app/services/precedent_preprocessing_service.py

import re
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_judgment_text(raw_text: str) -> str:
    """
    Cleans the raw extracted text from a judgment PDF.
    Based on the 'clean_text' function from the notebook.
    """
    logger.info("Cleaning judgment text...")
    # t = re.sub(r'\\n+', ' ', str(t))  # Original from notebook, but we'll adapt
    text = re.sub(r'\n+', ' ', raw_text)  # Replace newlines with space
    text = re.sub(r'\s{2,}', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'Page\s*\d+', '', text, flags=re.I)  # Remove page numbers
    text = re.sub(r'–|—|-', '-', text)  # Normalize dashes
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII characters (optional, use with caution for trilingual)
    return text.strip()

def extract_acts_from_text(cleaned_text: str) -> str:
    """
    Extracts potential Acts, Ordinances, and Sections referenced in the judgment.
    Based on the 'extract_acts' function from the notebook.
    Returns a semicolon-separated string of acts.
    """
    logger.info("Extracting acts from cleaned text...")
    # Pattern from notebook: r'((?:[A-Z][a-z]+\s){0,3}(?:Act|Ordinance|Code|Law)\s*(?:No\.\s*\d+\s*of\s*\d{4})?)'
    # We'll use a slightly more robust version
    # Note: This pattern might need tuning for Sri Lankan legal terminology
    pattern = r'((?:[A-Z][a-zA-Z]+\s){0,4}(?:Act|Ordinance|Code|Law|Ordinance)\s*(?:No\.?\s*\d+\s*of\s*\d{4})?)'
    acts = re.findall(pattern, cleaned_text, flags=re.I)
    # Filter out short or likely false positives
    filtered_acts = [a.strip() for a in acts if len(a.strip()) > 5]
    unique_acts = list(set(filtered_acts))
    logger.info(f"Found {len(unique_acts)} unique acts.")
    return "; ".join(unique_acts)

def extract_act_contexts(text: str, act_name: str, window: int = 400) -> List[str]:
    """
    Extracts context windows around mentions of a specific act name.
    Based on the 'extract_act_contexts' function from the notebook.
    """
    contexts = []
    # Use re.escape to safely handle act names that might contain regex special characters like '.'
    escaped_act_name = re.escape(act_name)
    for match in re.finditer(escaped_act_name, text, flags=re.I):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        contexts.append(text[start:end])
    return contexts

def preprocess_judgment_for_lineage(raw_text: str) -> Dict[str, Any]:
    """
    Runs the full preprocessing pipeline: cleaning, act extraction.
    Returns a dictionary with the cleaned text and the acts string.
    This mimics the 'cleaned_with_acts.csv' row for a single judgment.
    """
    logger.info("Starting full preprocessing pipeline for lineage...")
    cleaned_text = clean_judgment_text(raw_text)
    acts_mentioned = extract_acts_from_text(cleaned_text)

    return {
        "cleaned_text": cleaned_text,
        "acts_mentioned": acts_mentioned
    }

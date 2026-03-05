import re
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_judgment_text(raw_text: str) -> str:
    """
    Cleans the raw extracted text from a judgment PDF.
    Uses the EXACT clean_text function from your test script/notebook.
    """
    logger.info("Cleaning judgment text...")
    
    # EXACT clean_text function from test script
    t = re.sub(r'\n+', ' ', str(raw_text))
    t = re.sub(r'\s{2,}', ' ', t)
    t = re.sub(r'Page\s*\d+', '', t, flags=re.I)
    t = re.sub(r'–|—|-', '-', t)
    t = re.sub(r'[^\x00-\x7F]+', ' ', t)  # remove weird unicode
    return t.strip()

def extract_acts_from_text(cleaned_text: str) -> List[str]:
    """
    Extracts potential Acts, Ordinances, and Sections referenced in the judgment.
    Uses the EXACT pattern and logic from your test script.
    """
    logger.info("Extracting acts from cleaned text...")
    
    # EXACT pattern from test script
    pattern = r'((?:[A-Z][a-z]+\s){0,3}(?:Act|Ordinance|Code|Law)\s*(?:No\.\s*\d+\s*of\s*\d{4})?)'
    
    # EXACT findall method from test script
    acts = re.findall(pattern, cleaned_text)
    
    # EXACT cleaning from test script
    acts = list(set([a.strip() for a in acts if len(a.strip()) > 3]))
    
    logger.info(f"Found {len(acts)} unique acts.")
    
    if acts:
        logger.info("Acts found:")
        for act in acts:
            logger.info(f"  - {act}")
    else:
        logger.warning("No acts found with current pattern")
    
    return acts

def extract_act_contexts(text: str, act_name: str, window: int = 400) -> List[str]:
    """
    Extracts context windows around mentions of a specific act name.
    """
    contexts = []
    escaped_act_name = re.escape(act_name)
    for match in re.finditer(escaped_act_name, text, flags=re.I):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        contexts.append(text[start:end])
    return contexts

def preprocess_judgment_for_lineage(raw_text: str) -> Dict[str, Any]:
    """
    Runs the full preprocessing pipeline: cleaning, act extraction.
    """
    logger.info("Starting full preprocessing pipeline for lineage...")
    cleaned_text = clean_judgment_text(raw_text)
    acts_list = extract_acts_from_text(cleaned_text)

    return {
        "cleaned_text": cleaned_text,
        "acts_list": acts_list
    }
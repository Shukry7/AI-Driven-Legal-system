"""
Service for storing and managing clause prediction suggestion decisions.
Stores user decisions (accept/reject/edit) for suggestions before finalizing the document.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Storage directory for suggestion decisions
SUGGESTIONS_DIR = Path(__file__).parent.parent.parent / "uploads" / ".suggestions"
SUGGESTIONS_DIR.mkdir(exist_ok=True)


def get_suggestions_file(filename: str) -> Path:
    """Get the path to the suggestions storage file for a document."""
    # Sanitize filename
    safe_filename = filename.replace("/", "_").replace("\\", "_")
    return SUGGESTIONS_DIR / f"{safe_filename}.suggestions.json"


def save_suggestion_decision(
    filename: str,
    clause_key: str,
    suggestion_text: str,
    status: str,  # "accepted", "rejected", "edited"
    confidence: Optional[float] = None,
    edited_text: Optional[str] = None
) -> Dict:
    """
    Save a user's decision on a clause suggestion.
    
    Args:
        filename: The document filename
        clause_key: The clause key (e.g., "judge_names")
        suggestion_text: The original suggested text
        status: "accepted", "rejected", or "edited"
        confidence: The LLM confidence score (0-1)
        edited_text: The user-edited text (if status is "edited")
    
    Returns:
        The saved decision dict
    """
    suggestions_file = get_suggestions_file(filename)
    
    # Load existing suggestions
    if suggestions_file.exists():
        with open(suggestions_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {
            "filename": filename,
            "suggestions": {},
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    
    # Save the decision
    data["suggestions"][clause_key] = {
        "clause_key": clause_key,
        "suggestion_text": suggestion_text,
        "status": status,
        "confidence": confidence,
        "edited_text": edited_text,
        "timestamp": datetime.now().isoformat()
    }
    data["updated_at"] = datetime.now().isoformat()
    
    # Write to file
    with open(suggestions_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return data["suggestions"][clause_key]


def get_all_decisions(filename: str) -> Dict[str, Dict]:
    """
    Get all suggestion decisions for a document.
    
    Returns:
        Dict mapping clause_key to decision dict
    """
    suggestions_file = get_suggestions_file(filename)
    
    if not suggestions_file.exists():
        return {}
    
    with open(suggestions_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("suggestions", {})


def get_accepted_suggestions(filename: str) -> List[Dict]:
    """
    Get only the accepted/edited suggestions for a document.
    
    Returns:
        List of accepted suggestion dicts with final text to insert
    """
    all_decisions = get_all_decisions(filename)
    accepted = []
    
    for clause_key, decision in all_decisions.items():
        if decision["status"] == "accepted":
            accepted.append({
                "clause_key": clause_key,
                "text": decision["suggestion_text"],
                "confidence": decision.get("confidence")
            })
        elif decision["status"] == "edited":
            accepted.append({
                "clause_key": clause_key,
                "text": decision.get("edited_text", decision["suggestion_text"]),
                "confidence": decision.get("confidence")
            })
    
    return accepted


def clear_suggestions(filename: str) -> bool:
    """
    Clear all stored suggestions for a document.
    
    Returns:
        True if file was deleted, False if it didn't exist
    """
    suggestions_file = get_suggestions_file(filename)
    
    if suggestions_file.exists():
        suggestions_file.unlink()
        return True
    
    return False


def get_pending_count(filename: str) -> int:
    """Get count of suggestions that haven't been decided yet."""
    all_decisions = get_all_decisions(filename)
    pending = sum(1 for d in all_decisions.values() if d["status"] == "pending")
    return pending

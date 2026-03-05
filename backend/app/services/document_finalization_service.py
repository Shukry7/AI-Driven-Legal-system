"""
Service for finalizing documents by inserting accepted clause suggestions.
Inserts accepted LLM suggestions into the original document text at appropriate positions.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from .suggestion_storage_service import get_accepted_suggestions
from .clause_prediction_service import PREDICTABLE_CLAUSES

UPLOAD_FOLDER = Path(__file__).parent.parent.parent / "uploads"


def find_insertion_position(text: str, clause_key: str, clause_info: Dict) -> Optional[int]:
    """
    Find the appropriate position to insert a clause suggestion.
    
    Args:
        text: The full document text
        clause_key: The clause identifier
        clause_info: The clause definition from PREDICTABLE_CLAUSES
    
    Returns:
        Character position to insert at, or None if position can't be determined
    """
    # Strategy: Insert clauses at the beginning of relevant sections
    
    # Header clauses go at the very beginning
    if clause_key in ["case_number", "case_title", "court_name", "judge_names", "judge_bench"]:
        return 0
    
    # Dates go near the beginning, after case info
    if clause_key in ["date_of_order", "hearing_dates"]:
        # Try to find after case number or title
        case_num_pattern = r"(Case\s+(?:No\.|Number)|Criminal\s+Appeal|Civil\s+Appeal|Writ\s+Petition)"
        match = re.search(case_num_pattern, text, re.IGNORECASE)
        if match:
            return match.end()
        return 0
    
    # Party information goes after case header
    if clause_key in ["petitioner_name", "respondent_name"]:
        # Look for "PETITIONER" or "RESPONDENT" section headers
        petitioner_match = re.search(r"\n\s*PETITIONER[S]?\s*[:|\n]", text, re.IGNORECASE)
        if petitioner_match and clause_key == "petitioner_name":
            return petitioner_match.end()
        
        respondent_match = re.search(r"\n\s*RESPONDENT[S]?\s*[:|\n]", text, re.IGNORECASE)
        if respondent_match and clause_key == "respondent_name":
            return respondent_match.end()
        
        # If no specific section, insert after case header
        return 0
    
    # Legal representation goes after parties
    if clause_key == "legal_representatives":
        # Look for existing representation section
        rep_match = re.search(r"\n\s*(Counsel|Advocate|Attorney|For\s+the\s+Petitioner)", text, re.IGNORECASE)
        if rep_match:
            return rep_match.start()
        # Otherwise after respondent section
        respondent_match = re.search(r"\n\s*RESPONDENT[S]?\s*[:|\n]", text, re.IGNORECASE)
        if respondent_match:
            # Find end of respondent section
            lines_after = text[respondent_match.end():].split('\n')
            pos = respondent_match.end()
            for line in lines_after[:5]:  # Look at next 5 lines
                pos += len(line) + 1
                if line.strip() and not re.match(r"^\d+\.", line.strip()):
                    break
            return pos
        return 0
    
    # Subject/issues go before main judgment text
    if clause_key == "subject_matter":
        # Look for "ORDER" or "JUDGMENT" keyword
        judgment_match = re.search(r"\n\s*(ORDER|JUDGMENT|DECISION)\s*[:|\n]", text, re.IGNORECASE)
        if judgment_match:
            return judgment_match.start()
        # Otherwise after parties/counsel section
        return len(text) // 5  # Roughly 20% into document
    
    # Referred cases go in legal analysis section
    if clause_key == "referred_cases":
        # Look for existing citations or legal discussion
        citation_match = re.search(r"(AIR|SCC|\d{4}\s+\(\d+\)|referred to|relied upon)", text, re.IGNORECASE)
        if citation_match:
            return citation_match.start()
        # Otherwise in middle of document
        return len(text) // 2
    
    # Default: insert at beginning
    return 0


def insert_clause_text(text: str, clause_key: str, suggestion_text: str, position: int) -> str:
    """
    Insert a clause suggestion at the specified position with proper formatting.
    
    Args:
        text: Original document text
        clause_key: Clause identifier
        suggestion_text: Text to insert
        position: Character position to insert at
    
    Returns:
        Modified text with suggestion inserted
    """
    clause_info = PREDICTABLE_CLAUSES.get(clause_key, {})
    clause_name = clause_info.get("name", clause_key.replace("_", " ").title())
    
    # Format the insertion with appropriate headers
    if clause_key in ["case_number", "case_title", "court_name"]:
        # Header clauses - insert with emphasis
        formatted = f"\n{'='*60}\n{clause_name.upper()}\n{'='*60}\n{suggestion_text}\n\n"
    elif clause_key in ["judge_names", "judge_bench"]:
        # Judge info - labeled format
        formatted = f"\n{clause_name}: {suggestion_text}\n\n"
    elif clause_key in ["petitioner_name", "respondent_name"]:
        # Parties - section format
        formatted = f"\n\n{clause_name.upper()}:\n{suggestion_text}\n"
    elif clause_key == "legal_representatives":
        # Counsel - section format
        formatted = f"\n\nCOUNSEL:\n{suggestion_text}\n"
    elif clause_key == "subject_matter":
        # Subject - descriptive format
        formatted = f"\n\nSUBJECT MATTER:\n{suggestion_text}\n\n"
    elif clause_key in ["date_of_order", "hearing_dates"]:
        # Dates - simple format
        formatted = f"\n{clause_name}: {suggestion_text}\n"
    elif clause_key == "referred_cases":
        # Citations - list format
        formatted = f"\n\nCASES REFERRED:\n{suggestion_text}\n\n"
    else:
        # Default format
        formatted = f"\n\n{clause_name}:\n{suggestion_text}\n\n"
    
    # Insert at position
    return text[:position] + formatted + text[position:]


async def finalize_document_with_suggestions(filename: str) -> Dict:
    """
    Generate final document with all accepted suggestions inserted.
    
    Args:
        filename: The document filename (without .txt extension typically)
    
    Returns:
        Dict with:
        - success: bool
        - original_text: original document text
        - modified_text: text with suggestions inserted
        - inserted_count: number of suggestions inserted
        - inserted_clauses: list of inserted clause keys
        - download_filename: suggested filename for download
    """
    # Get the text file path
    txt_path = UPLOAD_FOLDER / f"{filename}.txt" if not filename.endswith('.txt') else UPLOAD_FOLDER / filename
    
    if not txt_path.exists():
        # Try without .txt extension
        txt_path = UPLOAD_FOLDER / filename
    
    if not txt_path.exists():
        raise FileNotFoundError(f"Document text file not found: {filename}")
    
    # Read original text
    with open(txt_path, 'r', encoding='utf-8') as f:
        original_text = f.read()
    
    # Get accepted suggestions
    accepted = get_accepted_suggestions(filename)
    
    if not accepted:
        return {
            "success": True,
            "original_text": original_text,
            "modified_text": original_text,
            "inserted_count": 0,
            "inserted_clauses": [],
            "download_filename": filename,
            "message": "No suggestions to insert"
        }
    
    # Sort suggestions by insertion position (insert from end to beginning to maintain positions)
    suggestions_with_positions = []
    for suggestion in accepted:
        clause_key = suggestion["clause_key"]
        clause_info = PREDICTABLE_CLAUSES.get(clause_key, {})
        position = find_insertion_position(original_text, clause_key, clause_info)
        if position is not None:
            suggestions_with_positions.append((position, clause_key, suggestion))
    
    # Sort by position (descending) to insert from end first
    suggestions_with_positions.sort(key=lambda x: x[0], reverse=True)
    
    # Insert suggestions
    modified_text = original_text
    inserted_clauses = []
    
    for position, clause_key, suggestion in suggestions_with_positions:
        suggestion_text = suggestion["text"]
        modified_text = insert_clause_text(modified_text, clause_key, suggestion_text, position)
        inserted_clauses.append(clause_key)
    
    # Save the finalized document
    finalized_filename = filename.replace('.txt', '_finalized.txt') if '.txt' in filename else f"{filename}_finalized.txt"
    finalized_path = UPLOAD_FOLDER / finalized_filename
    
    with open(finalized_path, 'w', encoding='utf-8') as f:
        f.write(modified_text)
    
    return {
        "success": True,
        "original_text": original_text,
        "modified_text": modified_text,
        "inserted_count": len(inserted_clauses),
        "inserted_clauses": inserted_clauses,
        "download_filename": finalized_filename,
        "finalized_path": str(finalized_path),
        "message": f"Successfully inserted {len(inserted_clauses)} clause suggestions"
    }

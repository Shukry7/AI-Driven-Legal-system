"""
Service for finalizing documents by inserting accepted clause suggestions.
Inserts accepted LLM suggestions into the original document text at appropriate positions.

In the dual-file system:
- Users edit the CLEAN version (no formatting tags)
- LLM suggestions are applied to the CLEAN version
- On finalization, changes are merged back into the TAGGED version (master with formatting)
- The tagged version is used for final PDF/Word generation
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from .suggestion_storage_service import get_accepted_suggestions
from .clause_prediction_service import PREDICTABLE_CLAUSES
from .text_merge_service import merge_clean_changes_into_tagged

UPLOAD_FOLDER = Path(__file__).parent.parent.parent / "uploads"
logger = logging.getLogger(__name__)


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
    elif clause_key in ["judge_concurrence", "conclusion_section", "disposition_formula", 
                        "procedural_history", "lower_court_findings", "appellant_argument", 
                        "respondent_argument", "legal_framework", "issue_analysis", "cost_order",
                        "leave_to_appeal"]:
        # Narrative and formal sections - insert text directly without label
        # These flow naturally in the judgment without explicit headers
        formatted = f"\n\n{suggestion_text}\n\n"
    else:
        # Default format (for metadata/structural elements that need labels)
        formatted = f"\n\n{clause_name}:\n{suggestion_text}\n\n"
    
    # Insert at position
    return text[:position] + formatted + text[position:]


async def finalize_document_with_suggestions(filename: str, skip_suggestions: bool = False) -> Dict:
    """
    Generate final document with all accepted suggestions inserted.
    
    In the dual-file system:
    1. Load the ORIGINAL clean version (before user edits)
    2. Load the MODIFIED clean version (with user edits and suggestions)
    3. Load the ORIGINAL tagged version (master with formatting)
    4. Use text_merge_service to apply clean changes to tagged version
    5. Save the finalized tagged version for PDF generation
    
    Args:
        filename: The document filename (should be .clean.txt)
        skip_suggestions: If True, skip inserting accepted AI suggestions (just merge user edits)
    
    Returns:
        Dict with:
        - success: bool
        - original_text: original clean document text
        - modified_text: clean text with suggestions inserted
        - finalized_tagged_text: tagged version with changes merged
        - inserted_count: number of suggestions inserted
        - inserted_clauses: list of inserted clause keys
        - download_filename: suggested filename for download
    """
    # Determine file paths for dual-file system
    # Expected: filename is like "document.pdf.clean.txt"
    if filename.endswith('.clean.txt'):
        clean_filename = filename
        base_name = filename.replace('.clean.txt', '')
        tagged_filename = base_name + '.tagged.txt'
        original_clean_filename = base_name + '.clean.txt.original'
    elif filename.endswith('.txt'):
        # Legacy or manual specification
        clean_filename = filename
        base_name = filename.replace('.txt', '')
        tagged_filename = base_name + '.tagged.txt'
        original_clean_filename = filename + '.original'
    else:
        # Add .clean.txt
        base_name = filename
        clean_filename = filename + '.clean.txt'
        tagged_filename = filename + '.tagged.txt'
        original_clean_filename = filename + '.clean.txt.original'
    
    clean_path = UPLOAD_FOLDER / clean_filename
    tagged_path = UPLOAD_FOLDER / tagged_filename
    original_clean_path = UPLOAD_FOLDER / original_clean_filename
    
    # Read current clean text (with user edits and suggestions)
    if not clean_path.exists():
        raise FileNotFoundError(f"Clean text file not found: {clean_filename}")
    
    with open(clean_path, 'r', encoding='utf-8') as f:
        current_clean_text = f.read()
    
    # Read original clean text (for comparison)
    # If no original backup exists, try to use the current clean as both
    if original_clean_path.exists():
        with open(original_clean_path, 'r', encoding='utf-8') as f:
            original_clean_text = f.read()
    else:
        # No backup - assume this is first time, save current as original
        original_clean_text = current_clean_text
        with open(original_clean_path, 'w', encoding='utf-8') as f:
            f.write(original_clean_text)
    
    # Get accepted suggestions to insert (unless skipping)
    accepted = [] if skip_suggestions else get_accepted_suggestions(filename)
    
    modified_clean_text = current_clean_text
    inserted_clauses = []
    
    if accepted and not skip_suggestions:
        logger.info(f"Processing {len(accepted)} accepted suggestions for {filename}")
        
        # Sort suggestions by insertion position (insert from end to beginning)
        suggestions_with_positions = []
        for suggestion in accepted:
            clause_key = suggestion["clause_key"]
            clause_info = PREDICTABLE_CLAUSES.get(clause_key, {})
            clause_name = clause_info.get("name", clause_key.replace("_", " ").title())
            
            # SAFETY CHECK: Skip if suggestion already inserted by frontend
            suggestion_text = suggestion["text"].strip()
            
            # Check 1: Exact suggestion content match (most reliable)
            if suggestion_text in modified_clean_text:
                logger.info(f"  {clause_key}: SKIPPED (exact content match)")
                inserted_clauses.append(f"{clause_key} (skipped - content already present)")
                continue
            
            # Check 2: Check for first 50 characters of suggestion (handles slight variations)
            if len(suggestion_text) > 50:
                suggestion_prefix = suggestion_text[:50]
                if suggestion_prefix in modified_clean_text:
                    logger.info(f"  {clause_key}: SKIPPED (partial content match)")
                    inserted_clauses.append(f"{clause_key} (skipped - partial content match)")
                    continue
            
            # Check 3: Look for formatted clause headers that frontend adds
            # Frontend formats like:
            # "============================================================\nCASE NUMBER\n============================================================"
            # or "PETITIONER NAME:\n" or "COUNSEL:\n"
            clause_header_patterns = [
                f"{'=' * 60}\n{clause_name.upper()}\n{'=' * 60}",  # Header with separators
                f"{clause_name.upper()}:\n",  # Simple header
                f"{clause_name.upper()}\n",  # Just uppercase name
                f"{clause_name}:",  # Title case with colon
            ]
            
            already_inserted = any(pattern in modified_clean_text for pattern in clause_header_patterns)
            if already_inserted:
                logger.info(f"  {clause_key}: SKIPPED (header found)")
                inserted_clauses.append(f"{clause_key} (skipped - header found)")
                continue
            
            logger.info(f"  {clause_key}: Will insert at position {find_insertion_position(modified_clean_text, clause_key, clause_info)}")
            position = find_insertion_position(modified_clean_text, clause_key, clause_info)
            if position is not None:
                suggestions_with_positions.append((position, clause_key, suggestion))
        
        logger.info(f"Found {len(suggestions_with_positions)} suggestions to actually insert")
        
        # Sort by position (descending) to insert from end first
        suggestions_with_positions.sort(key=lambda x: x[0], reverse=True)
        
        # Insert suggestions into clean text
        for position, clause_key, suggestion in suggestions_with_positions:
            suggestion_text = suggestion["text"]
            # Insert without formatting tags (clean version)
            modified_clean_text = insert_clause_text_clean(modified_clean_text, clause_key, suggestion_text, position)
            inserted_clauses.append(clause_key)
        
        # Save the modified clean text
        with open(clean_path, 'w', encoding='utf-8') as f:
            f.write(modified_clean_text)
    
    # Now merge clean changes into tagged version
    finalized_tagged_text = None
    
    if tagged_path.exists():
        with open(tagged_path, 'r', encoding='utf-8') as f:
            original_tagged_text = f.read()
        
        # Use text_merge_service to apply changes
        merge_ok, merge_result = merge_clean_changes_into_tagged(
            original_clean_text,
            modified_clean_text,
            original_tagged_text
        )
        
        if merge_ok:
            finalized_tagged_text = merge_result
            
            # Save finalized tagged version
            finalized_tagged_filename = base_name + '_finalized.tagged.txt'
            finalized_tagged_path = UPLOAD_FOLDER / finalized_tagged_filename
            with open(finalized_tagged_path, 'w', encoding='utf-8') as f:
                f.write(finalized_tagged_text)
        else:
            # Merge failed - return error but don't fail entirely
            finalized_tagged_text = f"[MERGE ERROR: {merge_result}]\n\n{modified_clean_text}"
    else:
        # No tagged version exists (legacy data) - use clean text as tagged
        finalized_tagged_text = modified_clean_text
    
    # Save finalized clean version as well
    finalized_clean_filename = base_name + '_finalized.clean.txt'
    finalized_clean_path = UPLOAD_FOLDER / finalized_clean_filename
    with open(finalized_clean_path, 'w', encoding='utf-8') as f:
        f.write(modified_clean_text)
    
    # Update consolidated metadata to track finalized artifacts
    meta_path = UPLOAD_FOLDER / (base_name + '.meta.json')
    if meta_path.exists():
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            # Add finalized artifacts to the list if not already present
            if 'artifacts' not in meta:
                meta['artifacts'] = []
            finalized_artifacts = [finalized_clean_filename]
            if tagged_path.exists():
                finalized_artifacts.append(base_name + '_finalized.tagged.txt')
            for artifact in finalized_artifacts:
                if artifact not in meta['artifacts']:
                    meta['artifacts'].append(artifact)
            # Update metadata file
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(meta, f)
        except Exception as e:
            logger.exception(f'Failed to update metadata with finalized artifacts: {e}')
    
    return {
        "success": True,
        "original_text": original_clean_text,
        "modified_text": modified_clean_text,
        "finalized_tagged_text": finalized_tagged_text,
        "inserted_count": len(inserted_clauses),
        "inserted_clauses": inserted_clauses,
        "download_filename": finalized_clean_filename,
        "tagged_download_filename": finalized_tagged_filename if tagged_path.exists() else None,
        "finalized_clean_path": str(finalized_clean_path),
        "finalized_tagged_path": str(finalized_tagged_path) if tagged_path.exists() else None,
        "message": f"Successfully finalized document with {len(inserted_clauses)} suggestions"
    }


def insert_clause_text_clean(text: str, clause_key: str, suggestion_text: str, position: int) -> str:
    """
    Insert a clause suggestion at the specified position WITHOUT formatting tags.
    This is for the clean version.
    
    Args:
        text: Original clean document text
        clause_key: Clause identifier
        suggestion_text: Text to insert
        position: Character position to insert at
    
    Returns:
        Modified text with suggestion inserted
    """
    clause_info = PREDICTABLE_CLAUSES.get(clause_key, {})
    clause_name = clause_info.get("name", clause_key.replace("_", " ").title())
    
    # Format the insertion WITHOUT formatting tags (clean version)
    if clause_key in ["case_number", "case_title", "court_name"]:
        # Header clauses
        formatted = f"\n{'='*60}\n{clause_name.upper()}\n{'='*60}\n{suggestion_text}\n\n"
    elif clause_key in ["judge_names", "judge_bench"]:
        # Judge info
        formatted = f"\n{clause_name}: {suggestion_text}\n\n"
    elif clause_key in ["petitioner_name", "respondent_name"]:
        # Parties
        formatted = f"\n\n{clause_name.upper()}:\n{suggestion_text}\n"
    elif clause_key == "legal_representatives":
        # Counsel
        formatted = f"\n\nCOUNSEL:\n{suggestion_text}\n"
    elif clause_key == "subject_matter":
        # Subject
        formatted = f"\n\nSUBJECT MATTER:\n{suggestion_text}\n\n"
    elif clause_key in ["date_of_order", "hearing_dates"]:
        # Dates
        formatted = f"\n{clause_name}: {suggestion_text}\n"
    elif clause_key == "referred_cases":
        # Citations
        formatted = f"\n\nCASES REFERRED:\n{suggestion_text}\n\n"
    elif clause_key in ["judge_concurrence", "conclusion_section", "disposition_formula", 
                        "procedural_history", "lower_court_findings", "appellant_argument", 
                        "respondent_argument", "legal_framework", "issue_analysis", "cost_order",
                        "leave_to_appeal"]:
        # Narrative and formal sections - insert text directly without label
        # These flow naturally in the judgment without explicit headers
        formatted = f"\n\n{suggestion_text}\n\n"
    else:
        # Default format (for metadata/structural elements that need labels)
        formatted = f"\n\n{clause_name}:\n{suggestion_text}\n\n"
    
    # Insert at position
    return text[:position] + formatted + text[position:]

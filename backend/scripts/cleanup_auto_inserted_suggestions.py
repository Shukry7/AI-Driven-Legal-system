"""
Script to clean up auto-inserted AI suggestions that were accidentally added to documents.
This removes the unwanted template text from finalized files and clears suggestion storage.
"""

import os
import re
from pathlib import Path

# Get the uploads directory
BACKEND_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
SUGGESTIONS_DIR = UPLOADS_DIR / ".suggestions"

# Pattern to detect auto-inserted suggestion blocks at the start of files
AUTO_SUGGESTION_PATTERN = re.compile(
    r'^(?:'
    r'Disposition Formula:.*?'
    r'|Appellant Argument Summary:.*?'
    r'|Cost Order:.*?'
    r'|Leave to Appeal Statement:.*?'
    r'|Lower Court Findings Summary:.*?'
    r'|Factual Background Label:.*?'
    r'|Conclusion / Disposition Section:.*?'
    r')+',
    re.DOTALL | re.MULTILINE
)

def remove_auto_inserted_suggestions(filepath: Path) -> bool:
    """
    Remove auto-inserted AI suggestion blocks from a file.
    
    Returns True if file was modified, False otherwise.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has auto-inserted suggestions at the start
        if not any(marker in content[:500] for marker in [
            "Disposition Formula:",
            "Appellant Argument Summary:",
            "Cost Order:",
            "Lower Court Findings Summary:",
            "[placeholder]"
        ]):
            return False
        
        # Find where the actual document starts
        # Look for "IN THE SUPREME COURT" or "SC. Appeal No." or similar patterns
        doc_start_patterns = [
            r'(?:^|\n)(?:IN THE SUPREME COURT|SC\.\s*Appeal\s*No\.|SUPREME COURT)',
            r'(?:^|\n)(?:[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+.*?appellant|respondent)',
        ]
        
        doc_start = -1
        for pattern in doc_start_patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
            if match:
                doc_start = match.start()
                # Backtrack to start of line
                while doc_start > 0 and content[doc_start-1] != '\n':
                    doc_start -= 1
                break
        
        if doc_start > 0:
            # Remove everything before the actual document
            cleaned_content = content[doc_start:].lstrip()
            
            # Save the cleaned file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            
            print(f"✓ Cleaned: {filepath.name}")
            print(f"  Removed {doc_start} characters of auto-inserted suggestions")
            return True
        else:
            print(f"⚠ Skipped: {filepath.name} (couldn't find document start)")
            return False
            
    except Exception as e:
        print(f"✗ Error processing {filepath.name}: {e}")
        return False


def clear_suggestion_storage(filename: str) -> bool:
    """Clear stored suggestions for a file."""
    suggestion_file = SUGGESTIONS_DIR / f"{filename}.suggestions.json"
    if suggestion_file.exists():
        suggestion_file.unlink()
        print(f"✓ Cleared suggestions for: {filename}")
        return True
    return False


def main():
    print("=" * 70)
    print("Cleaning up auto-inserted AI suggestions from documents")
    print("=" * 70)
    print()
    
    # Find all _finalized.clean.txt files
    finalized_files = list(UPLOADS_DIR.glob("*_finalized.clean.txt"))
    
    if not finalized_files:
        print("No finalized files found.")
        return
    
    print(f"Found {len(finalized_files)} finalized files to check:\n")
    
    cleaned_count = 0
    suggestions_cleared = 0
    
    for filepath in finalized_files:
        # Clean the file
        was_modified = remove_auto_inserted_suggestions(filepath)
        if was_modified:
            cleaned_count += 1
            
            # Also clear the suggestion storage for the base filename
            base_name = filepath.name.replace('_finalized.clean.txt', '.pdf.clean.txt')
            if clear_suggestion_storage(base_name):
                suggestions_cleared += 1
        
        print()
    
    print("=" * 70)
    print(f"Cleanup complete!")
    print(f"  Files cleaned: {cleaned_count}/{len(finalized_files)}")
    print(f"  Suggestion storage cleared: {suggestions_cleared}")
    print("=" * 70)
    print()
    print("Note: You may also want to clear suggestion storage for original files:")
    print(f"      {SUGGESTIONS_DIR}")


if __name__ == "__main__":
    main()

"""
Create .original backup files from tagged versions for existing uploads.
This fixes the duplication issue for documents that were uploaded before the fix.
"""

import os
import re
from pathlib import Path

# Get the uploads directory
BACKEND_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BACKEND_DIR / "uploads"


def strip_formatting_tags(text: str) -> str:
    """Remove all formatting tags from text."""
    text = re.sub(r'<<F:[^>]+>>', '', text)
    text = re.sub(r'<</F>>', '', text)
    text = re.sub(r'<<BOLD>>', '', text)
    text = re.sub(r'<</BOLD>>', '', text)
    text = re.sub(r'<<CENTER>>', '', text)
    text = re.sub(r'<</CENTER>>', '', text)
    return text


def create_original_backup(pdf_path: Path) -> bool:
    """Create .original backup from tagged version."""
    base_name = pdf_path.name.replace('.pdf', '')
    tagged_file = UPLOADS_DIR / f"{pdf_path.name}.tagged.txt"
    clean_file = UPLOADS_DIR / f"{pdf_path.name}.clean.txt"
    original_file = UPLOADS_DIR / f"{pdf_path.name}.clean.txt.original"
    
    # Check if files exist
    if not tagged_file.exists():
        print(f"  ⚠ Skipped: No tagged file found")
        return False
    
    if not clean_file.exists():
        print(f"  ⚠ Skipped: No clean file found")
        return False
    
    try:
        # Read tagged version
        with open(tagged_file, 'r', encoding='utf-8') as f:
            tagged_content = f.read()
        
        # Strip formatting tags to get clean version
        clean_content = strip_formatting_tags(tagged_content)
        
        # Save as .original
        with open(original_file, 'w', encoding='utf-8') as f:
            f.write(clean_content)
        
        print(f"  ✓ Created: {original_file.name}")
        return True
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def main():
    print("=" * 70)
    print("Creating .original backup files from tagged versions")
    print("=" * 70)
    print()
    
    # Find all PDF files
    pdf_files = list(UPLOADS_DIR.glob("*.pdf"))
    
    if not pdf_files:
        print("No PDF files found in uploads directory.")
        return
    
    print(f"Found {len(pdf_files)} PDF files:\n")
    
    created_count = 0
    
    for pdf_path in pdf_files:
        print(f"Processing: {pdf_path.name}")
        if create_original_backup(pdf_path):
            created_count += 1
        print()
    
    print("=" * 70)
    print(f"Complete! Created {created_count} backup files.")
    print("=" * 70)
    print()
    print("Note: Now when you edit and download, changes will be properly tracked")
    print("      and duplication will be prevented.")


if __name__ == "__main__":
    main()

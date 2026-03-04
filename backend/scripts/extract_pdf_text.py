#!/usr/bin/env python3
"""
PDF Text Extraction Script
Extracts text from PDF files and saves to text files while preserving layout and formatting.
"""

import os
import sys
import argparse
from pathlib import Path
import pdfplumber
from tqdm import tqdm


def extract_pdf_to_text(pdf_path, output_path, preserve_spacing=True):
    """
    Extract text from a PDF file while preserving layout and formatting.
    
    Args:
        pdf_path: Path to the PDF file
        output_path: Path where the text file will be saved
        preserve_spacing: Whether to preserve spacing and layout
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            extracted_text = []
            
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text with layout preservation
                if preserve_spacing:
                    text = page.extract_text(layout=True)
                else:
                    text = page.extract_text()
                
                if text:
                    extracted_text.append(text)
            
            # Write to output file
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(extracted_text))
            
            return True
    
    except Exception as e:
        print(f"Error processing {pdf_path}: {str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Extract text from PDF files while preserving layout and formatting'
    )
    parser.add_argument(
        '--input',
        type=str,
        default=os.path.join(os.path.dirname(__file__), '..', 'app', 'casefiles'),
        help='Input directory containing PDF files (default: casefiles folder)'
    )
    parser.add_argument(
        '--file',
        type=str,
        default=None,
        help='Process a specific PDF file (optional)'
    )
    parser.add_argument(
        '--no-spacing',
        action='store_true',
        help='Disable layout preservation (extract raw text without spacing)'
    )
    
    args = parser.parse_args()
    
    # Process specific file or directory
    if args.file:
        # Process single file
        pdf_file = args.file
        if not os.path.exists(pdf_file):
            print(f"Error: File not found - {pdf_file}")
            return 1
        
        output_file = os.path.splitext(os.path.basename(pdf_file))[0] + '.txt'
        output_path = os.path.join(os.path.dirname(pdf_file), output_file)
        
        print(f"Extracting: {pdf_file}")
        if extract_pdf_to_text(pdf_file, output_path, not args.no_spacing):
            print(f"✓ Successfully saved to: {output_path}")
        else:
            print(f"✗ Failed to extract: {pdf_file}")
            return 1
    
    else:
        # Process all PDFs in directory
        if not os.path.exists(args.input):
            print(f"Error: Input directory not found - {args.input}")
            return 1
        
        pdf_files = list(Path(args.input).glob('*.pdf'))
        
        if not pdf_files:
            print(f"No PDF files found in {args.input}")
            return 0
        
        print(f"Found {len(pdf_files)} PDF file(s)")
        print()
        
        successful = 0
        failed = 0
        
        for pdf_file in tqdm(pdf_files, desc="Processing PDFs"):
            output_file = pdf_file.stem + '.txt'
            output_path = pdf_file.parent / output_file
            
            if extract_pdf_to_text(str(pdf_file), str(output_path), not args.no_spacing):
                successful += 1
            else:
                failed += 1
        
        print()
        print(f"✓ Successfully processed: {successful} file(s)")
        if failed > 0:
            print(f"✗ Failed: {failed} file(s)")
        
        return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())

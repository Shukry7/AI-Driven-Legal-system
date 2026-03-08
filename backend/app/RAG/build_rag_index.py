"""
RAG Database Indexing Script

This script builds the vector database for RAG-enhanced clause prediction by:
1. Reading all legal documents from the casefiles directory
2. Extracting each type of clause from the documents
3. Creating embeddings using sentence-transformers
4. Storing the embeddings in ChromaDB for fast retrieval

Run this script after:
- Installing new dependencies (pip install -r requirements.txt)
- Adding new legal documents to the casefiles directory
- Updating clause definitions

Usage:
    python build_rag_index.py [--reset] [--verbose]
    
Options:
    --reset: Clear existing database and rebuild from scratch
    --verbose: Show detailed logging
"""

import sys
import os
import argparse
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.RAG.rag_clause_service import get_rag_service, RAGClauseService
from app.services.clause_prediction_service import PREDICTABLE_CLAUSES


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def main():
    """Main indexing function."""
    parser = argparse.ArgumentParser(
        description='Build RAG vector database from legal documents'
    )
    parser.add_argument(
        '--reset',
        action='store_true',
        help='Reset existing database and rebuild from scratch'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    parser.add_argument(
        '--casefiles-dir',
        type=str,
        default=None,
        help='Path to casefiles directory (default: backend/app/casefiles)'
    )
    
    args = parser.parse_args()
    setup_logging(args.verbose)
    
    logger = logging.getLogger(__name__)
    
    print("="*80)
    print("RAG DATABASE INDEXING SCRIPT")
    print("="*80)
    print()
    
    # Get RAG service
    logger.info("Initializing RAG service...")
    rag_service = get_rag_service()
    
    if not rag_service.enabled:
        logger.error("❌ RAG service is not enabled!")
        logger.error("Please ensure the following dependencies are installed:")
        logger.error("  - chromadb (pip install chromadb)")
        logger.error("  - sentence-transformers (pip install sentence-transformers)")
        logger.error("Set RAG_ENABLED=true in your environment variables")
        return 1
    
    logger.info("✅ RAG service initialized successfully")
    
    # Reset database if requested
    if args.reset:
        logger.warning("⚠️ Resetting existing database...")
        confirm = input("This will delete all indexed data. Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            logger.info("Cancelled by user")
            return 0
        rag_service.reset_database()
        logger.info("✅ Database reset complete")
    
    # Determine casefiles directory
    if args.casefiles_dir:
        casefiles_dir = Path(args.casefiles_dir)
    else:
        casefiles_dir = Path(__file__).parent.parent / "casefiles"
    
    if not casefiles_dir.exists():
        logger.error(f"❌ Casefiles directory not found: {casefiles_dir}")
        logger.error("Please specify the correct path with --casefiles-dir")
        return 1
    
    logger.info(f"📁 Casefiles directory: {casefiles_dir}")
    
    # Get list of text files
    text_files = list(casefiles_dir.glob("*.txt"))
    logger.info(f"📄 Found {len(text_files)} documents to index")
    
    if len(text_files) == 0:
        logger.warning("⚠️ No text files found in casefiles directory")
        logger.info("Please add .txt files of legal judgments to the directory")
        return 0
    
    print()
    print(f"Starting indexing of {len(text_files)} documents...")
    print(f"Clause types to extract: {len(PREDICTABLE_CLAUSES)}")
    print()
    
    # Index all documents
    logger.info("🔄 Starting indexing process...")
    stats = rag_service.index_all_documents(
        clause_definitions=PREDICTABLE_CLAUSES,
        casefiles_dir=casefiles_dir
    )
    
    # Display results
    print()
    print("="*80)
    print("INDEXING COMPLETE")
    print("="*80)
    print()
    
    if stats.get("status") == "success":
        print(f"✅ Successfully indexed {stats['documents_processed']} documents")
        print(f"✅ Total clauses indexed: {stats['total_clauses_indexed']}")
        print(f"✅ Clause types in database: {stats['clause_types']}")
        print()
        
        # Show per-clause statistics
        print("Clause Statistics:")
        print("-" * 80)
        for clause_key in PREDICTABLE_CLAUSES.keys():
            clause_stats = rag_service.get_collection_stats(clause_key)
            if clause_stats.get("status") == "success":
                count = clause_stats.get("indexed_examples", 0)
                clause_name = PREDICTABLE_CLAUSES[clause_key]["name"]
                print(f"  {clause_name:40} {count:>3} examples")
        print()
        
        print("🎉 RAG database is ready for use!")
        print("The clause prediction service will now use retrieved examples")
        print("to generate more accurate and contextually relevant suggestions.")
        return 0
    else:
        logger.error(f"❌ Indexing failed: {stats}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

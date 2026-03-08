"""
RAG (Retrieval-Augmented Generation) Service for Clause Prediction

This service implements RAG for generating more accurate clause predictions:
1. Indexes existing legal documents and extracts clause examples
2. Builds a vector database using embeddings (sentence-transformers)
3. When predicting a missing clause, retrieves similar examples from the database
4. Uses retrieved examples as context for the LLM to generate better suggestions

Benefits over direct LLM generation:
- More accurate and contextually relevant suggestions
- Learns from actual legal document patterns
- Reduces hallucination by grounding in real examples
- Adapts to jurisdiction-specific language and formatting

Technology Stack:
- ChromaDB: Lightweight vector database
- sentence-transformers: For semantic embeddings
- OpenAI GPT: For generation with retrieved context
"""

import os
import re
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import hashlib

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logging.warning("ChromaDB not installed. RAG features will be disabled.")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logging.warning("sentence-transformers not installed. RAG features will be disabled.")

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

RAG_ENABLED = os.getenv("RAG_ENABLED", "true").lower() == "true"
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")  # Fast and efficient
CHROMA_PERSIST_DIR = Path(__file__).parent.parent.parent / "uploads" / ".chroma_db"
CASEFILES_DIR = Path(__file__).parent.parent / "casefiles"

# Number of similar examples to retrieve for context
TOP_K_RETRIEVAL = int(os.getenv("RAG_TOP_K", "3"))


class RAGClauseService:
    """
    RAG service for clause prediction that retrieves similar examples
    from existing legal documents before generating predictions.
    """
    
    def __init__(self, persist_directory: Optional[Path] = None):
        """
        Initialize RAG service with vector database and embedding model.
        
        Args:
            persist_directory: Directory to store/load vector database
        """
        self.enabled = RAG_ENABLED and CHROMADB_AVAILABLE and SENTENCE_TRANSFORMERS_AVAILABLE
        
        if not self.enabled:
            logger.warning("RAG service disabled (missing dependencies or RAG_ENABLED=false)")
            return
        
        self.persist_dir = persist_directory or CHROMA_PERSIST_DIR
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize embedding model
        try:
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
            self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.enabled = False
            return
        
        # Initialize ChromaDB client
        try:
            self.chroma_client = chromadb.PersistentClient(
                path=str(self.persist_dir),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Create or get collection for each clause type
            self.collections = {}
            logger.info("✅ ChromaDB client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.enabled = False
    
    def _get_or_create_collection(self, clause_type: str):
        """Get or create a ChromaDB collection for a specific clause type."""
        if clause_type not in self.collections:
            collection_name = f"clauses_{clause_type}"
            try:
                self.collections[clause_type] = self.chroma_client.get_or_create_collection(
                    name=collection_name,
                    metadata={"clause_type": clause_type}
                )
                logger.info(f"Collection '{collection_name}' ready")
            except Exception as e:
                logger.error(f"Failed to create collection for {clause_type}: {e}")
                return None
        return self.collections[clause_type]
    
    def extract_clause_from_document(self, text: str, clause_type: str, 
                                     detection_regex: str, scope: str) -> Optional[str]:
        """
        Extract a specific clause from a document using regex pattern.
        
        Args:
            text: Full document text
            clause_type: Type of clause (e.g., 'judge_concurrence')
            detection_regex: Regex pattern to find the clause
            scope: Scope to search ('full', 'first_30_percent', 'last_20_percent', etc.)
        
        Returns:
            Extracted clause text or None if not found
        """
        # Get text scope
        text_len = len(text)
        if scope == "first_30_percent":
            search_text = text[:int(text_len * 0.3)]
        elif scope == "first_40_percent":
            search_text = text[:int(text_len * 0.4)]
        elif scope == "last_20_percent":
            search_text = text[int(text_len * 0.8):]
        elif scope == "last_40_percent":
            search_text = text[int(text_len * 0.6):]
        else:
            search_text = text
        
        try:
            match = re.search(detection_regex, search_text, re.MULTILINE | re.IGNORECASE)
            if match:
                # Extract surrounding context (500 chars before and after)
                start_pos = max(0, match.start() - 500)
                end_pos = min(len(search_text), match.end() + 500)
                clause_text = search_text[start_pos:end_pos].strip()
                return clause_text
        except re.error as e:
            logger.warning(f"Regex error for clause {clause_type}: {e}")
        
        return None
    
    def index_document(self, document_path: Path, clause_definitions: Dict[str, Dict]) -> int:
        """
        Index a single legal document, extracting and storing all clauses.
        
        Args:
            document_path: Path to the document file
            clause_definitions: Dict of clause definitions (PREDICTABLE_CLAUSES)
        
        Returns:
            Number of clauses indexed
        """
        if not self.enabled:
            return 0
        
        try:
            with open(document_path, 'r', encoding='utf-8') as f:
                document_text = f.read()
        except Exception as e:
            logger.error(f"Failed to read document {document_path}: {e}")
            return 0
        
        indexed_count = 0
        document_id = document_path.stem
        
        # Extract each clause type
        for clause_key, clause_info in clause_definitions.items():
            clause_text = self.extract_clause_from_document(
                document_text,
                clause_key,
                clause_info["detection_regex"],
                clause_info["detection_scope"]
            )
            
            if clause_text:
                # Get or create collection for this clause type
                collection = self._get_or_create_collection(clause_key)
                if collection is None:
                    continue
                
                # Generate unique ID for this clause instance
                clause_id = f"{document_id}_{clause_key}"
                
                # Create embedding
                try:
                    embedding = self.embedding_model.encode(clause_text).tolist()
                    
                    # Store in vector database
                    collection.add(
                        embeddings=[embedding],
                        documents=[clause_text],
                        metadatas=[{
                            "document_id": document_id,
                            "clause_type": clause_key,
                            "clause_name": clause_info["name"],
                            "source_file": str(document_path),
                        }],
                        ids=[clause_id]
                    )
                    indexed_count += 1
                except Exception as e:
                    logger.error(f"Failed to index clause {clause_key} from {document_id}: {e}")
        
        return indexed_count
    
    def index_all_documents(self, clause_definitions: Dict[str, Dict],
                           casefiles_dir: Optional[Path] = None) -> Dict[str, int]:
        """
        Index all documents in the casefiles directory.
        
        Args:
            clause_definitions: Dict of clause definitions (PREDICTABLE_CLAUSES)
            casefiles_dir: Directory containing case files
        
        Returns:
            Dict with indexing statistics
        """
        if not self.enabled:
            logger.warning("RAG service not enabled, skipping indexing")
            return {"status": "disabled", "indexed": 0}
        
        casefiles_dir = casefiles_dir or CASEFILES_DIR
        
        if not casefiles_dir.exists():
            logger.error(f"Casefiles directory not found: {casefiles_dir}")
            return {"status": "error", "message": "Directory not found"}
        
        # Find all text files
        text_files = list(casefiles_dir.glob("*.txt"))
        logger.info(f"Found {len(text_files)} documents to index")
        
        total_indexed = 0
        documents_processed = 0
        
        for doc_path in text_files:
            logger.info(f"Indexing: {doc_path.name}")
            count = self.index_document(doc_path, clause_definitions)
            total_indexed += count
            documents_processed += 1
        
        stats = {
            "status": "success",
            "documents_processed": documents_processed,
            "total_clauses_indexed": total_indexed,
            "clause_types": len(self.collections)
        }
        
        logger.info(f"Indexing complete: {stats}")
        return stats
    
    def retrieve_similar_clauses(self, clause_type: str, context: Dict[str, Any],
                                n_results: int = TOP_K_RETRIEVAL) -> List[Dict[str, Any]]:
        """
        Retrieve similar clause examples from the vector database.
        
        Args:
            clause_type: Type of clause to retrieve
            context: Context information for the clause (used to build query)
            n_results: Number of similar examples to retrieve
        
        Returns:
            List of similar clause examples with metadata
        """
        if not self.enabled:
            return []
        
        collection = self._get_or_create_collection(clause_type)
        if collection is None:
            return []
        
        # Check if collection has any documents
        try:
            count = collection.count()
            if count == 0:
                logger.warning(f"No indexed examples for clause type: {clause_type}")
                return []
        except Exception as e:
            logger.error(f"Error checking collection count: {e}")
            return []
        
        # Build query text from context
        query_text = self._build_query_from_context(clause_type, context)
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(query_text).tolist()
            
            # Query the collection
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(n_results, count)
            )
            
            # Format results
            similar_clauses = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    similar_clauses.append({
                        "text": doc,
                        "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                        "distance": results['distances'][0][i] if results['distances'] else None
                    })
            
            logger.info(f"Retrieved {len(similar_clauses)} similar examples for {clause_type}")
            return similar_clauses
        
        except Exception as e:
            logger.error(f"Error retrieving similar clauses: {e}")
            return []
    
    def _build_query_from_context(self, clause_type: str, context: Dict[str, Any]) -> str:
        """
        Build a query string from context information.
        
        Args:
            clause_type: Type of clause
            context: Context dictionary with relevant information
        
        Returns:
            Query string for semantic search
        """
        # Build query based on clause type and available context
        query_parts = [f"Legal document {clause_type}"]
        
        # Add relevant context information
        if "case_type" in context:
            query_parts.append(f"{context['case_type']}")
        
        if "outcome" in context:
            query_parts.append(f"outcome: {context['outcome']}")
        
        if "court" in context:
            query_parts.append(f"{context['court']}")
        
        if "lower_court" in context:
            query_parts.append(f"from {context['lower_court']}")
        
        if "judge_names" in context and context["judge_names"]:
            query_parts.append(f"judges: {', '.join(context['judge_names'][:3])}")
        
        return " ".join(query_parts)
    
    def generate_prompt_with_rag(self, clause_type: str, clause_name: str,
                                context: Dict[str, Any],
                                similar_examples: List[Dict[str, Any]]) -> str:
        """
        Generate an enhanced prompt with retrieved examples for the LLM.
        
        Args:
            clause_type: Type of clause to generate
            clause_name: Human-readable name of the clause
            context: Context information for generation
            similar_examples: Retrieved similar clause examples
        
        Returns:
            Enhanced prompt with examples
        """
        prompt_parts = [
            f"Task: Generate a {clause_name} for a legal judgment document.\n",
            "\n## Context Information:",
        ]
        
        # Add context
        for key, value in context.items():
            if key != "clause_type" and key != "insertion_point" and value:
                if isinstance(value, dict):
                    prompt_parts.append(f"- {key}: {json.dumps(value, indent=2)}")
                elif isinstance(value, list) and value:
                    prompt_parts.append(f"- {key}: {', '.join(map(str, value[:5]))}")
                else:
                    prompt_parts.append(f"- {key}: {value}")
        
        # Add similar examples (RAG component)
        if similar_examples:
            prompt_parts.append("\n## Similar Examples from Actual Legal Documents:")
            for i, example in enumerate(similar_examples, 1):
                source = example.get('metadata', {}).get('document_id', 'Unknown')
                prompt_parts.append(f"\n### Example {i} (from {source}):")
                prompt_parts.append(f"```\n{example['text'][:800]}\n```")
        
        prompt_parts.append("\n## Instructions:")
        prompt_parts.append(
            f"Based on the context and examples above, generate an appropriate {clause_name}. "
            f"Follow the style and format demonstrated in the examples while adapting to the specific context provided. "
            f"Ensure legal accuracy and proper formatting."
        )
        
        return "\n".join(prompt_parts)
    
    def get_collection_stats(self, clause_type: str) -> Dict[str, Any]:
        """
        Get statistics about a clause collection.
        
        Args:
            clause_type: Type of clause
        
        Returns:
            Statistics dictionary
        """
        if not self.enabled:
            return {"status": "disabled"}
        
        collection = self._get_or_create_collection(clause_type)
        if collection is None:
            return {"status": "error", "message": "Collection not found"}
        
        try:
            count = collection.count()
            return {
                "status": "success",
                "clause_type": clause_type,
                "indexed_examples": count
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def reset_database(self):
        """
        Reset the entire vector database (use with caution).
        """
        if not self.enabled:
            return
        
        try:
            self.chroma_client.reset()
            self.collections = {}
            logger.info("Vector database reset successfully")
        except Exception as e:
            logger.error(f"Failed to reset database: {e}")


# ─── Singleton Instance ────────────────────────────────────────────────────────

_rag_service_instance = None


def get_rag_service() -> RAGClauseService:
    """
    Get singleton instance of RAG service.
    
    Returns:
        RAGClauseService instance
    """
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGClauseService()
    return _rag_service_instance

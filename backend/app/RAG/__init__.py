"""RAG (Retrieval-Augmented Generation) module for Legal Document Analysis."""

from .rag_clause_service import get_rag_service, RAGClauseService

__all__ = ['get_rag_service', 'RAGClauseService']

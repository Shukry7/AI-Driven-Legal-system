"""
MongoDB GridFS Service for storing finalized documents.

This service provides functionality to store and retrieve finalized legal documents
in MongoDB using GridFS for efficient large file storage.
"""
import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from gridfs import GridFS
from bson import ObjectId

logger = logging.getLogger(__name__)

# MongoDB Configuration from environment
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "legal_documents")

class MongoDBService:
    """Service for interacting with MongoDB and GridFS."""
    
    def __init__(self):
        """Initialize MongoDB connection and GridFS."""
        self.client: Optional[MongoClient] = None
        self.db = None
        self.fs: Optional[GridFS] = None
        self.connected = False
        self._connect()
    
    def _connect(self):
        """Establish connection to MongoDB."""
        try:
            self.client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[MONGODB_DATABASE]
            self.fs = GridFS(self.db)
            self.connected = True
            logger.info(f"Successfully connected to MongoDB: {MONGODB_DATABASE}")
        except ConnectionFailure as e:
            self.connected = False
            logger.error(f"Failed to connect to MongoDB: {e}")
            logger.warning("MongoDB operations will be disabled. Please check your MongoDB connection.")
        except Exception as e:
            self.connected = False
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
    
    def is_connected(self) -> bool:
        """Check if MongoDB connection is active."""
        if not self.connected or not self.client:
            return False
        try:
            self.client.admin.command('ping')
            return True
        except Exception:
            self.connected = False
            return False
    
    def save_finalized_document(
        self,
        filename: str,
        file_content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Save a finalized document to GridFS.
        
        Args:
            filename: Original filename (e.g., "document.pdf_finalized.clean.txt")
            file_content: The text content of the finalized document
            metadata: Optional metadata dictionary to store with the file
        
        Returns:
            The ObjectId string of the stored file, or None if operation failed
        """
        if not self.is_connected():
            logger.error("Cannot save document: MongoDB not connected")
            return None
        
        try:
            # Prepare metadata
            file_metadata = {
                "original_filename": filename,
                "upload_date": datetime.utcnow(),
                "content_type": "text/plain",
                "file_size": len(file_content.encode('utf-8'))
            }
            
            # Add custom metadata if provided
            if metadata:
                file_metadata.update(metadata)
            
            # Store file in GridFS
            file_id = self.fs.put(
                file_content.encode('utf-8'),
                filename=filename,
                metadata=file_metadata
            )
            
            logger.info(f"Successfully saved document to GridFS: {filename} (ID: {file_id})")
            return str(file_id)
            
        except OperationFailure as e:
            logger.error(f"MongoDB operation failed while saving document: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error saving document to GridFS: {e}")
            return None
    
    def get_document_by_id(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a document from GridFS by its ObjectId.
        
        Args:
            file_id: The ObjectId string of the file
        
        Returns:
            Dictionary with 'content' and 'metadata', or None if not found
        """
        if not self.is_connected():
            logger.error("Cannot retrieve document: MongoDB not connected")
            return None
        
        try:
            grid_out = self.fs.get(ObjectId(file_id))
            content = grid_out.read().decode('utf-8')
            
            return {
                "content": content,
                "metadata": grid_out.metadata,
                "filename": grid_out.filename,
                "upload_date": grid_out.upload_date
            }
        except Exception as e:
            logger.error(f"Error retrieving document from GridFS: {e}")
            return None
    
    def get_document_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the latest document from GridFS by filename.
        
        Args:
            filename: The filename to search for
        
        Returns:
            Dictionary with 'content' and 'metadata', or None if not found
        """
        if not self.is_connected():
            logger.error("Cannot retrieve document: MongoDB not connected")
            return None
        
        try:
            # Get the most recent file with this filename
            grid_out = self.fs.find_one({"filename": filename}, sort=[("uploadDate", -1)])
            
            if not grid_out:
                logger.warning(f"No document found with filename: {filename}")
                return None
            
            content = grid_out.read().decode('utf-8')
            
            return {
                "content": content,
                "metadata": grid_out.metadata,
                "filename": grid_out.filename,
                "upload_date": grid_out.upload_date,
                "file_id": str(grid_out._id)
            }
        except Exception as e:
            logger.error(f"Error retrieving document from GridFS: {e}")
            return None
    
    def list_documents(self, limit: int = 50, skip: int = 0) -> list[Dict[str, Any]]:
        """
        List stored documents with their metadata.
        
        Args:
            limit: Maximum number of documents to return
            skip: Number of documents to skip (for pagination)
        
        Returns:
            List of document metadata dictionaries
        """
        if not self.is_connected():
            logger.error("Cannot list documents: MongoDB not connected")
            return []
        
        try:
            documents = []
            for grid_out in self.fs.find().sort("uploadDate", -1).skip(skip).limit(limit):
                documents.append({
                    "file_id": str(grid_out._id),
                    "filename": grid_out.filename,
                    "upload_date": grid_out.upload_date,
                    "length": grid_out.length,
                    "metadata": grid_out.metadata
                })
            return documents
        except Exception as e:
            logger.error(f"Error listing documents from GridFS: {e}")
            return []
    
    def delete_document(self, file_id: str) -> bool:
        """
        Delete a document from GridFS.
        
        Args:
            file_id: The ObjectId string of the file to delete
        
        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.is_connected():
            logger.error("Cannot delete document: MongoDB not connected")
            return False
        
        try:
            self.fs.delete(ObjectId(file_id))
            logger.info(f"Successfully deleted document from GridFS: {file_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting document from GridFS: {e}")
            return False
    
    def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("MongoDB connection closed")


# Global singleton instance
_mongodb_service: Optional[MongoDBService] = None


def get_mongodb_service() -> MongoDBService:
    """Get or create the global MongoDB service instance."""
    global _mongodb_service
    if _mongodb_service is None:
        _mongodb_service = MongoDBService()
    return _mongodb_service


def save_finalized_document_to_gridfs(
    filename: str,
    file_path: Path,
    analysis_metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Convenience function to save a finalized document file to GridFS.
    
    Args:
        filename: Document filename
        file_path: Path to the file to save
        analysis_metadata: Optional metadata about the clause analysis
    
    Returns:
        The ObjectId string of the stored file, or None if operation failed
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        service = get_mongodb_service()
        return service.save_finalized_document(filename, content, analysis_metadata)
    except Exception as e:
        logger.error(f"Error reading file for GridFS storage: {e}")
        return None

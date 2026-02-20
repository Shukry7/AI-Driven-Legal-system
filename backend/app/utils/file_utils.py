"""
File handling utilities for the backend.

Provides helper functions for managing uploaded files, temporary storage,
and file operations.
"""

import os
from pathlib import Path
from typing import Optional


def get_uploads_dir(base_path: str) -> str:
    """
    Get or create the uploads directory.
    
    Args:
        base_path: Base path of the application
        
    Returns:
        str: Absolute path to uploads directory
    """
    uploads_dir = os.path.join(base_path, '..', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    return uploads_dir


def save_uploaded_file(file_bytes: bytes, filename: str, base_path: str) -> str:
    """
    Save uploaded file bytes to disk.
    
    Args:
        file_bytes: Raw file bytes
        filename: Name to save the file as
        base_path: Base path of the application
        
    Returns:
        str: Absolute path where file was saved
        
    Raises:
        IOError: If file cannot be saved
    """
    uploads_dir = get_uploads_dir(base_path)
    file_path = os.path.join(uploads_dir, filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_bytes)
    
    return file_path


def save_text_file(text: str, filepath: str) -> None:
    """
    Save text content to a file.
    
    Args:
        text: Text content to save
        filepath: Path where to save the file
        
    Raises:
        IOError: If file cannot be saved
    """
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)


def read_text_file(filepath: str) -> Optional[str]:
    """
    Read text content from a file.
    
    Args:
        filepath: Path to the file to read
        
    Returns:
        str: File content or None if file doesn't exist
    """
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return None


def ensure_directory_exists(directory: str) -> None:
    """
    Ensure a directory exists, create if it doesn't.
    
    Args:
        directory: Directory path to check/create
    """
    os.makedirs(directory, exist_ok=True)

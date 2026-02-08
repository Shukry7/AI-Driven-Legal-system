"""
Response formatting utilities for consistent API responses.

Provides helper functions to ensure all API endpoints return
responses in a standardized format.
"""

from typing import Any, Dict, Optional
from flask import jsonify


def success_response(data: Any, message: str = "Success", status_code: int = 200):
    """
    Create a standardized success response.
    
    Args:
        data: Response data (dict, list, or any JSON-serializable type)
        message: Optional success message
        status_code: HTTP status code (default 200)
        
    Returns:
        Flask JSON response with status code
    """
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    return jsonify(response), status_code


def error_response(error: str, details: Optional[Dict] = None, status_code: int = 400):
    """
    Create a standardized error response.
    
    Args:
        error: Error message
        details: Optional additional error details
        status_code: HTTP status code (default 400)
        
    Returns:
        Flask JSON response with status code
    """
    response = {
        "success": False,
        "error": error
    }
    
    if details:
        response["details"] = details
    
    return jsonify(response), status_code


def validation_error_response(errors: Dict[str, str], status_code: int = 422):
    """
    Create a validation error response.
    
    Args:
        errors: Dictionary of field names and error messages
        status_code: HTTP status code (default 422)
        
    Returns:
        Flask JSON response with status code
    """
    response = {
        "success": False,
        "error": "Validation failed",
        "validation_errors": errors
    }
    return jsonify(response), status_code

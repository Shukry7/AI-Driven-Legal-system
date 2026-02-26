#!/bin/bash
# Quick start script for Legal Risk Classification API

echo "=========================================="
echo "Legal Risk Classification API"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "=========================================="
echo "Starting API server..."
echo "=========================================="
echo ""
echo "Access points:"
echo "  - Test Interface: http://localhost:8000/api"
echo "  - API Docs: http://localhost:8000/docs"
echo "  - Health Check: http://localhost:8000/api/health"
echo ""

# Start server
python fastapi_server.py

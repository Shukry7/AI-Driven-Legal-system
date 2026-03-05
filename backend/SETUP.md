# Backend Setup Guide

This backend contains two separate servers:

## 1️⃣ Flask Server (Team's Main Application)

**Port:** 5000 (default)  
**Purpose:** Main application for the team

### Run Flask Server:

```bash
python run.py
```

## 2️⃣ FastAPI Classification Server (Your AI Models)

**Port:** 8000  
**Purpose:** Legal Risk Classification with Legal-BERT models

### Run FastAPI Server:

**Quick Start (Windows):**

```bash
start.bat
```

**Quick Start (Mac/Linux):**

```bash
./start.sh
```

**Or manually:**

```bash
# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
python fastapi_server.py
```

### Access Points:

- **Test Interface:** http://localhost:8000/api
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

### Test the API:

```bash
python test_api.py
```

## Running Both Servers Together

You can run both servers at the same time:

**Terminal 1 - Flask Server:**

```bash
python run.py
```

**Terminal 2 - FastAPI Classification Server:**

```bash
python fastapi_server.py
```

- Flask app will be on http://localhost:5000
- FastAPI app will be on http://localhost:8000

## Frontend Integration

Update your frontend to call the classification API:

```javascript
// In your ClassificationWorkspace component
const analyzeJudgment = async (text) => {
  const response = await fetch("http://localhost:8000/api/classify/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return await response.json();
};
```

## File Structure

```
backend/
├── run.py                    # Flask server entry (team's app)
├── fastapi_server.py         # FastAPI server entry (your AI models)
├── requirements.txt          # All dependencies
├── test_api.py              # Test classification API
├── test_judgment.txt        # Sample test file
├── start.bat / start.sh     # Quick start scripts for FastAPI
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── api/
│   │   ├── routes.py        # Flask routes
│   │   └── classification_routes.py  # FastAPI classification routes
│   └── services/
│       ├── model_loader.py  # Load Legal-BERT models
│       └── classifier.py    # Two-stage classification pipeline
└── ml_models/
    ├── legalbert_clause_segmentation_model/
    └── legalbert_risk_classification_model/
```

## Quick Reference

| Task                         | Command                           |
| ---------------------------- | --------------------------------- |
| Run Flask (team app)         | `python run.py`                   |
| Run FastAPI (classification) | `python fastapi_server.py`        |
| Test classification API      | `python test_api.py`              |
| Install dependencies         | `pip install -r requirements.txt` |
| View API docs                | Open http://localhost:8000/docs   |
| Test interface               | Open http://localhost:8000/api    |

## Notes

- Both servers can run simultaneously on different ports
- FastAPI uses port 8000 (won't conflict with Flask's port 5000)
- The classification API is completely separate from the Flask app
- Your team can continue using the Flask app without any changes

For detailed classification API documentation, see [QUICKSTART.md](QUICKSTART.md) and [API_README.md](API_README.md).

@echo off
echo Starting FastAPI Server...
echo.
echo Server will be available at:
echo - Local: http://localhost:8000
echo - API Docs: http://localhost:8000/docs
echo - ReDoc: http://localhost:8000/redoc
echo.

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Start the FastAPI server with uvicorn
python -m uvicorn fastapi_server:app --host 0.0.0.0 --port 8000 --reload

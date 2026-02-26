@echo off
REM Quick start script for Legal Risk Classification API (Windows)

echo ==========================================
echo Legal Risk Classification API
echo ==========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ==========================================
echo Starting API server...
echo ==========================================
echo.
echo Access points:
echo   - Test Interface: http://localhost:8000/api
echo   - API Docs: http://localhost:8000/docs
echo   - Health Check: http://localhost:8000/api/health
echo.

REM Start server
python fastapi_server.py

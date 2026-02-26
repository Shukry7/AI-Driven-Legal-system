# 🚀 QUICK START GUIDE

## Legal Risk Classification API - Complete Setup & Testing Guide

### 📋 Prerequisites

- Python 3.8 or higher
- pip package manager
- 2GB+ RAM (4GB recommended)
- Your trained Legal-BERT models in place

### 🔧 Setup (5 minutes)

#### Windows Users:

1. Open Command Prompt in the `backend` folder
2. Run the startup script:
   ```cmd
   start.bat
   ```

#### Mac/Linux Users:

1. Open Terminal in the `backend` folder
2. Make the script executable and run:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

#### Manual Setup (if scripts don't work):

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start server
python main.py
```

### ✅ Verify Installation

The server should start and show:

```
INFO:     Loading clause segmentation model...
INFO:     ✓ Clause segmentation model loaded successfully
INFO:     Loading risk classification model...
INFO:     ✓ Risk classification model loaded successfully
INFO:     Device: cpu
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 🧪 Testing the API

#### Option 1: Web Interface (Recommended for First Test)

1. Open your browser
2. Go to: http://localhost:8000/api
3. You'll see a beautiful test interface
4. Try the sample text or paste your own
5. Click "Analyze Text"
6. See the results with visual statistics!

#### Option 2: Run Automated Tests

In a new terminal (keep the server running):

```bash
python test_api.py
```

This will test:

- ✓ Health check
- ✓ Text classification
- ✓ File classification

#### Option 3: Command Line (curl)

**Health Check:**

```bash
curl http://localhost:8000/api/health
```

**Classify Text:**

```bash
curl -X POST "http://localhost:8000/api/classify/text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"The Court finds the defendant breached the contract. Damages are awarded.\"}"
```

**Classify File:**

```bash
curl -X POST "http://localhost:8000/api/classify/file" \
  -F "file=@test_judgment.txt"
```

#### Option 4: Python Script

```python
import requests

# Test the API
response = requests.post(
    "http://localhost:8000/api/classify/text",
    json={"text": "The defendant breached the contract."}
)

result = response.json()
print(f"Found {result['total_clauses']} clauses")
for clause in result['clauses']:
    print(f"- {clause['risk']} risk: {clause['text'][:50]}...")
```

### 📊 Understanding the Response

The API returns:

```json
{
  "total_clauses": 3,
  "clauses": [
    {
      "id": 1,
      "text": "The Defendant breached the contract...",
      "risk": "High",
      "confidence": 94.5,
      "probabilities": { "High": 94.5, "Medium": 4.2, "Low": 1.3 },
      "keyFactors": ["Contains breach language", "Legal liability"]
    }
  ],
  "risk_summary": { "High": 1, "Medium": 1, "Low": 1 },
  "model_info": {
    "segmentation_model": "Legal-BERT (BIO Tagging)",
    "classification_model": "Legal-BERT (Risk Classification)",
    "device": "cpu"
  }
}
```

### 🌐 Access Points

Once running, access:

- **Test Interface**: http://localhost:8000/api
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

### 📁 Test Files

Use the provided `test_judgment.txt` file:

- Contains a complete Sri Lankan court judgment
- ~2500 words with multiple clauses
- Perfect for testing the full pipeline

### 🔗 Frontend Integration

To connect your React frontend:

```javascript
// In your ClassificationWorkspace.tsx or API service

const analyzeJudgment = async (text) => {
  try {
    const response = await fetch("http://localhost:8000/api/classify/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("Analysis failed");

    const result = await response.json();
    return result; // Use this data to populate your UI
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
```

### 🐛 Troubleshooting

**Problem: Models not loading**

- Check models exist in `app/ml_models/`
- Verify `model.safetensors` files are present
- Check Python version (need 3.8+)

**Problem: Out of memory**

- Close other applications
- Use shorter text inputs
- System needs at least 2GB free RAM

**Problem: Slow response**

- First request is always slow (loading models)
- Subsequent requests are faster
- Consider upgrading RAM or using GPU

**Problem: Port 8000 already in use**
Change port in `main.py`:

```python
uvicorn.run("main:app", port=8001)  # Use 8001 instead
```

### 📦 What's Included

```
backend/
├── main.py                    # FastAPI app entry point
├── requirements.txt           # Dependencies
├── test_api.py               # Automated test script
├── test_judgment.txt         # Sample judgment file
├── start.bat / start.sh      # Quick start scripts
├── API_README.md             # Detailed documentation
└── app/
    ├── api/
    │   └── classification_routes.py  # API endpoints
    └── services/
        ├── model_loader.py   # Model loading
        └── classifier.py     # Two-stage pipeline
```

### 🎯 Next Steps

1. ✅ Start the server
2. ✅ Test with web interface
3. ✅ Run automated tests
4. ✅ Integrate with frontend
5. ✅ Deploy to production

### 💡 Pro Tips

- **First time**: Allow 10-15 seconds for model loading
- **Testing**: Use the web interface for quick visual feedback
- **Production**: Consider using GPU for faster inference
- **Debugging**: Check logs in the terminal for detailed info
- **API Docs**: Explore http://localhost:8000/docs for interactive API testing

### 📞 Need Help?

Check the logs in the terminal where the server is running. They show detailed information about what's happening at each step.

**Happy Testing! 🎉**

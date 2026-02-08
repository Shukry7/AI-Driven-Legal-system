# Legal Document Analysis Backend

Backend service for Supreme Court judgment analysis with clause detection, ML integration, and LLM-based suggestions.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run Server

```bash
python run.py
```

Server will start at `http://localhost:5000`

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/              # API endpoints and routes
│   │   ├── routes.py     # Main API routes
│   │   └── __init__.py
│   ├── services/         # Business logic layer
│   │   ├── pdf_service.py              # PDF to text conversion
│   │   ├── clause_detection_service.py # Clause analysis (ML integration pending)
│   │   └── __init__.py
│   ├── ml_models/        # Trained ML models (to be added by team)
│   │   └── __init__.py
│   ├── utils/            # Helper utilities
│   │   ├── file_utils.py      # File operations
│   │   ├── response_utils.py  # API response formatting
│   │   └── __init__.py
│   ├── middleware/       # Custom middleware
│   │   └── __init__.py
│   └── __init__.py       # Flask app factory
├── uploads/              # Uploaded files (auto-created)
├── requirements.txt      # Python dependencies
├── run.py               # Application entry point
└── .env.example         # Environment configuration template
```

---

## 🔌 API Endpoints

### 1. Health Check

```http
GET /
```

**Response:**

```json
{
  "status": "ok",
  "message": "server started successfully"
}
```

### 2. Upload PDF & Extract Text

```http
POST /upload-pdf
Content-Type: multipart/form-data
```

**Request:**

- `file`: PDF file (form-data)

**Response:**

```json
{
  "success": true,
  "preview": "First 2000 characters of extracted text...",
  "full_text_path": "/path/to/saved/text.txt"
}
```

### 3. Analyze Clauses (Main Endpoint)

```http
POST /analyze-clauses
Content-Type: multipart/form-data
```

**Request:**

- `file`: Supreme Court judgment PDF (form-data)

**Response:**

```json
{
  "success": true,
  "filename": "judgment.pdf",
  "saved_pdf_path": "/uploads/judgment.pdf",
  "saved_text_path": "/uploads/judgment.pdf.txt",
  "text_preview": "First 500 characters...",
  "clause_analysis": {
    "text_length": 15000,
    "word_count": 2500,
    "clauses_analyzed": 28,
    "clauses": [
      {
        "clause_name": "Case Title",
        "status": "Missing",
        "confidence": null,
        "content": null,
        "llm_suggestion": null
      }
      // ... 27 more clauses
    ],
    "statistics": {
      "total_clauses": 28,
      "present": 0,
      "missing": 28,
      "corrupt": 0,
      "completion_percentage": 0
    }
  }
}
```

### 4. List All Clauses

```http
GET /clauses/list
```

**Response:**

```json
{
  "success": true,
  "total_clauses": 28,
  "clauses": [
    "Case Title",
    "Bench Composition",
    "Date of Judgment"
    // ... 25 more
  ]
}
```

---

## 🧪 Testing with cURL

### Test PDF Upload

```bash
curl -X POST http://localhost:5000/upload-pdf \
  -F "file=@/path/to/judgment.pdf"
```

### Test Clause Analysis

```bash
curl -X POST http://localhost:5000/analyze-clauses \
  -F "file=@/path/to/judgment.pdf"
```

### List Clauses

```bash
curl http://localhost:5000/clauses/list
```

---

## 📋 Implementation Status

### ✅ Phase 1: PDF Processing (COMPLETED)

- [x] PDF upload endpoint
- [x] PDF to text extraction (using pdfplumber/PyPDF2)
- [x] Text cleaning and normalization
- [x] File storage system
- [x] Basic clause structure

### ⏳ Phase 2: ML Model Integration (PENDING)

- [ ] Load trained ML model
- [ ] Clause detection (28 predefined clauses)
- [ ] Status prediction (Present/Missing/Corrupt)
- [ ] Confidence scores

### ⏳ Phase 3: Regression Validation (PENDING)

- [ ] Regression model integration
- [ ] Prediction validation
- [ ] Accuracy improvement

### ⏳ Phase 4: LLM Integration (PENDING)

- [ ] LLM API setup
- [ ] Missing clause prediction
- [ ] Content suggestion generation

---

## 🤝 Team Collaboration Guide

### Adding Your ML Model

1. **Place your trained model** in `app/ml_models/`

   ```
   app/ml_models/
   ├── your_model_name.pkl
   └── model_config.json
   ```

2. **Create a service file** in `app/services/`

   ```python
   # app/services/your_service.py
   def your_function(data):
       # Your logic here
       return result
   ```

3. **Add endpoint** in `app/api/routes.py`

   ```python
   @main.route('/your-endpoint', methods=['POST'])
   def your_endpoint():
       # Call your service
       return jsonify(result)
   ```

4. **Update requirements.txt** if you need new packages

### Folder Assignments (Example)

- **Member 1**: Clause Detection (`services/clause_detection_service.py`)
- **Member 2**: Document Translation (`services/translation_service.py`)
- **Member 3**: Legal Lineage (`services/lineage_service.py`)
- **Member 4**: Classification (`services/classification_service.py`)

---

## 📦 Dependencies

```
Flask==3.0.0           # Web framework
flask-cors==4.0.0      # CORS support
python-dotenv==1.0.1   # Environment variables
pdfplumber==0.10.3     # PDF text extraction (primary)
PyPDF2==3.0.1          # PDF text extraction (fallback)
```

### Future Dependencies (Uncomment when needed)

```
# transformers - For NLP/LLM
# torch - For ML models
# scikit-learn - For regression
# numpy, pandas - For data processing
```

---

## 🐛 Troubleshooting

### PDF Extraction Fails

- Ensure PDF is not password-protected
- Check if PDF contains searchable text (not scanned images)
- Try using OCR for scanned documents

### Module Import Errors

```bash
pip install -r requirements.txt --upgrade
```

### Port Already in Use

Edit `.env` and change `PORT=5000` to another port

---

## 📝 Next Steps

1. **Train and integrate ML model** for clause detection
2. **Implement regression validation** for better accuracy
3. **Add LLM integration** for missing clause suggestions
4. **Add authentication** if needed
5. **Optimize performance** for large documents

---

## 📚 28 Legal Clauses Detected

1. Case Title
2. Bench Composition
3. Date of Judgment
4. Petitioner Name
5. Respondent Name
6. Case Number
7. Citation
8. Advocate for Petitioner
9. Advocate for Respondent
10. Subject Matter
11. Acts Referred
12. Precedents Cited
13. Facts of the Case
14. Issues Raised
15. Arguments by Petitioner
16. Arguments by Respondent
17. Legal Analysis
18. Ratio Decidendi
19. Obiter Dicta
20. Court's Findings
21. Final Judgment
22. Orders Passed
23. Relief Granted
24. Costs
25. Appeal Provisions
26. Conclusion
27. Dissenting Opinion
28. Concurring Opinion

---

**Built for Final Year Project - Legal Document Analysis System**

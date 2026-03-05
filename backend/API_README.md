# Legal Risk Classification API

AI-powered clause segmentation and risk assessment for Sri Lankan civil court judgments using fine-tuned Legal-BERT models.

## Features

- **Two-Stage Pipeline**:
  1. **Clause Segmentation**: Token-level classification using BIO tagging
  2. **Risk Classification**: Semantic analysis to categorize clauses as High, Medium, or Low risk

- **Multiple Input Methods**:
  - Direct text input via API
  - Text file upload (.txt)
  - Interactive web interface for testing

- **Comprehensive Results**:
  - Segmented clauses with risk levels
  - Confidence scores for each classification
  - Key risk factors identification
  - Risk summary statistics

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Verify Models

Ensure both model directories exist with all required files:

```
backend/app/ml_models/
├── legalbert_clause_segmentation_model/
│   ├── config.json
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── tokenizer_config.json
│   ├── special_tokens_map.json
│   └── vocab.txt
└── legalbert_risk_classification_model/
    ├── config.json
    ├── model.safetensors
    ├── tokenizer.json
    ├── tokenizer_config.json
    ├── special_tokens_map.json
    └── vocab.txt
```

## Running the Server

### Method 1: Using Python directly

```bash
python main.py
```

### Method 2: Using Uvicorn

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- **Test Interface**: http://localhost:8000/api
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## Usage

### 1. Web Interface (Easiest)

Navigate to http://localhost:8000/api in your browser. You'll see a user-friendly interface where you can:

- Paste text directly
- Upload a .txt file
- View results with visual statistics and detailed clause analysis

### 2. API Endpoints

#### Health Check

```bash
curl http://localhost:8000/api/health
```

#### Classify Text

```bash
curl -X POST "http://localhost:8000/api/classify/text" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The Court finds that the Defendant did breach the contract by failing to deliver the materials within the agreed timeframe. The Plaintiff has provided sufficient evidence of financial losses. However, the damages claimed appear excessive."
  }'
```

#### Classify File

```bash
curl -X POST "http://localhost:8000/api/classify/file" \
  -F "file=@judgment.txt"
```

### 3. Python Client Example

```python
import requests

# Analyze text
url = "http://localhost:8000/api/classify/text"
data = {
    "text": "Your legal text here..."
}
response = requests.post(url, json=data)
result = response.json()

print(f"Total Clauses: {result['total_clauses']}")
print(f"High Risk: {result['risk_summary']['High']}")
print(f"Medium Risk: {result['risk_summary']['Medium']}")
print(f"Low Risk: {result['risk_summary']['Low']}")

for clause in result['clauses']:
    print(f"\nClause #{clause['id']}")
    print(f"Risk: {clause['risk']} ({clause['confidence']}% confidence)")
    print(f"Text: {clause['text']}")
```

## Response Format

```json
{
  "total_clauses": 3,
  "clauses": [
    {
      "id": 1,
      "text": "The Defendant failed to deliver...",
      "risk": "High",
      "confidence": 94.5,
      "probabilities": {
        "High": 94.5,
        "Medium": 4.2,
        "Low": 1.3
      },
      "keyFactors": [
        "Contains breach/failure language",
        "Financial liability indicated"
      ]
    }
  ],
  "risk_summary": {
    "High": 1,
    "Medium": 1,
    "Low": 1
  },
  "model_info": {
    "segmentation_model": "Legal-BERT (BIO Tagging)",
    "classification_model": "Legal-BERT (Risk Classification)",
    "device": "cpu"
  }
}
```

## Model Architecture

### Stage 1: Clause Segmentation Model

- **Base**: BERT (Legal-BERT)
- **Task**: Token Classification
- **Labels**: O, B-CLAUSE, I-CLAUSE (BIO tagging)
- **Max Length**: 512 tokens

### Stage 2: Risk Classification Model

- **Base**: BERT (Legal-BERT)
- **Task**: Sequence Classification
- **Labels**: High, Medium, Low
- **Max Length**: 512 tokens

## Testing Examples

### Example 1: Short Judgment

```
The Court finds in favor of the Plaintiff. The Defendant breached the contract. Damages are awarded.
```

### Example 2: Complex Judgment

```
IN THE SUPREME COURT OF SRI LANKA

The Defendant failed to deliver the materials within the agreed timeframe, causing significant financial losses to the Plaintiff. The Plaintiff claims damages amounting to Rs. 5,000,000 for breach of contract. The Defendant admits the delay but disputes the quantum of damages.

Upon careful consideration, this Court finds that the Defendant did breach the contract. However, the quantum of damages claimed appears excessive. The Court notes that the Plaintiff failed to mitigate losses.

The Court orders the Defendant to pay Rs. 2,500,000 within 60 days. Any further delays will result in additional penalties as prescribed by law.
```

## Performance Notes

- **First Request**: May take 5-10 seconds as models load into memory
- **Subsequent Requests**: Typically 1-3 seconds depending on text length
- **GPU Acceleration**: Automatically used if CUDA is available
- **Memory Usage**: ~2GB RAM (CPU mode), ~4GB VRAM (GPU mode)

## Troubleshooting

### Models not loading

- Verify all model files are present
- Check file permissions
- Ensure Python version >= 3.8

### Out of memory errors

- Reduce input text length
- Use CPU instead of GPU
- Increase system RAM/VRAM

### Slow inference

- First request is always slower (model loading)
- Use GPU if available
- Consider batching multiple requests

## API Integration with Frontend

To connect with your React frontend:

```javascript
// In your frontend code
const analyzeJudgment = async (text) => {
  const response = await fetch("http://localhost:8000/api/classify/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const result = await response.json();
  return result;
};
```

## License

This project is part of the AI-Driven Legal System for Sri Lankan civil courts.

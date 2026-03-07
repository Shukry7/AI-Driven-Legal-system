# ⚖️ AI-Driven Legal Document Analysis Platform

> **An AI-powered legal document analysis platform for civil cases in Sri Lanka** — featuring automated clause detection, multilingual translation, legal risk classification, and visual case lineage tracking.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
   - [PDF Processing](#pdf-processing-endpoints)
   - [Clause Detection](#clause-detection-endpoints)
   - [Translation](#translation-endpoints)
   - [Classification](#classification-endpoints)
9. [Frontend Modules](#frontend-modules)
10. [Backend Services](#backend-services)
11. [RAG System](#rag-system)
12. [Development Workflow](#development-workflow)
13. [Scripts](#scripts)

---

## Overview

The **AI-Driven Legal Document Analysis Platform** is a full-stack web application that applies artificial intelligence and natural language processing to Sri Lankan Supreme Court civil judgments. It automates the detection of 28 predefined legal clauses, translates documents English to Sinhala or Tamil using a legal-domain glossary, classifies legal risk levels using Legal-BERT, and visualises case relationships through an interactive lineage map.

**Target Users:** Legal professionals, researchers, and developers working with Sri Lankan civil court judgments.

---

## Key Features

| Feature                       | Description                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Clause Detection**          | Detects 28 predefined legal clauses using Legal-BERT model validated on 450+ judgments. Flags clauses as Present, Missing, or Corrupted. |
| **AI Clause Prediction**      | LLM-powered (OpenAI GPT-4o-mini) prediction of missing clauses using RAG with acceptance/rejection workflow and document finalisation.   |
| **Document Translation**      | Asynchronous English -> Sinhala/Tamil translation with a built-in legal glossary terms. Supports PDF upload and raw text.                |
| **Legal Risk Classification** | Two-stage Legal-BERT pipeline: BIO-tag clause segmentation → High / Medium / Low risk classification with confidence scores.             |
| **Legal Lineage Tracking**    | Visual map of case citations and relationships with an interactive details panel.                                                        |
| **PDF Processing**            | Multi-strategy PDF extraction (pdfplumber → PyMuPDF → PyPDF2 → OCR fallback). Supports scanned documents via Tesseract OCR.              |
| **RAG Enhancement**           | ChromaDB vector database provides semantically similar case examples to improve LLM clause predictions.                                  |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Browser (React SPA)                             │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │   Clause   │  │ Translation │  │Classification│  │ Legal Lineage  │  │
│  │  Module    │  │   Module    │  │   Module    │  │    Module      │  │
│  └─────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  │
└────────┼────────────────┼────────────────┼─────────────────┼────────────┘
         │                │   HTTP / REST   │                 │
┌────────▼────────────────▼────────────────▼─────────────────▼────────────┐
│                       FastAPI Backend  (port 8000)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ pdf_routes   │  │clause_routes │  │trans_routes  │  │class_routes │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │                  │        │
│  ┌──────▼─────────────────▼──────────────────▼──────────────────▼──────┐│
│  │                         Core Services                               ││
│  │  pdf_service  clause_detection  translation_service  classifier     ││
│  │  corruption_detection  clause_prediction  rag_clause_service        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  ChromaDB    │  │ OpenAI GPT   │  │  Legal-BERT  │                  │
│  │  (RAG store) │  │  (optional)  │  │   (HuggingFace)│                │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Request flow for clause analysis:**

1. User uploads a PDF via the React frontend.
2. `pdf_routes` extracts text using the multi-strategy `pdf_service`.
3. `clause_detection_service` uses the Legal-BERT model to identify 28 clause types.
4. `corruption_detection_service` flags regions with potential text corruption.
5. If clause prediction is enabled, `clause_prediction_service` queries OpenAI with RAG context from ChromaDB to suggest missing clauses.
6. Results are returned to the frontend where the user can accept/reject suggestions and finalise the document.

---

## Tech Stack

### Backend

| Category                | Library / Tool            | Version         |
| ----------------------- | ------------------------- | --------------- |
| **API Framework**       | FastAPI                   | 0.109.0         |
| **ASGI Server**         | Uvicorn                   | 0.27.0          |
| **PDF Extraction**      | pdfplumber                | 0.10.3          |
| **PDF Extraction**      | PyPDF2                    | 3.0.1           |
| **PDF Extraction**      | PyMuPDF (fitz)            | 1.23.8          |
| **OCR**                 | pytesseract + pdf2image   | 0.3.10 / 1.16.0 |
| **ML Framework**        | PyTorch                   | 2.2.2           |
| **Transformers / NLP**  | Hugging Face Transformers | 4.36.2          |
| **Sentence Embeddings** | sentence-transformers     | ≥2.3.1          |
| **Vector Database**     | ChromaDB                  | ≥0.4.24         |
| **LLM Integration**     | OpenAI Python SDK         | ≥1.12.0         |
| **Translation**         | deep-translator           | 1.11.4          |
| **Transliteration**     | indic-transliteration     | 2.3.43          |
| **ML Utilities**        | scikit-learn              | 1.3.2           |
| **Data Processing**     | pandas + numpy            | 2.1.4 / 1.26.2  |
| **Task Scheduling**     | APScheduler               | 3.10.4          |
| **Auth Utilities**      | python-jose + passlib     | 3.3.0 / 1.7.4   |
| **Config**              | python-dotenv             | 1.0.0           |

### Frontend

| Category           | Library / Tool                  | Version          |
| ------------------ | ------------------------------- | ---------------- |
| **UI Framework**   | React                           | 18.3.1           |
| **Build Tool**     | Vite + SWC                      | 5.4.19           |
| **Language**       | TypeScript                      | 5.8.3            |
| **Routing**        | React Router DOM                | 6.30.1           |
| **Data Fetching**  | TanStack Query (React Query)    | 5.83.0           |
| **UI Components**  | shadcn/ui (Radix UI primitives) | 1.1+             |
| **Styling**        | Tailwind CSS                    | 3.4.17           |
| **Form Handling**  | react-hook-form + Zod           | 7.61.1 / 3.25.76 |
| **Charts**         | Recharts                        | 2.15.4           |
| **PDF Generation** | jsPDF                           | 4.2.0            |
| **Icons**          | lucide-react                    | 0.462.0          |
| **Notifications**  | Sonner                          | 1.7.4            |
| **Theming**        | next-themes                     | 0.3.0            |
| **Date Utilities** | date-fns                        | 3.6.0            |
| **Linting**        | ESLint + typescript-eslint      | 9.32.0 / 8.38.0  |

---

## Project Structure

```text
AI-Driven-Legal-system/
│
├── README.md                          # ← You are here
├── legal_glossary.csv                 # English / Sinhala / Tamil legal terms
│
├── backend/                           # Python FastAPI application
│   ├── fastapi_server.py              # App entry point — mounts all routers, CORS, scheduler
│   ├── requirements.txt               # Python dependencies
│   ├── clear_cache.py                 # Cache cleanup utility
│   ├── test_api.py                    # Basic API smoke tests
│   ├── test_fastapi_migration.py      # Migration regression tests
│   │
│   ├── fastapi_app/                   # FastAPI route layer
│   │   ├── api/
│   │   │   ├── pdf_routes.py          # PDF upload, extraction, save, generate
│   │   │   ├── clause_routes.py       # Clause detection, prediction, finalization
│   │   │   ├── translation_routes.py  # Async translation jobs
│   │   │   └── classification_routes.py # Risk classification + test HTML UI
│   │   └── services/
│   │       ├── classifier.py          # Legal-BERT two-stage inference wrapper
│   │       └── model_loader.py        # Model loading utilities
│   │
│   ├── app/                           # Core domain logic
│   │   ├── services/
│   │   │   ├── clause_detection_service.py      # Main clause analysis orchestrator
│   │   │   ├── clause_patterns.py                # 28 clause regex patterns & metadata
│   │   │   ├── hybrid_clause_detection_service.py# Combined detection strategies
│   │   │   ├── ml_clause_detection_service.py    # ML-based clause detection
│   │   │   ├── clause_prediction_service.py      # LLM-based missing clause prediction
│   │   │   ├── corruption_detection_service.py   # Corrupted region detection
│   │   │   ├── translation_service.py            # Translation job management
│   │   │   ├── translation_correction_service.py # Post-translation correction
│   │   │   ├── pdf_service.py                    # Multi-strategy PDF extraction & generation
│   │   │   ├── suggestion_storage_service.py     # Persist user decisions on AI suggestions
│   │   │   ├── document_finalization_service.py  # Insert accepted suggestions into documents
│   │   │   └── text_merge_service.py             # Text merging utilities
│   │   ├── RAG/
│   │   │   ├── rag_clause_service.py  # ChromaDB vector search service
│   │   │   ├── build_rag_index.py     # Index builder — embed case files into ChromaDB
│   │   │   └── RAG_SETUP.md           # RAG setup documentation
│   │   ├── casefiles/                 # 16 sample Supreme Court judgments (.txt)
│   │   └── ml_models/                 # Trained model storage (gitignored binaries)
│   │
│   └── scripts/                       # One-off maintenance scripts
│       ├── model_training.py
│       ├── extract_pdf_text.py
│       ├── create_original_backups.py
│       ├── cleanup_auto_inserted_suggestions.py
│       └── run_one_off_cleanup.py
│
└── frontend/                          # React + Vite + TypeScript SPA
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── .env                           # VITE_API_BASE_URL
    │
    └── src/
        ├── main.tsx                   # React root mount
        ├── App.tsx                    # Router + global providers
        │
        ├── config/
        │   └── api.ts                 # Typed API helper functions & request interfaces
        │
        ├── pages/
        │   ├── Index.tsx              # Home / dashboard
        │   ├── NotFound.tsx
        │   └── clause/
        │       ├── Entry.tsx          # Clause module entry
        │       ├── Upload.tsx         # Document upload page
        │       ├── Workspace.tsx      # Clause analysis results
        │       └── Suggestions.tsx    # AI suggestion review
        │
        ├── components/
        │   ├── layout/
        │   │   └── Sidebar.tsx        # Navigation sidebar
        │   ├── clause/                # Clause detection feature (8 components)
        │   ├── translation/           # Translation feature (10 components)
        │   ├── classification/        # Risk classification feature (4 components)
        │   ├── legalLineage/          # Legal lineage map (7 components)
        │   └── ui/                    # 45+ shadcn/ui primitive components
        │
        ├── hooks/
        │   ├── use-mobile.tsx
        │   └── use-toast.ts
        │
        └── lib/
            └── utils.ts               # Tailwind class merge utility
```

---

## Getting Started

### Prerequisites

| Requirement     | Minimum Version | Notes                                         |
| --------------- | --------------- | --------------------------------------------- |
| Python          | 3.10+           | 3.11 recommended                              |
| Node.js         | 18+             | LTS recommended                               |
| Tesseract OCR   | 5.0+            | Required for scanned PDFs; install separately |
| CUDA (optional) | 11.8+           | GPU acceleration for ML models                |

> **Windows users:** See [`backend/WINDOWS_INSTALL.md`](backend/WINDOWS_INSTALL.md) for platform-specific instructions.

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Copy and configure environment variables
#    (See "Environment Variables" section below)
cp .env.example .env   # edit as needed

# 5. (Optional) Build the RAG vector index from sample case files
python app/RAG/build_rag_index.py

# 6. Start the FastAPI development server
uvicorn fastapi_server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs (Swagger UI): `http://localhost:8000/docs`  
ReDoc documentation: `http://localhost:8000/redoc`

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

#### Alternative package managers

```bash
# pnpm
pnpm install && pnpm run dev

# Bun
bun install && bun run dev
```

#### Production build

```bash
npm run build      # outputs to frontend/dist/
npm run preview    # locally preview the production build
npm run lint       # run ESLint
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                          | Default       | Description                                                   |
| --------------------------------- | ------------- | ------------------------------------------------------------- |
| `CLAUSE_PREDICTION_MODE`          | `manual`      | `manual` — use template fallback; `openai` — use GPT-4o-mini  |
| `OPENAI_API_KEY`                  | _(unset)_     | OpenAI API key. Required when `CLAUSE_PREDICTION_MODE=openai` |
| `OPENAI_MODEL`                    | `gpt-4o-mini` | OpenAI model identifier for clause prediction                 |
| `UPLOAD_CLEANUP_INTERVAL_MINUTES` | `5`           | How often the background scheduler purges old uploaded files  |

### Frontend (`frontend/.env`)

| Variable            | Default                 | Description                     |
| ------------------- | ----------------------- | ------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

---

## API Reference

All endpoints are documented interactively at `http://localhost:8000/docs`.

### General Endpoints

| Method | Path    | Description                              |
| ------ | ------- | ---------------------------------------- |
| `GET`  | `/`     | API info and endpoint index              |
| `GET`  | `/ping` | Health ping — returns `{"status": "ok"}` |

---

### PDF Processing Endpoints

| Method | Path               | Description                                                   |
| ------ | ------------------ | ------------------------------------------------------------- |
| `POST` | `/upload-pdf`      | Upload a PDF file; extracts and stores text                   |
| `POST` | `/analyze-clauses` | Upload PDF, extract text, and run clause analysis in one step |
| `POST` | `/save-text`       | Save raw text content to the server                           |
| `POST` | `/generate-pdf`    | Generate a finalised PDF from edited text                     |
| `GET`  | `/uploads/recent`  | List the most recently uploaded files                         |

#### `POST /upload-pdf`

**Request:** `multipart/form-data`

| Field  | Type   | Required | Description        |
| ------ | ------ | -------- | ------------------ |
| `file` | `file` | ✅       | PDF file to upload |

**Response:**

```json
{
  "success": true,
  "filename": "judgment.pdf",
  "saved_pdf_path": "/uploads/judgment.pdf",
  "saved_text_path": "/uploads/judgment.txt",
  "text_preview": "IN THE SUPREME COURT...",
  "full_text": "...",
  "clause_analysis": { ... },
  "corruptions": []
}
```

---

### Clause Detection Endpoints

| Method | Path                     | Description                                                                        |
| ------ | ------------------------ | ---------------------------------------------------------------------------------- |
| `GET`  | `/api/clauses/list`      | Returns a list of all 28 supported clause types with keys, names, and descriptions |
| `POST` | `/api/analyze-clauses`   | Analyze a PDF file for all 28 clause types                                         |
| `POST` | `/api/predict-clauses`   | Predict content for missing clauses using LLM / template fallback                  |
| `POST` | `/api/accept-suggestion` | Record acceptance or rejection of an AI-generated clause suggestion                |
| `POST` | `/api/finalize-document` | Insert all accepted suggestions into the document and return the finalised text    |

#### `GET /api/clauses/list`

**Response:**

```json
{
  "success": true,
  "total_clauses": 28,
  "clauses": [
    {
      "key": "case_number",
      "name": "Case Number",
      "description": "Unique identifier for the case (e.g. SC Appeal 12/2020)"
    },
    ...
  ]
}
```

#### `POST /api/analyze-clauses`

**Request:** `multipart/form-data`

| Field  | Type   | Required | Description         |
| ------ | ------ | -------- | ------------------- |
| `file` | `file` | ✅       | PDF file to analyse |

**Response:**

```json
{
  "success": true,
  "filename": "judgment.pdf",
  "clause_analysis": {
    "present": ["case_number", "parties", "court_name"],
    "missing": ["judgment_date", "legal_provisions"],
    "corrupted": ["witness_evidence"],
    "details": {
      "case_number": {
        "status": "present",
        "text": "SC Appeal No. 12/2020",
        "position": { "start": 0, "end": 45 }
      }
    }
  },
  "corruptions": [
    {
      "clause": "witness_evidence",
      "region": "...",
      "reason": "garbled characters detected"
    }
  ]
}
```

#### `POST /api/predict-clauses`

**Request:** `application/json`

| Field             | Type       | Required | Description                          |
| ----------------- | ---------- | -------- | ------------------------------------ |
| `document_text`   | `string`   | ✅       | Full extracted document text         |
| `missing_clauses` | `string[]` | ✅       | List of clause keys to predict       |
| `use_rag`         | `boolean`  | ❌       | Enable RAG context (default: `true`) |

---

### Translation Endpoints

All translation jobs run asynchronously. Submit a job and poll for progress.

| Method   | Path                                   | Description                                           |
| -------- | -------------------------------------- | ----------------------------------------------------- |
| `POST`   | `/api/translate/document`              | Upload a PDF and start an async translation job       |
| `POST`   | `/api/translate/text`                  | Submit raw text for async translation                 |
| `GET`    | `/api/translate/progress/{job_id}`     | Poll translation progress for a job                   |
| `GET`    | `/api/translate/job/{job_id}`          | Retrieve full translation result for a completed job  |
| `GET`    | `/api/translate/history`               | List recent translation jobs                          |
| `GET`    | `/api/translate/export/{job_id}`       | Download translated output (`?format=txt\|pdf\|json`) |
| `POST`   | `/api/translate/cancel/{job_id}`       | Cancel a running translation job                      |
| `POST`   | `/api/translate/skip-section/{job_id}` | Mark a section to skip during translation             |
| `DELETE` | `/api/translate/job/{job_id}`          | Delete a translation job record                       |
| `GET`    | `/api/translate/glossary`              | Browse the legal glossary (`?category=&search=`)      |
| `GET`    | `/api/translate/model-info`            | Translation model performance metadata                |

#### Language Codes

| Code | Language |
| ---- | -------- |
| `en` | English  |
| `si` | Sinhala  |
| `ta` | Tamil    |

#### `POST /api/translate/document`

**Request:** `multipart/form-data`

| Field             | Type     | Default | Description           |
| ----------------- | -------- | ------- | --------------------- |
| `file`            | `file`   | —       | PDF file to translate |
| `source_language` | `string` | `en`    | Source language code  |
| `target_language` | `string` | `si`    | Target language code  |

**Response:**

```json
{
  "success": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "filename": "judgment.pdf",
  "total_sections": 42,
  "model_used": "mBART-legal-en_si"
}
```

#### `GET /api/translate/progress/{job_id}`

**Response:**

```json
{
  "job_id": "550e8400...",
  "status": "processing",
  "progress": 65,
  "completed_sections": 27,
  "total_sections": 42
}
```

#### `GET /api/translate/export/{job_id}`

| Query Param | Values               | Default |
| ----------- | -------------------- | ------- |
| `format`    | `txt`, `pdf`, `json` | `txt`   |

Returns the translated file as a binary download.

---

### Classification Endpoints

| Method | Path                 | Description                                             |
| ------ | -------------------- | ------------------------------------------------------- |
| `GET`  | `/api/health`        | Model health check — reports load status and device     |
| `POST` | `/api/classify/text` | Classify risk for raw JSON text input                   |
| `POST` | `/api/classify/file` | Classify risk for an uploaded `.txt` file               |
| `GET`  | `/api/`              | Built-in HTML test interface for the classification API |

#### `POST /api/classify/text`

**Request:** `application/json`

```json
{
  "text": "The Court finds that the Defendant did breach the contract..."
}
```

**Response:**

```json
{
  "total_clauses": 3,
  "risk_summary": { "High": 1, "Medium": 1, "Low": 1 },
  "clauses": [
    {
      "id": 1,
      "text": "The Court finds that the Defendant did breach the contract...",
      "risk": "High",
      "confidence": 92.5,
      "keyFactors": ["breach of contract", "financial penalty"]
    }
  ],
  "model_info": {
    "segmentation_model": "legal-bert-base-uncased",
    "classification_model": "legal-bert-risk-classifier",
    "device": "cpu"
  }
}
```

#### `POST /api/classify/file`

**Request:** `multipart/form-data`

| Field  | Type   | Description               |
| ------ | ------ | ------------------------- |
| `file` | `file` | UTF-8 encoded `.txt` file |

Returns the same structure as `/api/classify/text`.

---

## Frontend Modules

### 1. Clause Detection Module (`src/components/clause/`)

Provides a multi-step workflow for uploading, analysing, reviewing, and finalising legal documents.

| Component                  | Role                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `ClauseEntry.tsx`          | Module entry screen with navigation to upload or manual input |
| `ClauseDocumentUpload.tsx` | Drag-and-drop PDF upload with progress indicator              |
| `ClauseWorkspace.tsx`      | Side-by-side view of document text and detected clauses       |
| `ClauseComparisonView.tsx` | Compare original vs. suggested clause text                    |
| `ClauseSuggestions.tsx`    | Review, accept, or reject AI-generated clause suggestions     |
| `ManualInputPanel.tsx`     | Paste raw text instead of uploading a PDF                     |
| `ClauseContext.tsx`        | React Context — global state for the clause analysis session  |
| `mock-clauses-data.ts`     | Typed mock data for development and testing                   |

**State managed via `ClauseContext`:**

- `uploadedFile` — the PDF file object
- `extractedText` — raw text from the PDF
- `clauseAnalysis` — detection results (present / missing / corrupted per clause)
- `predictions` — LLM-generated suggestions
- `decisions` — user's accept/reject choices

---

### 2. Translation Module (`src/components/translation/`)

Asynchronous document translation with real-time progress and glossary lookup.

| Component                       | Role                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `TranslationEntry.tsx`          | Translation mode selector (document vs. text)               |
| `DocumentUpload.tsx`            | PDF upload for translation                                  |
| `TranslationWorkspace.tsx`      | Side-by-side source/target text with section navigation     |
| `ComparisonView.tsx`            | Detailed comparison of a single translated section          |
| `GlossaryPanel.tsx`             | Search and browse the 9,057-term legal glossary             |
| `ModelInsights.tsx`             | Display model performance metrics and confidence breakdown  |
| `TranslationSummary.tsx`        | Final summary of word count, confidence, and export options |
| `TranslationFloatingWidget.tsx` | Persistent floating widget for quick inline translation     |
| `TranslationContext.tsx`        | React Context — job ID, progress, and result state          |

---

### 3. Classification Module (`src/components/classification/`)

Paste or upload text to receive AI-powered legal risk classification.

| Component                          | Role                                          |
| ---------------------------------- | --------------------------------------------- |
| `ClassificationEntry.tsx`          | Input selector (text vs. file upload)         |
| `ClassificationDocumentUpload.tsx` | `.txt` file upload handler                    |
| `ClassificationWorkspace.tsx`      | Results view with risk badges and key factors |
| `ClassificationModule.tsx`         | Top-level module container and orchestrator   |

---

### 4. Legal Lineage Module (`src/components/legalLineage/`)

Visualises the citation network and precedent relationships between cases.

| Component                | Role                                                 |
| ------------------------ | ---------------------------------------------------- |
| `LegalLineageModule.tsx` | Module entry and state manager                       |
| `LineageMap.tsx`         | Interactive case relationship graph                  |
| `CaseDetailsPanel.tsx`   | Detailed panel for a selected case node              |
| `ErrorBoundry.tsx`       | Error boundary for graceful failure                  |
| `api.ts`                 | API calls specific to the lineage feature            |
| `types.ts`               | TypeScript interfaces (`CaseNode`, `CaseEdge`, etc.) |
| `index.ts`               | Public exports for the module                        |

---

## Backend Services

### `pdf_service.py`

Handles all PDF operations. Uses a waterfall strategy to maximise extraction quality:

1. **pdfplumber** — primary: high-fidelity text + font metadata (for bold detection)
2. **PyMuPDF (fitz)** — fallback if pdfplumber fails
3. **PyPDF2** — secondary fallback for basic extraction
4. **Tesseract OCR** (via pdf2image) — last resort for scanned/image PDFs

**Key functions:**

| Function                       | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| `pdf_bytes_to_text(data)`      | Extract plain text from PDF bytes; returns `(ok, text)` |
| `pdf_bytes_to_dual_text(data)` | Extract with bold/font markers for clause detection     |
| `strip_bold_markers(text)`     | Remove `<<BOLD>>` / `<<F:...>>` formatting tags         |

---

### `clause_detection_service.py`

Orchestrates clause analysis against the 28 clause definitions.

| Function                                   | Description                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `analyze_clause_detection(text, filename)` | Main entry — runs all clause patterns and returns structured results |

**The 28 Clause Types:**

`case_number`, `parties`, `court_name`, `judges`, `counsel`, `case_type`, `hearing_date`, `judgment_date`, `introduction`, `facts`, `issues`, `applicable_law`, `legal_provisions`, `previous_judgments`, `evidence`, `witness_evidence`, `plaintiff_arguments`, `defendant_arguments`, `court_analysis`, `findings`, `ratio_decidendi`, `obiter_dicta`, `relief_granted`, `damages`, `costs`, `appeal_rights`, `orders`, `signature`

---

### `clause_prediction_service.py`

Predicts text for missing clauses using one of three strategies:

| Mode     | Mechanism                                                                  |
| -------- | -------------------------------------------------------------------------- |
| `openai` | GPT-4o-mini with an engineered prompt; augmented with RAG context          |
| `manual` | Pre-defined template strings per clause type with RAG enhancement          |
| `hybrid` | Tries OpenAI first with RAG; falls back to RAG-enhanced templates on error |

**Key functions:**

| Function                                               | Description                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `predict_missing_clauses(text, missing_keys, use_rag)` | Generate predictions for a list of missing clause keys      |
| `get_prediction_mode()`                                | Returns the currently configured prediction mode            |
| `detect_missing_predictable_clauses(analysis)`         | Filter analysis results to only predictable missing clauses |

---

### `translation_service.py`

Manages translation jobs with a job-queue pattern stored as JSON files.

| Function                                         | Description                                               |
| ------------------------------------------------ | --------------------------------------------------------- |
| `create_job(filename, src, tgt, mode)`           | Create a new translation job and return its UUID          |
| `translate_sections(sections, src, tgt, job_id)` | Translate a list of text sections, updating progress      |
| `get_job_progress(job_id)`                       | Return current progress percentage and status             |
| `get_job(job_id)`                                | Return the full job payload including translated sections |
| `finalize_job(job_id, ...)`                      | Mark a job as completed and store results                 |
| `fail_job(job_id, error)`                        | Mark a job as failed with an error message                |
| `export_translation(job_id, format)`             | Serialise the result to TXT, PDF, or JSON bytes           |
| `get_glossary(category, search)`                 | Search the 9,057-term legal glossary                      |

---

### `corruption_detection_service.py`

Detects corrupted or garbled regions in extracted text that may indicate OCR errors or PDF encoding issues.

---

### `rag_clause_service.py` (RAG)

Provides semantic search over 16 sample case files indexed in ChromaDB.

| Function                                                | Description                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `get_rag_context(clause_key, document_text, n_results)` | Return the `n_results` most semantically similar clause examples from the index |
| `is_rag_available()`                                    | Check if the ChromaDB index has been built                                      |

---

### `classifier.py` (Legal-BERT)

Two-stage Legal-BERT inference pipeline:

1. **Stage 1 — Segmentation:** BIO (Begin-Inside-Outside) token labelling to identify clause boundaries.
2. **Stage 2 — Classification:** Classifies each segmented clause as High / Medium / Low risk with a confidence score.

| Property / Method               | Description                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| `classifier.analyze_text(text)` | Run the full two-stage pipeline; returns structured results |
| `classifier.has_segmentation`   | Boolean — segmentation model is loaded                      |
| `classifier.has_classification` | Boolean — classification model is loaded                    |
| `classifier.device`             | `"cuda"` or `"cpu"`                                         |

---

## RAG System

The Retrieval-Augmented Generation (RAG) system improves LLM predictions by providing relevant real-world examples.

### How It Works

1. `build_rag_index.py` reads 16 sample Supreme Court judgment files from `app/casefiles/`.
2. Each file is chunked and embedded using `sentence-transformers`.
3. Embeddings are stored in a local ChromaDB collection.
4. When predicting a missing clause, `rag_clause_service.py` retrieves the top-N semantically similar chunks and injects them into the LLM prompt as context.

### Building the Index

```bash
cd backend
python app/RAG/build_rag_index.py
```

> See [`backend/app/RAG/RAG_SETUP.md`](backend/app/RAG/RAG_SETUP.md) for detailed configuration.

---

## Development Workflow

```bash
# Create a feature branch
git checkout -b feature/<short-name>

# Make changes and commit often with descriptive messages
git commit -m "Add clause upload UI with drag-and-drop support"

# Open a pull request to main, including:
#   - What changed
#   - How to test
#   - Screenshots (if UI changes)

# Before requesting review, run:
cd frontend && npm run lint
```

**Branch naming conventions:**

| Prefix      | Use case                                    |
| ----------- | ------------------------------------------- |
| `feature/`  | New functionality                           |
| `fix/`      | Bug fixes                                   |
| `refactor/` | Code restructuring without behaviour change |
| `docs/`     | Documentation updates                       |

---

## Scripts

### Frontend (`frontend/package.json`)

| Script      | Command                         | Description                           |
| ----------- | ------------------------------- | ------------------------------------- |
| `dev`       | `vite`                          | Start the Vite HMR development server |
| `build`     | `vite build`                    | Production build (outputs to `dist/`) |
| `build:dev` | `vite build --mode development` | Development build with source maps    |
| `preview`   | `vite preview`                  | Preview the production build locally  |
| `lint`      | `eslint .`                      | Run ESLint on all source files        |

### Backend (`backend/scripts/`)

| Script                                 | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `model_training.py`                    | Train or fine-tune ML classification models                 |
| `extract_pdf_text.py`                  | Batch PDF text extraction utility                           |
| `create_original_backups.py`           | Create backups of original case files before modification   |
| `cleanup_auto_inserted_suggestions.py` | Remove auto-inserted suggestion markers from case files     |
| `run_one_off_cleanup.py`               | One-off cleanup runner (called by the background scheduler) |

---

_Built for the Sri Lankan legal community — automating the analysis of Supreme Court civil judgments with AI._

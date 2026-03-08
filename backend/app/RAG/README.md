# RAG (Retrieval-Augmented Generation) Module

This module implements RAG for intelligent clause prediction in legal documents.

## 📁 Contents

- **`rag_clause_service.py`** - Core RAG service with vector database and embedding management
- **`build_rag_index.py`** - Script to build and update the vector database
- **`RAG_SETUP.md`** - Complete setup and usage documentation
- **`__init__.py`** - Module initialization

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install chromadb sentence-transformers
```

### 2. Build the Vector Database

```bash
python app/RAG/build_rag_index.py
```

### 3. Enable in Environment

Add to your `.env`:

```env
RAG_ENABLED=true
```

## 📚 Documentation

See [RAG_SETUP.md](RAG_SETUP.md) for complete documentation including:

- Architecture overview
- How RAG improves predictions
- Configuration options
- Troubleshooting guide

## 🔧 How It Works

1. **Indexing** - Legal documents are indexed into a vector database
2. **Retrieval** - When predicting a missing clause, similar examples are retrieved
3. **Augmentation** - Retrieved examples are added to the LLM prompt
4. **Generation** - LLM generates contextually relevant predictions

This results in more accurate predictions that match real legal document patterns from your jurisdiction.

## 🗄️ Database Location

Vector database: `backend/uploads/.chroma_db/`

## 📊 Maintenance

Rebuild index when:

- Adding new legal documents to `app/casefiles/`
- Updating clause definitions
- Starting fresh

```bash
python app/RAG/build_rag_index.py --reset
```

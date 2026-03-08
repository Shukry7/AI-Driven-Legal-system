# RAG-Enhanced Clause Prediction

## Overview

Your clause prediction system now uses **RAG (Retrieval-Augmented Generation)** to generate more accurate and contextually relevant suggestions for missing clauses in legal documents.

## What is RAG?

RAG combines:

1. **Retrieval**: Searching for similar examples from existing legal documents
2. **Augmentation**: Using those examples as context
3. **Generation**: LLM generates predictions based on retrieved examples

This approach produces better results than direct LLM generation because it grounds predictions in real legal document patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Upload                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Clause Detection (Regex)                            │
│         Identifies missing clauses                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              RAG Retrieval System                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  1. Extract context (case type, outcome, parties)    │       │
│  │  2. Query vector database (ChromaDB)                 │       │
│  │  3. Retrieve 3 most similar clause examples          │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              LLM Generation (OpenAI GPT)                         │
│  Prompt includes:                                                │
│  - Context from current document                                 │
│  - Retrieved similar examples (RAG)                              │
│  - Standard instructions                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI Suggestion Returned                              │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. RAG Clause Service (`rag_clause_service.py`)

- Manages ChromaDB vector database
- Handles embeddings using sentence-transformers
- Retrieves similar clause examples
- Indexes legal documents

**Key Features:**

- Uses `all-MiniLM-L6-v2` model for fast, efficient embeddings
- Persistent storage (survives server restarts)
- Separate collections for each clause type
- Configurable retrieval (TOP_K parameter)

### 2. Modified Clause Prediction Service

Enhanced with RAG integration:

- `build_clause_prompt_with_rag()`: Builds prompts with retrieved examples
- `call_openai_batch()`: Now retrieves examples before LLM call
- Graceful fallback if RAG unavailable

### 3. Indexing Script (`build_rag_index.py`)

Builds the vector database from your existing legal documents.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:

- `chromadb`: Vector database
- `sentence-transformers`: For semantic embeddings

### 2. Build the RAG Index

First time setup (indexes all documents):

```bash
python app/RAG/build_rag_index.py
```

To rebuild from scratch:

```bash
python app/RAG/build_rag_index.py --reset
```

With verbose output:

```bash
python app/RAG/build_rag_index.py --verbose
```

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# RAG Configuration
RAG_ENABLED=true                    # Enable/disable RAG
EMBEDDING_MODEL=all-MiniLM-L6-v2    # Embedding model
RAG_TOP_K=3                         # Number of examples to retrieve

# Existing OpenAI config
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 4. Run Your Server

```bash
python fastapi_server.py
```

RAG will automatically work in the background when generating clause predictions!

## How It Works - Example

When a **Judge Concurrence Block** is missing:

1. **Extract Context:**
   - Judge names: ["Silva, J.", "Fernando, J.", "Perera, J."]
   - Author: "Silva, J."
   - Court: "Supreme Court"

2. **RAG Retrieval:**
   - Queries vector database for similar judge concurrence blocks
   - Finds 3 most similar examples from past judgments

   ```
   Example 1 (from case: SC_Appeal_79_2002):
   "K. Sripavan, J.
   I agree.
   JUDGE OF THE SUPREME COURT

   S.I. Imam, J.
   I agree.
   JUDGE OF THE SUPREME COURT"
   ```

3. **LLM Generation:**
   - Creates prompt with context + retrieved examples
   - OpenAI generates:

   ```
   Fernando, J.
   I agree.

   JUDGE OF THE SUPREME COURT


   Perera, J.
   I agree.

   JUDGE OF THE SUPREME COURT
   ```

## Benefits of RAG

### Before RAG (Direct LLM)

- ❌ Generic suggestions
- ❌ May not match Sri Lankan judicial style
- ❌ Inconsistent formatting
- ❌ Limited contextual awareness

### After RAG

- ✅ Grounded in actual legal documents
- ✅ Matches Sri Lankan judicial conventions
- ✅ Consistent formatting from examples
- ✅ Contextually relevant (similar case types)
- ✅ Reduces hallucination

## Performance

**Indexing (one-time):**

- Time: ~2-5 minutes for ~15 documents
- Storage: ~50-200 MB for database

**Retrieval (per prediction):**

- Time: ~100-300ms per clause type
- Adds minimal latency to generation

## Maintenance

### Adding New Documents

When you add new legal judgment files to `backend/app/casefiles/`:

1. Re-run indexing script:

   ```bash
   python app/RAG/build_rag_index.py
   ```

2. The new documents will be indexed and available for retrieval

### Updating Clause Definitions

If you modify `PREDICTABLE_CLAUSES`:

1. Rebuild index:
   ```bash
   python app/RAG/build_rag_index.py --reset
   ```

## Troubleshooting

### RAG not working?

Check logs for:

```
⚠️ RAG service disabled (missing dependencies or RAG_ENABLED=false)
```

**Solution:** Ensure dependencies installed:

```bash
pip install chromadb sentence-transformers
```

### No examples retrieved?

Check if database is built:

```bash
python app/RAG/build_rag_index.py
```

### Want to disable RAG temporarily?

Set in `.env`:

```env
RAG_ENABLED=false
```

System will fall back to standard prompts without RAG.

## Technical Details

### Vector Database: ChromaDB

- **Location:** `backend/uploads/.chroma_db/`
- **Type:** Persistent (survives restarts)
- **Collections:** One per clause type (12 total)

### Embedding Model: all-MiniLM-L6-v2

- **Dimensions:** 384
- **Size:** ~90 MB
- **Speed:** ~500 sentences/second on CPU
- **Quality:** Good balance of speed and accuracy

### Similarity Search

- **Algorithm:** HNSW (Hierarchical Navigable Small World)
- **Metric:** Cosine similarity
- **Query time:** O(log n) average case

## Configuration Options

| Variable             | Default              | Description                    |
| -------------------- | -------------------- | ------------------------------ |
| `RAG_ENABLED`        | `true`               | Enable/disable RAG system      |
| `EMBEDDING_MODEL`    | `all-MiniLM-L6-v2`   | Sentence transformer model     |
| `RAG_TOP_K`          | `3`                  | Number of examples to retrieve |
| `CHROMA_PERSIST_DIR` | `uploads/.chroma_db` | Database storage location      |

## API Impact

No changes to existing API! RAG works transparently:

```python
# Your existing code still works
POST /api/clauses/predict
{
  "text": "legal document text..."
}

# Response now includes RAG-enhanced suggestions
{
  "suggestions": {
    "judge_concurrence": {
      "suggestion": "... contextually relevant text ...",
      "confidence": 85,
      "rag_examples_used": 3  # New field
    }
  }
}
```

## Future Enhancements

Possible improvements:

- [ ] Support for similarity threshold filtering
- [ ] Weight recent documents higher
- [ ] Fine-tuning embedding model on legal text
- [ ] Multi-language support for clauses
- [ ] Relevance feedback loop
- [ ] Cross-clause context awareness

## Support

For issues or questions:

1. Check logs in console output
2. Verify RAG service status: Look for "RAG service initialized" in logs
3. Test retrieval: Use `get_collection_stats()` in Python shell

---

**Status:** ✅ RAG system is active and ready to use!

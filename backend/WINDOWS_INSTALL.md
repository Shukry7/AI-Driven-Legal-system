# Windows Installation Guide for RAG Dependencies

If you encountered the "Microsoft Visual C++ 14.0 or greater is required" error, try these solutions:

## ✅ Solution 1: Updated Requirements (Try This First)

The requirements.txt has been updated with Windows-compatible versions. Try installing again:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## ✅ Solution 2: Alternative Installation Order

Install problematic packages separately with no binary build:

```bash
# Install most packages first
pip install fastapi uvicorn openai transformers torch sentence-transformers

# Then try ChromaDB
pip install chromadb --no-build-isolation
```

## ✅ Solution 3: Install Build Tools (If Solutions 1-2 Don't Work)

Download and install Microsoft C++ Build Tools:

1. Visit: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Download "Build Tools for Visual Studio 2022"
3. Run installer
4. Select "Desktop development with C++"
5. Install (requires ~6GB)

Then retry:

```bash
pip install -r requirements.txt
```

## ✅ Solution 4: Use Pre-built Wheels

For Windows, install from pre-built wheels:

```bash
pip install chromadb --prefer-binary
pip install -r requirements.txt
```

## ✅ Solution 5: Run in WSL (Recommended for Development)

Windows Subsystem for Linux avoids Windows build issues:

```bash
# In PowerShell (Admin)
wsl --install

# After restart, in WSL Ubuntu terminal:
cd /mnt/d/Project/AI-Driven-Legal-system/backend
pip install -r requirements.txt
```

## 🔧 Alternative: Disable RAG Temporarily

If you want to test the system without RAG:

1. Set in `.env`:

   ```env
   RAG_ENABLED=false
   ```

2. Install without RAG dependencies:

   ```bash
   pip install fastapi uvicorn openai transformers torch python-dotenv
   ```

3. The system will work with direct LLM predictions (without RAG enhancement)

## ✅ Verify Installation

After successful installation:

```bash
python -c "import chromadb; print('ChromaDB version:', chromadb.__version__)"
python -c "import sentence_transformers; print('Sentence Transformers OK')"
```

## 💡 Still Having Issues?

Common fixes:

- Update pip: `python -m pip install --upgrade pip`
- Clear cache: `pip cache purge`
- Use virtual environment: `python -m venv venv`
- Try Python 3.10 or 3.11 (better compatibility)

## 📊 System Requirements

For RAG to work smoothly on Windows:

- Python 3.9-3.11
- 8GB+ RAM
- 2GB free disk space
- Windows 10/11

---

**Note:** Once ChromaDB is installed, run `python app/RAG/build_rag_index.py` to build the database.

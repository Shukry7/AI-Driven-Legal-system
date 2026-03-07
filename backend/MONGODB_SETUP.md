# MongoDB GridFS Setup Guide

This document explains how to set up MongoDB with GridFS for storing finalized legal documents.

## Overview

When users click "Save to Database" after completing their clause analysis, the system saves the finalized document to MongoDB GridFS.

**How it works:**

1. The finalized document (`*_finalized.clean.txt`) already exists in the `uploads/` folder (created when suggestions are accepted)
2. The system locates this finalized file by filename
3. Reads the complete modified text content
4. Stores it in MongoDB GridFS with metadata

This provides:

- **Complete document storage** - The full modified text file with all accepted changes
- **Efficient storage** for large text documents using GridFS
- **Metadata tracking** with analysis results (clause statistics, timestamps, etc.)
- **Version history** of finalized documents
- **Easy retrieval** by filename or ID

## Prerequisites

### 1. Install MongoDB

#### Windows

Download and install MongoDB Community Edition from:
https://www.mongodb.com/try/download/community

Or install via Chocolatey:

```powershell
choco install mongodb
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get install -y mongodb-org
```

#### macOS

```bash
brew tap mongodb/brew
brew install mongodb-community
```

### 2. Start MongoDB Service

#### Windows

MongoDB typically starts automatically after installation. To verify or start manually:

```powershell
# Start MongoDB service
net start MongoDB

# Or run MongoDB directly
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath="C:\data\db"
```

#### Linux

```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # Enable auto-start
```

#### macOS

```bash
brew services start mongodb-community
```

### 3. Verify MongoDB is Running

```bash
# Should show MongoDB running on port 27017
netstat -an | findstr "27017"

# Or connect with mongo shell
mongosh
```

## Configuration

### 1. Install Python Dependencies

The required `pymongo` package is already added to `requirements.txt`:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add these settings to your `.env` file in the `backend` directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=legal_documents
```

**Configuration Options:**

- `MONGODB_URI`: MongoDB connection string
  - Default: `mongodb://localhost:27017/`
  - For remote/cloud: `mongodb+srv://user:password@cluster.mongodb.net/`
  - For authentication: `mongodb://username:password@localhost:27017/`

- `MONGODB_DATABASE`: Database name for storing documents
  - Default: `legal_documents`

### 3. Restart the Backend Server

After configuration, restart your FastAPI server:

```bash
python -m uvicorn fastapi_server:app --host 0.0.0.0 --port 8000 --reload
```

## Usage

### Saving Documents via UI

1. Upload and analyze a legal document
2. Review and accept/reject clause suggestions (this creates the `*_finalized.clean.txt` file in uploads/)
3. Click the **"Save to Database"** button in the completion dialog
4. System locates the existing `*_finalized.clean.txt` file and saves it to MongoDB GridFS

### What Gets Stored

For each saved document, MongoDB stores:

**Primary Content:**

- **Complete Modified Text File**: The full finalized document with all accepted clause suggestions inserted
- **Filename**: e.g., `SCAppeal82OF2009.pdf_finalized.clean.txt`

**Metadata (attached to the file):**

- Original filename and upload timestamp
- Total clauses, valid clauses counts
- Missing clauses list with details
- Corrupted clauses list
- Accepted/rejected/edited changes
- Count of inserted clauses
- List of which clauses were inserted

**Example:** If you had a document with missing judge signatures and case numbers, after accepting the suggestions and clicking "Save to Database", the **complete text file** with the judge signatures and case numbers **already inserted** is what gets stored in MongoDB.

### API Endpoints

The following endpoints are available in `clause_routes.py`:

#### Save Document to Database

```http
POST /api/save-to-database
Content-Type: multipart/form-data

filename: document.pdf_finalized.clean.txt
analysis_data: {"totalClauses": 15, "validClauses": 13, ...}
```

**Response:**

```json
{
  "success": true,
  "file_id": "507f1f77bcf86cd799439011",
  "filename": "document.pdf_finalized.clean.txt",
  "message": "Document successfully saved to database"
}
```

#### List Stored Documents

```http
GET /api/database-documents?limit=50&skip=0
```

**Response:**

```json
{
  "success": true,
  "documents": [
    {
      "file_id": "507f1f77bcf86cd799439011",
      "filename": "document.pdf_finalized.clean.txt",
      "upload_date": "2026-03-08T10:30:00Z",
      "length": 15234,
      "metadata": {...}
    }
  ],
  "count": 1
}
```

#### Retrieve Document by ID

```http
GET /api/database-document/{file_id}
```

**Response:**

```json
{
  "success": true,
  "document": {
    "content": "Document text content...",
    "metadata": {...},
    "filename": "document.pdf_finalized.clean.txt",
    "upload_date": "2026-03-08T10:30:00Z"
  }
}
```

## MongoDB Management

### View Stored Documents

Using MongoDB Compass (GUI):

1. Download and install MongoDB Compass: https://www.mongodb.com/products/compass
2. Connect to `mongodb://localhost:27017`
3. Select the `legal_documents` database
4. View `fs.files` collection for file metadata
5. View `fs.chunks` collection for file content chunks

Using mongo shell:

```javascript
// Connect to MongoDB
mongosh

// Switch to database
use legal_documents

// List all stored files
db.fs.files.find().pretty()

// Count documents
db.fs.files.countDocuments()

// Find specific file
db.fs.files.findOne({filename: "document.pdf_finalized.clean.txt"})
```

### Delete Old Documents

```javascript
// Delete files older than 30 days
var cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);

db.fs.files.find({ uploadDate: { $lt: cutoffDate } }).forEach(function (file) {
  db.fs.chunks.deleteMany({ files_id: file._id });
  db.fs.files.deleteOne({ _id: file._id });
});
```

## Troubleshooting

### Connection Refused

**Error:** `Failed to connect to MongoDB: Connection refused`

**Solutions:**

1. Verify MongoDB is running:

   ```bash
   # Windows
   net start MongoDB

   # Linux/Mac
   sudo systemctl status mongod
   ```

2. Check if port 27017 is in use:

   ```bash
   netstat -an | findstr "27017"
   ```

3. Check MongoDB logs:

   ```bash
   # Windows
   C:\Program Files\MongoDB\Server\8.0\log\mongod.log

   # Linux
   /var/log/mongodb/mongod.log
   ```

### Authentication Failed

**Error:** `Authentication failed`

Update your connection string with credentials:

```env
MONGODB_URI=mongodb://username:password@localhost:27017/
```

### MongoDB Not Installed

The application will gracefully handle MongoDB being unavailable:

- Save to Database button will show an error message
- Other features continue to work normally
- Check logs for: `"MongoDB operations will be disabled"`

## Cloud MongoDB (MongoDB Atlas)

To use MongoDB Atlas (free cloud tier available):

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Update `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=legal_documents
```

5. Whitelist your IP address in Atlas Security settings

## Best Practices

1. **Backup regularly**: Schedule MongoDB backups
2. **Index metadata**: For faster searches, create indexes:
   ```javascript
   db.fs.files.createIndex({ "metadata.timestamp": -1 });
   db.fs.files.createIndex({ "metadata.originalFilename": 1 });
   ```
3. **Monitor storage**: Keep an eye on database size
4. **Clean old files**: Implement a retention policy for old documents

## Architecture

```
User clicks "Save to Database"
         |
         v
  Frontend (ClauseSuggestions.tsx / ClauseWorkspace.tsx)
  - Derives finalized filename (e.g., "doc.pdf_finalized.clean.txt")
  - Calls saveToDatabase() with finalized filename + analysis metadata
         |
         v
  API Layer (clause_routes.py)
  - POST /api/save-to-database endpoint
    → Looks for finalized file in uploads/ folder
    → Validates file exists
    → Reads complete file content
    → Prepares metadata
         |
         v
  MongoDB Service (mongodb_service.py)
  - Reads the complete modified text file content
  - Creates GridFS document with full text + metadata
  - Stores in MongoDB
         |
         v
  MongoDB (GridFS)
  - fs.files collection (metadata + file info)
  - fs.chunks collection (complete modified file content in 255KB chunks)
```

**Key Points:**

- The `*_finalized.clean.txt` file already exists in `uploads/` (created when suggestions are accepted)
- We just locate it by name and save to MongoDB
- The **complete modified text file** (with accepted clauses inserted) is stored
- NOT just metadata or a report
- You can retrieve the full document text later using the file ID

## Support

If you encounter issues:

1. Check MongoDB connection string in `.env`
2. Verify MongoDB service is running
3. Review backend logs for error messages
4. Check if port 27017 is accessible
5. Test connection with `mongosh`

For more information, see:

- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [GridFS Documentation](https://www.mongodb.com/docs/manual/core/gridfs/)
- [PyMongo Documentation](https://pymongo.readthedocs.io/)

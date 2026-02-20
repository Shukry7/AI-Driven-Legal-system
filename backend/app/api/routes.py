from flask import Blueprint, jsonify, request, current_app, send_file
from werkzeug.utils import secure_filename
import os
import json
import datetime
from io import BytesIO

from ..services.pdf_service import pdf_bytes_to_text, text_to_pdf, strip_bold_markers
from ..services.clause_detection_service import analyze_clause_detection
from ..services.clause_patterns import CLAUSE_DEFINITIONS
from ..services.corruption_detection_service import detect_corruptions

main = Blueprint('main', __name__)


@main.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'server started successfully'})


@main.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Receive a PDF file (form-data, key 'file') and return extracted text.

    - Saves the original PDF into `uploads/` (creates folder if missing)
    - Converts PDF bytes to cleaned text using `pdf_service.pdf_bytes_to_text`
    - Returns JSON with `success`, `text` (truncated preview) and `full_text_path` when successful
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': "No file part in request (use key 'file')"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    saved_path = os.path.join(uploads_dir, filename)
    file_bytes = file.read()
    current_app.logger.info("upload-pdf: received file=%s size=%d from=%s", filename, len(file_bytes), request.remote_addr)
    try:
        with open(saved_path, 'wb') as f:
            f.write(file_bytes)
        current_app.logger.info("upload-pdf: saved PDF to %s", saved_path)
        # write sidecar metadata with upload timestamp (ISO UTC)
        try:
            meta = {
                'filename': filename,
                'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
            }
            with open(saved_path + '.meta.json', 'w', encoding='utf-8') as m:
                json.dump(meta, m)
        except Exception:
            current_app.logger.exception('upload-pdf: failed to write metadata for %s', saved_path)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to save uploaded file: {e}'}), 500

    ok, result = pdf_bytes_to_text(file_bytes)
    extracted_text = None
    if not ok:
        current_app.logger.info("upload-pdf: initial extraction failed: %s; attempting OCR fallback", result)
        try:
            from ..services.pdf_service import _ocr_fallback
            ocr_ok, ocr_result = _ocr_fallback(file_bytes)
        except Exception as e:
            ocr_ok, ocr_result = False, str(e)

        if not ocr_ok:
            return jsonify({'success': False, 'error': f'Extraction failed: {result}; OCR fallback failed: {ocr_result}'}), 500

        extracted_text = ocr_result
        current_app.logger.info("upload-pdf: OCR fallback succeeded, extracted length=%d", len(extracted_text))
    else:
        extracted_text = result
        current_app.logger.info("upload-pdf: completed text extraction length=%d", len(extracted_text))

    # Save extracted text to a .txt file beside the PDF
    txt_path = saved_path + '.txt'
    try:
        with open(txt_path, 'w', encoding='utf-8') as t:
            t.write(extracted_text)
        current_app.logger.info("upload-pdf: saved extracted text to %s", txt_path)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to save extracted text: {e}'}), 500

    # Keep bold markers in the response - frontend will handle display
    preview = extracted_text[:2000]
    return jsonify({'success': True, 'preview': preview, 'full_text': extracted_text, 'full_text_path': txt_path}), 200


@main.route('/analyze-clauses', methods=['POST'])
def analyze_clauses():
    """
    Complete endpoint for clause detection in legal judgments.
    
    This endpoint:
    1. Receives a PDF file (Supreme Court judgment)
    2. Extracts and cleans text from the PDF
    3. Analyzes the text for 28 predefined legal clauses
    4. Returns structured results with clause status
    
    Future phases will add:
    - ML model integration for clause detection
    - Regression-based validation
    - LLM suggestions for missing clauses
    
    Request:
        - Method: POST
        - Content-Type: multipart/form-data
        - Body: 'file' - PDF file of legal judgment
        
    Response:
        {
            "success": true,
            "filename": "judgment.pdf",
            "text_preview": "First 500 chars...",
            "clause_analysis": {
                "text_length": 15000,
                "word_count": 2500,
                "clauses_analyzed": 28,
                "clauses": [...],
                "statistics": {
                    "total_clauses": 28,
                    "present": 20,
                    "missing": 5,
                    "corrupt": 3,
                    "completion_percentage": 71.43
                }
            }
        }
    """
    # Support two modes:
    # 1) Direct file upload (multipart/form-data with 'file') - prefer this for new uploads
    #    Optional form field 'original_filename' may be provided to control saved filename.
    # 2) Reference to an existing file in uploads/ via 'filename' form field (legacy/support)

    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)

    extracted_text = None
    saved_pdf_path = None
    txt_path = None

    # Mode 1: file upload in request.files
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Uploaded file has no filename'}), 400

        # Allow client to suggest a filename (e.g., original_filename); fall back to uploaded filename
        client_name = request.form.get('original_filename') or request.form.get('filename')
        save_name = secure_filename(client_name) if client_name else secure_filename(file.filename)
        # Ensure `filename` is always defined for the response later
        filename = save_name
        saved_pdf_path = os.path.join(uploads_dir, save_name)

        try:
            file_bytes = file.read()
            with open(saved_pdf_path, 'wb') as f:
                f.write(file_bytes)
            current_app.logger.info("analyze-clauses: saved uploaded PDF to %s", saved_pdf_path)
            # write metadata for uploaded PDF
            try:
                meta = {
                    'filename': save_name,
                    'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                with open(saved_pdf_path + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta, m)
            except Exception:
                current_app.logger.exception('analyze-clauses: failed to write metadata for %s', saved_pdf_path)
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to save uploaded PDF: {e}'}), 500

        ok, result = pdf_bytes_to_text(file_bytes)
        if not ok:
            return jsonify({'success': False, 'error': f'PDF text extraction failed: {result}'}), 500

        extracted_text = result
        current_app.logger.info("analyze-clauses: completed text extraction length=%d", len(extracted_text))

        txt_path = saved_pdf_path + '.txt'
        try:
            with open(txt_path, 'w', encoding='utf-8') as t:
                t.write(extracted_text)
            current_app.logger.info("analyze-clauses: saved extracted text to %s", txt_path)
            # write metadata for extracted text as well
            try:
                meta_txt = {
                    'filename': os.path.basename(txt_path),
                    'uploaded_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                with open(txt_path + '.meta.json', 'w', encoding='utf-8') as m:
                    json.dump(meta_txt, m)
            except Exception:
                current_app.logger.exception('analyze-clauses: failed to write metadata for %s', txt_path)
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to save extracted text: {str(e)}'}), 500

    else:
        # Mode 2: existing file reference via form/json 'filename'
        data_filename = None
        if request.form and 'filename' in request.form:
            data_filename = request.form.get('filename')
        elif request.json and isinstance(request.json, dict) and 'filename' in request.json:
            data_filename = request.json.get('filename')

        if not data_filename:
            return jsonify({'success': False, 'error': "No file uploaded and no 'filename' provided."}), 400

        if isinstance(data_filename, str) and data_filename.strip() == '':
            return jsonify({'success': False, 'error': 'please upload document to start analysis'}), 400

        filename = secure_filename(data_filename)
        candidate_path = os.path.abspath(os.path.join(uploads_dir, filename))
        uploads_dir_abs = os.path.abspath(uploads_dir)
        if not (candidate_path == uploads_dir_abs or candidate_path.startswith(uploads_dir_abs + os.sep)):
            return jsonify({'success': False, 'error': 'Invalid filename or path'}), 400

        if not os.path.exists(candidate_path):
            return jsonify({'success': False, 'error': f'File not found: {filename}'}), 404

        # For /analyze-clauses we expect a text file previously produced by /upload-pdf
        if not filename.lower().endswith('.txt'):
            return jsonify({'success': False, 'error': 'analyze-clauses expects a .txt filename previously generated by /upload-pdf'}), 400

        try:
            with open(candidate_path, 'r', encoding='utf-8') as t:
                extracted_text = t.read()
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to read text file: {e}'}), 500

        saved_pdf_path = None
        txt_path = candidate_path
        current_app.logger.info("analyze-clauses: using existing text file %s (len=%d)", txt_path, len(extracted_text))
    
    # Step 4: Analyze clauses (ML model integration will be added in next phase)
    try:
        current_app.logger.info("analyze-clauses: starting clause analysis")
        clause_analysis = analyze_clause_detection(extracted_text)
        # Run corruption detection heuristics on the raw extracted text
        try:
            corruptions = detect_corruptions(extracted_text)
        except Exception as e:
            current_app.logger.exception('corruption detection failed')
            corruptions = []
        current_app.logger.info("analyze-clauses: clause analysis completed")
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': f'Clause analysis failed: {str(e)}'
        }), 500
    
    # Step 5: Return structured response
    response = {
        'success': True,
        'filename': filename,
        'saved_pdf_path': saved_pdf_path,
        'saved_text_path': txt_path,
        # Return both a short preview and the full extracted text
        'text_preview': extracted_text[:500] + '...' if len(extracted_text) > 500 else extracted_text,
        'full_text': extracted_text,
        'clause_analysis': clause_analysis,
        'corruptions': corruptions
    }
    # Log summary
    try:
        stats = clause_analysis.get('statistics', {}) if isinstance(clause_analysis, dict) else {}
        current_app.logger.info("analyze-clauses: finished; total_clauses=%s present=%s missing=%s",
                                stats.get('total_clauses'), stats.get('present'), stats.get('missing'))
    except Exception:
        pass
    
    return jsonify(response), 200


@main.route('/clauses/list', methods=['GET'])
def list_clauses():
    """
    Get the list of all 28 predefined legal clauses.
    
    This endpoint returns the complete list of clauses that the system
    will detect in Supreme Court judgment documents.
    
    Response:
        {
            "success": true,
            "total_clauses": 28,
            "clauses": [{"key": "CourtTitle", "name": "Court Title", ...}, ...]
        }
    """
    clause_list = [
        {
            "key": key,
            "name": info["name"],
            "description": info["description"]
        }
        for key, info in CLAUSE_DEFINITIONS.items()
    ]
    
    return jsonify({
        'success': True,
        'total_clauses': len(clause_list),
        'clauses': clause_list
    }), 200


@main.route('/save-text', methods=['POST'])
def save_text():
    """
    Save/overwrite an extracted .txt file in the uploads directory.

    Expects JSON body: { "filename": "somefile.pdf.txt", "content": "...text..." }
    Returns { success: true } on success or { success: false, error: "..." } on failure.
    """
    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)

    data = None
    if request.is_json:
        data = request.get_json()
    else:
        # accept form posts as well
        data = request.form.to_dict()

    filename = data.get('filename') if isinstance(data, dict) else None
    content = data.get('content') if isinstance(data, dict) else None

    if not filename or not isinstance(filename, str):
        return jsonify({'success': False, 'error': 'filename is required'}), 400

    if not content or not isinstance(content, str):
        return jsonify({'success': False, 'error': 'content is required'}), 400

    # Only allow .txt files and ensure safe path inside uploads
    if not filename.lower().endswith('.txt'):
        return jsonify({'success': False, 'error': 'Only .txt files may be saved via this endpoint'}), 400

    candidate_path = os.path.abspath(os.path.join(uploads_dir, filename))
    uploads_dir_abs = os.path.abspath(uploads_dir)
    if not (candidate_path == uploads_dir_abs or candidate_path.startswith(uploads_dir_abs + os.sep)):
        return jsonify({'success': False, 'error': 'Invalid filename or path'}), 400

    try:
        with open(candidate_path, 'w', encoding='utf-8') as f:
            f.write(content)
        current_app.logger.info("save-text: updated %s", candidate_path)
        return jsonify({'success': True}), 200
    except Exception as e:
        current_app.logger.exception('Failed to write text file')
        return jsonify({'success': False, 'error': str(e)}), 500


@main.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    """
    Generate a PDF from modified text content.
    
    Expects JSON: { "text": "...", "filename": "..." }
    Returns: PDF file as binary download
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'success': False, 'error': 'Missing text parameter'}), 400
        
        text = data['text']
        filename = data.get('filename', 'document_completed.pdf')
        
        # Generate PDF from text
        pdf_bytes = text_to_pdf(text)
        
        # Create BytesIO object to send as file
        pdf_io = BytesIO(pdf_bytes)
        pdf_io.seek(0)
        
        current_app.logger.info("generate-pdf: created PDF, size=%d bytes for filename=%s", len(pdf_bytes), filename)
        
        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        current_app.logger.exception('generate-pdf failed')
        return jsonify({'success': False, 'error': str(e)}), 500


@main.route('/uploads/recent', methods=['GET'])
def recent_uploads():
    """Return the most recent .txt uploaded/extracted files (most recent first).

    Response: { success: true, files: [ { filename, mtime, iso_timestamp } ] }
    """
    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    try:
        os.makedirs(uploads_dir, exist_ok=True)
        entries = []
        for name in os.listdir(uploads_dir):
            if not name.lower().endswith('.txt'):
                continue
            path = os.path.join(uploads_dir, name)
            try:
                mtime = os.path.getmtime(path)
            except Exception:
                mtime = 0
            entries.append((name, mtime))

        # sort by mtime desc and take first 4
        entries.sort(key=lambda e: e[1], reverse=True)
        recent = []
        for name, mtime in entries[:4]:
            recent.append({
                'filename': name,
                'mtime': mtime,
                'iso_timestamp': __import__('datetime').datetime.fromtimestamp(mtime).isoformat()
            })

        return jsonify({'success': True, 'files': recent}), 200
    except Exception as e:
        current_app.logger.exception('recent_uploads failed')
        return jsonify({'success': False, 'error': str(e)}), 500

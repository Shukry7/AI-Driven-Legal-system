from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
import os

from ..services.pdf_service import pdf_bytes_to_text
from ..services.clause_detection_service import analyze_clause_detection, LEGAL_CLAUSES

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
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to save uploaded file: {e}'}), 500

    ok, result = pdf_bytes_to_text(file_bytes)
    if not ok:
        return jsonify({'success': False, 'error': result}), 500

    current_app.logger.info("upload-pdf: completed text extraction length=%d", len(result))

    # Save extracted text to a .txt file beside the PDF
    txt_path = saved_path + '.txt'
    try:
        with open(txt_path, 'w', encoding='utf-8') as t:
            t.write(result)
        current_app.logger.info("upload-pdf: saved extracted text to %s", txt_path)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to save extracted text: {e}'}), 500

    preview = result[:2000]
    return jsonify({'success': True, 'preview': preview, 'full_text_path': txt_path}), 200


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
    # Validate file upload
    if 'file' not in request.files:
        return jsonify({
            'success': False, 
            'error': "No file part in request. Use key 'file' in form-data"
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({
            'success': False, 
            'error': 'Only PDF files are supported'
        }), 400

    filename = secure_filename(file.filename)
    file_bytes = file.read()
    current_app.logger.info("analyze-clauses: received file=%s size=%d from=%s", filename, len(file_bytes), request.remote_addr)
    
    # Step 1: Save uploaded PDF
    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    saved_pdf_path = os.path.join(uploads_dir, filename)
    
    try:
        with open(saved_pdf_path, 'wb') as f:
            f.write(file_bytes)
        current_app.logger.info("analyze-clauses: saved PDF to %s", saved_pdf_path)
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': f'Failed to save PDF: {str(e)}'
        }), 500
    
    # Step 2: Extract text from PDF
    ok, result = pdf_bytes_to_text(file_bytes)
    if not ok:
        return jsonify({
            'success': False, 
            'error': f'PDF text extraction failed: {result}'
        }), 500

    extracted_text = result
    current_app.logger.info("analyze-clauses: completed text extraction length=%d", len(extracted_text))
    
    # Step 3: Save extracted text to file
    txt_path = saved_pdf_path + '.txt'
    try:
        with open(txt_path, 'w', encoding='utf-8') as t:
            t.write(extracted_text)
        current_app.logger.info("analyze-clauses: saved extracted text to %s", txt_path)
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': f'Failed to save extracted text: {str(e)}'
        }), 500
    
    # Step 4: Analyze clauses (ML model integration will be added in next phase)
    try:
        current_app.logger.info("analyze-clauses: starting clause analysis")
        clause_analysis = analyze_clause_detection(extracted_text)
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
        'text_preview': extracted_text[:500] + '...' if len(extracted_text) > 500 else extracted_text,
        'clause_analysis': clause_analysis
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
            "clauses": ["Case Title", "Bench Composition", ...]
        }
    """
    return jsonify({
        'success': True,
        'total_clauses': len(LEGAL_CLAUSES),
        'clauses': LEGAL_CLAUSES
    }), 200

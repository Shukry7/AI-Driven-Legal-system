import os, json, datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
ret_hours=os.getenv('UPLOAD_RETENTION_HOURS','10')
ret_s=float(ret_hours)*3600.0
uploads=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
now=datetime.datetime.utcnow().timestamp()
print('uploads dir:', uploads)
print('retention_seconds=',ret_s)

# Find all consolidated metadata files (*.pdf.meta.json)
for filename in os.listdir(uploads):
    if not filename.endswith('.meta.json'):
        continue
    
    # Check if this is a consolidated PDF metadata (e.g., "case.pdf.meta.json")
    if not filename.endswith('.pdf.meta.json'):
        # Skip non-PDF metadata files
        continue
    
    meta_path = os.path.join(uploads, filename)
    
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        uploaded_at = data.get('uploaded_at')
        if uploaded_at:
            created_ts = datetime.datetime.fromisoformat(uploaded_at.replace('Z','+00:00')).timestamp()
        else:
            # No timestamp in metadata, use file mtime
            created_ts = os.path.getmtime(meta_path)
    except Exception as e:
        print(f'failed to read meta {meta_path}: {e}')
        continue
    
    age = now - created_ts
    pdf_base = filename[:-10]  # strip '.pdf.meta.json'
    print(f'{pdf_base} age_seconds={age}')
    
    if age >= ret_s:
        print(f'DELETE -> {pdf_base} (age {age} seconds >= {ret_s} seconds)')
        
        # Get list of all artifacts to delete from metadata
        artifacts_to_delete = data.get('artifacts', [])
        
        # Also add common derived files that might not be in the list
        # (for backwards compatibility and finalized files)
        derived_files = [
            f'{pdf_base}.clean.txt',
            f'{pdf_base}.clean.txt.original',
            f'{pdf_base}.tagged.txt',
            f'{pdf_base}_finalized.clean.txt',
            f'{pdf_base}_finalized.tagged.txt'
        ]
        
        all_files_to_delete = set(artifacts_to_delete) | set(derived_files)
        
        # Delete all artifacts
        for artifact_name in all_files_to_delete:
            artifact_path = os.path.join(uploads, artifact_name)
            if os.path.exists(artifact_path):
                try:
                    os.remove(artifact_path)
                    print(f'  deleted {artifact_name}')
                except Exception as e:
                    print(f'  failed to delete {artifact_name}: {e}')
        
        # Delete the consolidated metadata file
        try:
            os.remove(meta_path)
            print(f'  deleted {filename} (metadata)')
        except Exception as e:
            print(f'  failed to delete {filename}: {e}')

print('done')

// API helpers for clause document upload and analysis
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

type UploadResult = {
  success: boolean;
  preview?: string;
  full_text_path?: string;
  error?: string;
};
type AnalyzeResult = any;

function postFileWithProgress(endpoint: string, file: File, onProgress?: (p: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file, file.name);
    // Include the original filename as a separate field so backend can store/track it
    fd.append('original_filename', file.name);

    xhr.open('POST', url, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(json);
      } catch (err) {
        reject({ error: 'Invalid JSON response', details: err });
      }
    };

    xhr.onerror = () => reject({ error: 'Network error' });
    xhr.send(fd);
  });
}

export async function uploadPdf(file: File, onProgress?: (p: number) => void): Promise<UploadResult> {
  return postFileWithProgress('/upload-pdf', file, onProgress);
}

export async function analyzeClauses(file: File, onProgress?: (p: number) => void): Promise<AnalyzeResult> {
  return postFileWithProgress('/analyze-clauses', file, onProgress);
}

export async function listClauses(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/clauses/list`);
  if (!res.ok) throw new Error('Failed to load clauses');
  const json = await res.json();
  return json.clauses || [];
}

export default { uploadPdf, analyzeClauses, listClauses };

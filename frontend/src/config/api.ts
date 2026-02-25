// API helpers for clause document upload and analysis
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

type UploadResult = {
  success: boolean;
  preview?: string;
  full_text?: string;
  full_text_path?: string;
  error?: string;
};
type AnalyzeResult = any;

// ---------------------------------------------------------------------------
// Translation types
// ---------------------------------------------------------------------------

export interface TranslationSection {
  id: string;
  type: string;
  source_content: string;
  translated_content: string;
  confidence: number;
  keywords: string[];
}

export interface SourceSection {
  id: string;
  type: string;
  content: string;
  keywords: string[];
}

export interface TranslationJobResult {
  success: boolean;
  job_id: string;
  filename: string;
  source_language: string;
  target_language: string;
  status: string;
  created_at: string;
  processing_time: number;
  model_used: string;
  source_sections: SourceSection[];
  translated_sections: TranslationSection[];
  statistics: {
    sections_count: number;
    word_count: number;
    legal_terms_found: number;
    avg_confidence: number;
    processing_time_seconds: number;
  };
  error?: string;
}

export interface TranslationJobSummary {
  job_id: string;
  filename: string;
  source_language: string;
  target_language: string;
  status: string;
  created_at: string;
  processing_time: number;
  statistics: {
    sections_count: number;
    word_count: number;
    legal_terms_found: number;
    avg_confidence: number;
    processing_time_seconds: number;
  };
}

export interface GlossaryTerm {
  id: string;
  en: string;
  si: string;
  ta: string;
  category: string;
}

export interface LanguagePairMetric {
  pair: string;
  source: string;
  target: string;
  bleu_score: number;
  bleu_before: number;
  legal_term_accuracy: number;
  avg_processing_time: string;
  status: string;
}

export interface ModelInfo {
  success: boolean;
  model_name: string;
  base_model: string;
  loaded: boolean;
  error: string | null;
  languages: string[];
  language_codes: string[];
  training_info: {
    corpus_size: string;
    training_epochs: number;
    initial_loss: number;
    final_loss: number;
    loss_reduction_pct: number;
  };
  performance: {
    language_pairs: LanguagePairMetric[];
  };
}

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

export async function analyzeByFilename(filename: string): Promise<AnalyzeResult> {
  const url = `${API_BASE}/analyze-clauses`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: 'unknown' }));
    throw json;
  }
  return res.json();
}

export async function saveTextFile(filename: string, content: string): Promise<{ success: boolean; error?: string }> {
  const url = `${API_BASE}/save-text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content })
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ success: false, error: 'unknown' }));
    return json;
  }
  return res.json();
}

export async function listClauses(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/clauses/list`);
  if (!res.ok) throw new Error('Failed to load clauses');
  const json = await res.json();
  return json.clauses || [];
}

export async function getRecentUploads(): Promise<{ filename: string; iso_timestamp: string }[]> {
  const res = await fetch(`${API_BASE}/uploads/recent`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({ files: [] }));
  return (json.files || []).map((f: any) => ({ filename: f.filename, iso_timestamp: f.iso_timestamp }));
}

// ---------------------------------------------------------------------------
// Translation API
// ---------------------------------------------------------------------------

/**
 * Translate a document file (PDF/DOCX/TXT).
 * Uploads to POST /translate with multipart/form-data.
 */
export function translateDocument(
  file: File,
  sourceLang: string,
  targetLang: string,
  onProgress?: (p: number) => void,
): Promise<TranslationJobResult> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/translate`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('source_lang', sourceLang);
    fd.append('target_lang', targetLang);

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

/**
 * Translate raw text (no file upload needed).
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  filename?: string,
): Promise<TranslationJobResult> {
  const url = `${API_BASE}/translate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
      filename: filename || 'text-input.txt',
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: 'unknown' }));
    throw json;
  }
  return res.json();
}

/**
 * Get translation job history.
 */
export async function getTranslationHistory(): Promise<TranslationJobSummary[]> {
  const res = await fetch(`${API_BASE}/translate/history`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({ jobs: [] }));
  return json.jobs || [];
}

/**
 * Get a specific translation job by ID.
 */
export async function getTranslationJob(jobId: string): Promise<TranslationJobResult> {
  const res = await fetch(`${API_BASE}/translate/job/${jobId}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: 'unknown' }));
    throw json;
  }
  return res.json();
}

/**
 * Get legal glossary terms.
 */
export async function getGlossary(
  category?: string,
  search?: string,
): Promise<{ terms: GlossaryTerm[]; categories: string[]; total: number }> {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/translate/glossary${qs ? `?${qs}` : ''}`);
  if (!res.ok) return { terms: [], categories: [], total: 0 };
  const json = await res.json().catch(() => ({ terms: [], categories: [], total: 0 }));
  return { terms: json.terms || [], categories: json.categories || [], total: json.total || 0 };
}

/**
 * Get model performance info and metrics.
 */
export async function getModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${API_BASE}/translate/model-info`);
  if (!res.ok) throw new Error('Failed to load model info');
  return res.json();
}

/**
 * Export a translated document. Returns a download URL or blob.
 */
export async function exportTranslation(
  jobId: string,
  format: 'pdf' | 'txt' | 'json' = 'pdf',
): Promise<Blob | any> {
  const url = `${API_BASE}/translate/export`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, format }),
  });

  if (format === 'json') {
    return res.json();
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: 'Export failed' }));
    throw json;
  }

  return res.blob();
}

export default {
  uploadPdf,
  analyzeClauses,
  analyzeByFilename,
  saveTextFile,
  listClauses,
  getRecentUploads,
  translateDocument,
  translateText,
  getTranslationHistory,
  getTranslationJob,
  getGlossary,
  getModelInfo,
  exportTranslation,
};

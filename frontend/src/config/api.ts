// API helpers for clause document upload and analysis
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type UploadResult = {
  success: boolean;
  preview?: string;
  full_text_path?: string;
  full_text?: string;
  error?: string;
};
type AnalyzeResult = any;

function postFileWithProgress(
  endpoint: string,
  file: File,
  onProgress?: (p: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file, file.name);
    // Include the original filename as a separate field so backend can store/track it
    fd.append("original_filename", file.name);

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(json);
      } catch (err) {
        reject({ error: "Invalid JSON response", details: err });
      }
    };

    xhr.onerror = () => reject({ error: "Network error" });
    xhr.send(fd);
  });
}

export async function uploadPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<UploadResult> {
  return postFileWithProgress("/upload-pdf", file, onProgress);
}

export async function analyzeClauses(
  file: File,
  onProgress?: (p: number) => void,
): Promise<AnalyzeResult> {
  return postFileWithProgress("/analyze-clauses", file, onProgress);
}

export async function analyzeByFilename(
  filename: string,
): Promise<AnalyzeResult> {
  const url = `${API_BASE}/analyze-clauses`;
  const formData = new FormData();
  formData.append("filename", filename);
  
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "unknown" }));
    throw json;
  }
  return res.json();
}

export async function saveTextFile(
  filename: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `${API_BASE}/save-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content }),
  });
  if (!res.ok) {
    const json = await res
      .json()
      .catch(() => ({ success: false, error: "unknown" }));
    return json;
  }
  return res.json();
}

export async function listClauses(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/clauses/list`);
  if (!res.ok) throw new Error("Failed to load clauses");
  const json = await res.json();
  return json.clauses || [];
}

export async function getRecentUploads(): Promise<
  { filename: string; iso_timestamp: string }[]
> {
  const res = await fetch(`${API_BASE}/uploads/recent`);
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({ files: [] }));
  return (json.files || []).map((f: any) => ({
    filename: f.filename,
    iso_timestamp: f.iso_timestamp,
  }));
}

// Legal Risk Classification API (FastAPI on port 8000)
const CLASSIFICATION_API_BASE = "http://localhost:8000/api";

export interface ClauseResult {
  id: number;
  text: string;
  start_char: number;
  end_char: number;
  risk: "High" | "Medium" | "Low";
  confidence: number;
  probabilities: {
    High: number;
    Medium: number;
    Low: number;
  };
  keyFactors: string[];
}

export interface ClassificationResult {
  total_clauses: number;
  clauses: ClauseResult[];
  risk_summary: {
    High: number;
    Medium: number;
    Low: number;
  };
  model_info: {
    segmentation_model: string;
    classification_model: string;
    device: string;
  };
}

export async function classifyText(
  text: string,
): Promise<ClassificationResult> {
  const url = `${CLASSIFICATION_API_BASE}/classify/text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Classification failed" }));
    throw new Error(error.detail || "Classification failed");
  }

  return res.json();
}

export async function classifyFile(file: File): Promise<ClassificationResult> {
  const url = `${CLASSIFICATION_API_BASE}/classify/file`;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Classification failed" }));
    throw new Error(error.detail || "Classification failed");
  }

  return res.json();
}

export async function checkClassificationHealth(): Promise<{
  status: string;
  models_loaded: boolean;
  device: string;
}> {
  const url = `${CLASSIFICATION_API_BASE}/health`;
  const res = await fetch(url);

  if (!res.ok) {
    return { status: "unhealthy", models_loaded: false, device: "unknown" };
  }

  return res.json();
}

// ─── Clause Prediction / AI Suggestions API ───────────────────────────────

export interface PredictionSuggestion {
  clause_key: string;
  clause_name: string;
  predictability: "FULL" | "PARTIAL";
  frequency: string;
  suggestion: string;
  confidence: number;
  reasoning: string;
  context_used: Record<string, any>;
  position: string;
  status: "pending" | "accepted" | "edited" | "rejected";
}

export interface PredictionResult {
  success: boolean;
  missing_predictable_clauses: Array<{
    clause_key: string;
    clause_name: string;
    predictability: string;
    frequency: string;
    position: string;
  }>;
  suggestions: Record<string, PredictionSuggestion>;
  total_predictable: number;
  total_missing: number;
  source: "llm" | "cache" | "fallback" | "none";
  mode: "auto" | "manual";
}

export interface PredictionConfig {
  mode: "auto" | "manual";
  llm_configured: boolean;
  model: string;
  predictable_clauses: Array<{
    key: string;
    name: string;
    predictability: string;
    frequency: string;
  }>;
  total_predictable: number;
}

export async function predictClauses(
  filename: string,
  forceRefresh: boolean = false,
): Promise<PredictionResult> {
  const url = `${API_BASE}/api/predict-clauses`;
  const formData = new FormData();
  formData.append("filename", filename);
  if (forceRefresh) {
    formData.append("force_refresh", "true");
  }

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Prediction failed" }));
    throw new Error(error.detail || "Prediction failed");
  }

  return res.json();
}

export async function predictClausesFromFile(
  file: File,
  forceRefresh: boolean = false,
): Promise<PredictionResult> {
  const url = `${API_BASE}/api/predict-clauses`;
  const formData = new FormData();
  formData.append("file", file, file.name);
  if (forceRefresh) {
    formData.append("force_refresh", "true");
  }

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Prediction failed" }));
    throw new Error(error.detail || "Prediction failed");
  }

  return res.json();
}

export async function getPredictionConfig(): Promise<PredictionConfig> {
  const url = `${API_BASE}/api/prediction-config`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to get prediction config");
  }
  return res.json();
}

export interface SuggestionDecision {
  filename: string;
  clause_key: string;
  suggestion_text: string;
  status: "accepted" | "rejected" | "edited";
  confidence?: number;
  edited_text?: string;
}

export interface FinalizeResult {
  success: boolean;
  original_text: string;
  modified_text: string;
  inserted_count: number;
  inserted_clauses: string[];
  download_filename: string;
  finalized_path?: string;
  message: string;
}

export async function acceptSuggestion(
  decision: SuggestionDecision,
): Promise<{ success: boolean; decision: any; message: string }> {
  const url = `${API_BASE}/api/accept-suggestion`;
  const formData = new FormData();
  formData.append("filename", decision.filename);
  formData.append("clause_key", decision.clause_key);
  formData.append("suggestion_text", decision.suggestion_text);
  formData.append("status", decision.status);
  if (decision.confidence !== undefined) {
    formData.append("confidence", decision.confidence.toString());
  }
  if (decision.edited_text) {
    formData.append("edited_text", decision.edited_text);
  }

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to save suggestion decision" }));
    throw new Error(error.detail || "Failed to save suggestion decision");
  }

  return res.json();
}

export async function finalizeDocument(
  filename: string,
): Promise<FinalizeResult> {
  const url = `${API_BASE}/api/finalize-document`;
  const formData = new FormData();
  formData.append("filename", filename);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to finalize document" }));
    throw new Error(error.detail || "Failed to finalize document");
  }

  return res.json();
}

export async function downloadDocument(filename: string): Promise<Blob> {
  const url = `${API_BASE}/api/download-document/${encodeURIComponent(filename)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to download document" }));
    throw new Error(error.detail || "Failed to download document");
  }

  return res.blob();
}

export interface SaveToDatabaseResult {
  success: boolean;
  file_id: string;
  filename: string;
  message: string;
}

export async function saveToDatabase(
  filename: string,
  analysisData?: any
): Promise<SaveToDatabaseResult> {
  const url = `${API_BASE}/api/save-to-database`;
  const formData = new FormData();
  formData.append("filename", filename);
  
  if (analysisData) {
    formData.append("analysis_data", JSON.stringify(analysisData));
  }

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to save to database" }));
    throw new Error(error.detail || "Failed to save to database");
  }

  return res.json();
}

export async function listDatabaseDocuments(
  limit: number = 50,
  skip: number = 0
): Promise<{ success: boolean; documents: any[]; count: number }> {
  const url = `${API_BASE}/api/database-documents?limit=${limit}&skip=${skip}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to list database documents" }));
    throw new Error(error.detail || "Failed to list database documents");
  }

  return res.json();
}

export async function getDatabaseDocument(
  fileId: string
): Promise<{ success: boolean; document: any }> {
  const url = `${API_BASE}/api/database-document/${encodeURIComponent(fileId)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Failed to retrieve database document" }));
    throw new Error(error.detail || "Failed to retrieve database document");
  }

  return res.json();
}

export default {
  uploadPdf,
  analyzeClauses,
  analyzeByFilename,
  saveTextFile,
  listClauses,
  getRecentUploads,
  classifyText,
  classifyFile,
  checkClassificationHealth,
  predictClauses,
  predictClausesFromFile,
  getPredictionConfig,
  acceptSuggestion,
  finalizeDocument,
  downloadDocument,
  saveToDatabase,
  listDatabaseDocuments,
  getDatabaseDocument,
};

// ═══════════════════════════════════════════════════════════════════════════
// Translation API  (backend: /api/translate/*)
// ═══════════════════════════════════════════════════════════════════════════

const T_BASE = `${API_BASE}/api/translate`;

// ── Types ────────────────────────────────────────────────────────────────

export interface SourceSection {
  id: string;
  type: string;
  content: string;
  keywords: string[];
}

export interface TranslationSection {
  id: string;
  type: string;
  translated_content: string;
  confidence: number;
  keywords: string[];
}

export interface TranslationJobResult {
  job_id: string;
  filename: string;
  source_language: string;
  target_language: string;
  mode: string;
  status: string;
  progress: number;
  total_sections: number;
  completed_sections: number;
  created_at: string;
  completed_at?: string;
  source_sections: SourceSection[];
  translated_sections: TranslationSection[];
  raw_source_text: string;
  raw_translated_text: string;
  overall_confidence: number;
  bleu_score: number;
  processing_time: number;
  model_used: string;
  statistics: {
    sections_translated?: number;
    total_words?: number;
    legal_terms_found?: number;
    pages?: number;
    glossary_match_rate?: number;
  };
  error?: string | null;
}

export interface TranslationJobSummary {
  job_id: string;
  filename: string;
  source_language: string;
  target_language: string;
  status: string;
  progress: number;
  created_at: string;
  processing_time: number;
  mode: string;
}

export interface TranslationProgress {
  job_id: string;
  status: string;
  progress: number;
  completed_sections: number;
  total_sections: number;
  error?: string | null;
  partial_translated_sections?: TranslationSection[];
}

export interface TranslationStartResult {
  success: boolean;
  job_id: string;
  status: string;
  filename: string;
  source_language: string;
  target_language: string;
  total_sections: number;
  model_used: string;
  source_sections: SourceSection[];
}

export interface GlossaryTerm {
  id: string;
  en: string;
  si: string;
  ta: string;
  category: string;
}

export interface ModelInfo {
  model_name: string;
  base_model: string;
  supported_languages: string[];
  status: string;
  training_data_size: string;
  avg_speed: string;
  language_pairs: {
    pair: string;
    loaded: boolean;
    bleu_score: number;
    legal_term_accuracy: number;
    avg_time: string;
  }[];
  device: string;
}

// ── Functions ────────────────────────────────────────────────────────────

/** Upload a PDF and start document translation (returns immediately). */
export async function translateDocument(
  file: File,
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: (p: number) => void,
): Promise<TranslationStartResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("source_language", sourceLanguage);
    fd.append("target_language", targetLanguage);

    xhr.open("POST", `${T_BASE}/document`, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(json);
      } catch {
        reject({ error: "Invalid JSON" });
      }
    };
    xhr.onerror = () => reject({ error: "Network error" });
    xhr.send(fd);
  });
}

/** Translate raw text (returns immediately with job_id). */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<TranslationStartResult> {
  const fd = new FormData();
  fd.append("text", text);
  fd.append("source_language", sourceLanguage);
  fd.append("target_language", targetLanguage);

  const res = await fetch(`${T_BASE}/text`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ detail: "Translation failed" }));
    throw new Error(err.detail || "Translation failed");
  }
  return res.json();
}

/** Poll translation progress (light-weight). */
export async function getTranslationProgress(
  jobId: string,
): Promise<TranslationProgress> {
  const res = await fetch(`${T_BASE}/progress/${jobId}`);
  if (!res.ok) throw new Error("Progress fetch failed");
  return res.json();
}

/** Get full completed job data. */
export async function getTranslationJob(
  jobId: string,
): Promise<TranslationJobResult> {
  const res = await fetch(`${T_BASE}/job/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

/** List recent translation jobs. */
export async function getTranslationHistory(): Promise<{
  jobs: TranslationJobSummary[];
}> {
  const res = await fetch(`${T_BASE}/history`);
  if (!res.ok) return { jobs: [] };
  return res.json();
}

/** Export a translated document (returns Blob). */
export async function exportTranslation(
  jobId: string,
  format: string = "txt",
): Promise<Blob> {
  const res = await fetch(`${T_BASE}/export/${jobId}?format=${format}`);
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}

/** Get legal glossary terms (filtered). */
export async function getGlossary(
  category?: string,
  search?: string,
): Promise<{ terms: GlossaryTerm[]; categories: string[] }> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const res = await fetch(`${T_BASE}/glossary?${params}`);
  if (!res.ok) return { terms: [], categories: [] };
  return res.json();
}

/** Get model info / performance metrics. */
export async function getModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${T_BASE}/model-info`);
  if (!res.ok) throw new Error("Model info failed");
  return res.json();
}

/** Delete a translation job. */
export async function deleteTranslationJob(
  jobId: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${T_BASE}/job/${jobId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

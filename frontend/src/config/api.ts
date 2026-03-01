// API helpers for clause document upload and analysis
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type UploadResult = {
  success: boolean;
  preview?: string;
  full_text_path?: string;
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
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
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
};

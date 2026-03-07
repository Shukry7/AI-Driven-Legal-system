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
    const error = await res.json().catch(() => ({ detail: "Prediction failed" }));
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
    const error = await res.json().catch(() => ({ detail: "Prediction failed" }));
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
  decision: SuggestionDecision
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
    const error = await res.json().catch(() => ({ detail: "Failed to save suggestion decision" }));
    throw new Error(error.detail || "Failed to save suggestion decision");
  }

  return res.json();
}

export async function finalizeDocument(
  filename: string
): Promise<FinalizeResult> {
  const url = `${API_BASE}/api/finalize-document`;
  const formData = new FormData();
  formData.append("filename", filename);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to finalize document" }));
    throw new Error(error.detail || "Failed to finalize document");
  }

  return res.json();
}

export async function downloadDocument(filename: string): Promise<Blob> {
  const url = `${API_BASE}/api/download-document/${encodeURIComponent(filename)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to download document" }));
    throw new Error(error.detail || "Failed to download document");
  }

  return res.blob();
}

// ========== Legal Lineage Types ==========
export interface CaseNode {
  id: string;
  title: string;
  year?: number;
  summary?: string;
  citations?: number;
  citedBy?: number;
  isCentral?: boolean;
  acts?: ActTreatment[];
  source?: 'current' | 'database';
  file_id?: string;
  filename?: string;
  case_title?: string;
}

export interface ActTreatment {
  act: string;
  treatment: 'APPLIED' | 'DISTINGUISHED' | 'FOLLOWED' | 'OVERRULED';
  confidence: number;
  act_id?: string;
  context_preview?: string;
  case_title?: string;
  filename?: string;
  file_id?: string;
}

export type RelationType = 'cites' | 'followed' | 'distinguished' | 'limited' | 'overruled';

export interface CitationEdge {
  id?: string;
  source: string;
  target: string;
  relation: RelationType;
  weight?: number;
  context?: string;
  confidence?: number;
}

export interface LineageAnalysisRequest {
  filename: string;
}

export interface LineageAnalysisResponse {
  filename: string;
  results: ActTreatmentResult[];
  message?: string;
}

export interface ActTreatmentResult {
  case: string;
  act: string;
  treatment: string;
  confidence: number;
}

export interface SearchResult {
  id: string;
  title: string;
  year?: number;
  summary?: string;
  citations?: number;
  citedBy?: number;
}

export interface ActSearchRequest {
  act_name: string;
  min_similarity?: number;
  search_type?: 'similar' | 'exact' | 'treatment';
}

export interface ActSearchResultItem {
  file_id: string;
  filename: string;
  case_title: string;
  year?: number;
  act_name: string;
  act_id: string;
  treatment: string;
  confidence: number;
  similarity_score?: number;
  context_preview?: string;
}

export interface ActSearchResponse {
  query: string;
  search_type: string;
  total_results: number;
  results: ActSearchResultItem[];
  message?: string;
}

const createCaseNodesFromTreatments = (
  filename: string,
  treatments: ActTreatmentResult[]
): CaseNode[] => {
  // Group treatments by act to create nodes
  const actMap = new Map<string, CaseNode>();
  
  treatments.forEach((t, index) => {
    if (!actMap.has(t.act)) {
      actMap.set(t.act, {
        id: `act-${index}-${t.act.replace(/[^a-zA-Z0-9]/g, '-')}`,
        title: t.act,
        year: new Date().getFullYear(),
        summary: `Treatment: ${t.treatment} (Confidence: ${(t.confidence * 100).toFixed(1)}%)`,
        citations: 0,
        citedBy: 0,
        isCentral: index === 0,
        acts: [{
          act: t.act,
          treatment: t.treatment as any,
          confidence: t.confidence
        }]
      });
    }
  });
  
  return Array.from(actMap.values());
};

// Create citation edges between acts based on relationships
const createEdgesFromTreatments = (
  treatments: ActTreatmentResult[],
  nodes: CaseNode[]
): CitationEdge[] => {
  const edges: CitationEdge[] = [];
  const nodeMap = new Map(nodes.map(n => [n.title, n]));
  
  // Create edges between related acts
  for (let i = 0; i < treatments.length; i++) {
    for (let j = i + 1; j < treatments.length; j++) {
      const sourceNode = nodeMap.get(treatments[i].act);
      const targetNode = nodeMap.get(treatments[j].act);
      
      if (sourceNode && targetNode) {
        edges.push({
          id: `edge-${i}-${j}`,
          source: sourceNode.id,
          target: targetNode.id,
          relation: 'cites',
          weight: (treatments[i].confidence + treatments[j].confidence) / 2,
          confidence: Math.min(treatments[i].confidence, treatments[j].confidence)
        });
      }
    }
  }
  
  return edges;
};

export async function analyzeAct(filename: string): Promise<{ 
  filename: string;
  results: ActTreatmentResult[];
  nodes: CaseNode[]; 
  edges: CitationEdge[] 
}> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/analyze-lineage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze file: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform backend response to frontend format
    const nodes = createCaseNodesFromTreatments(data.filename, data.results);
    const edges = createEdgesFromTreatments(data.results, nodes);
    
    return {
      filename: data.filename,
      results: data.results,
      nodes,
      edges,
    };
  } catch (error) {
    console.error('Error analyzing file:', error);
    throw error;
  }
}

export async function analyzeUploadedFile(filename: string): Promise<{
  filename: string;
  results: ActTreatmentResult[];
  nodes: CaseNode[];
  edges: CitationEdge[];
}> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/analyze-lineage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze file: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform to frontend format
    const nodes = createCaseNodesFromTreatments(data.filename, data.results);
    const edges = createEdgesFromTreatments(data.results, nodes);
    
    return {
      filename: data.filename,
      results: data.results,
      nodes,
      edges,
    };
  } catch (error) {
    console.error('Error analyzing file:', error);
    throw error;
  }
}

export async function uploadAndAnalyzeLineage(file: File): Promise<{
  filename: string;
  results: ActTreatmentResult[];
  nodes: CaseNode[];
  edges: CitationEdge[];
}> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE}/api/lineage/upload-and-analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload and analyze: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform to frontend format
    const nodes = createCaseNodesFromTreatments(data.filename, data.results);
    const edges = createEdgesFromTreatments(data.results, nodes);
    
    return {
      filename: data.filename,
      results: data.results,
      nodes,
      edges,
    };
  } catch (error) {
    console.error('Error uploading and analyzing:', error);
    throw error;
  }
}

export async function searchLineageCases(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search cases: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching cases:', error);
    return [];
  }
}

export async function fetchLineageGraph(caseId: string): Promise<{ 
  nodes: CaseNode[]; 
  edges: CitationEdge[] 
}> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/lineage/${caseId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch lineage: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching lineage:', error);
    return { nodes: [], edges: [] };
  }
}

export async function searchSimilarActs(
  actName: string, 
  minSimilarity: number = 0.6,
  searchType: 'similar' | 'exact' | 'treatment' = 'similar'
): Promise<ActSearchResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/search-act`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act_name: actName,
        min_similarity: minSimilarity,
        search_type: searchType
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search acts: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching acts:', error);
    throw error;
  }
}

export function convertSearchResultsToCaseNodes(
  searchResults: ActSearchResultItem[],
  mainActName: string
): CaseNode[] {
  const nodes: CaseNode[] = [];
  
  // Create main node (the act we searched for)
  const mainNode: CaseNode = {
    id: `main-${mainActName.replace(/[^a-zA-Z0-9]/g, '-')}`,
    title: mainActName,
    year: undefined,
    summary: `Main act being analyzed`,
    citations: 0,
    citedBy: 0,
    isCentral: true,
    source: 'current',
    acts: []
  };
  nodes.push(mainNode);
  
  // Create nodes for each similar act found - preserve ALL rich data
  searchResults.forEach((result, index) => {
    const node: CaseNode = {
      id: result.file_id || `result-${index}`,
      title: result.act_name,
      year: result.year,
      summary: `Found in case: ${result.case_title}`,
      citations: 0,
      citedBy: 0,
      isCentral: false,
      source: 'database',
      file_id: result.file_id,
      filename: result.filename,
      case_title: result.case_title,
      acts: [{
        act: result.act_name,
        treatment: result.treatment as any,
        confidence: result.confidence,
        act_id: result.act_id,
        context_preview: result.context_preview,
        case_title: result.case_title,
        filename: result.filename,
        file_id: result.file_id
      }]
    };
    nodes.push(node);
  });
  
  return nodes;
}

// Helper function to create edges between main act and similar acts
export function createEdgesFromSearchResults(
  mainActName: string,
  searchResults: ActSearchResultItem[],
  nodes: CaseNode[]
): CitationEdge[] {
  const edges: CitationEdge[] = [];
  const mainNodeId = `main-${mainActName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  
  searchResults.forEach((result, index) => {
    const targetNode = nodes.find(n => n.id === (result.file_id || `result-${index}`));
    if (targetNode) {
      edges.push({
        id: `edge-main-to-${index}`,
        source: mainNodeId,
        target: targetNode.id,
        relation: result.treatment.toLowerCase() as any,
        weight: result.confidence,
        confidence: result.confidence
      });
    }
  });
  
  return edges;
}

export async function searchExactAct(actName: string): Promise<ActSearchResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/lineage/search-act`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act_name: actName,
        search_type: 'exact'  // Force exact match using the index
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search acts: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching acts:', error);
    throw error;
  }
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
  analyzeAct,
  analyzeUploadedFile,
  uploadAndAnalyzeLineage,
  searchLineageCases,
  fetchLineageGraph,
  searchSimilarActs,
  convertSearchResultsToCaseNodes,
  createEdgesFromSearchResults,
  searchExactAct
};

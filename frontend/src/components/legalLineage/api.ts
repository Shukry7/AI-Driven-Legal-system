import type { CaseNode, CitationEdge } from './types';

let useMock = false;

export function setUseMock(flag: boolean) {
  useMock = flag;
}

const mockNodes: CaseNode[] = [
  { id: 'C001', title: 'Fernando v. Silva', year: 1998, summary: 'Leading test case on property.' },
  { id: 'C002', title: 'Perera v. Jayawardene', year: 2005, summary: 'Discusses statutory interpretation.' },
  { id: 'C003', title: 'Gunasekera v. State', year: 2012, summary: 'Overruled earlier approach.' },
];

const mockEdges: CitationEdge[] = [
  { source: 'C001', target: 'C002', relation: 'followed' },
  { source: 'C002', target: 'C003', relation: 'distinguished' },
];

// simple mapping of Acts to case ids (mock)
const actsIndex: Record<string, string[]> = {
  'Property Act': ['C001'],
  'Evidence Act': ['C002', 'C003'],
  'Contract Act': ['C002'],
};

export async function searchCases(query: string): Promise<CaseNode[]> {
  if (useMock) {
    // simple fuzzy filter
    const q = query.trim().toLowerCase();
    if (!q) return mockNodes;
    return mockNodes.filter((n) => n.title.toLowerCase().includes(q) || (n.summary || '').toLowerCase().includes(q));
  }

  const res = await fetch(`/api/legallineage/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search cases');
  return res.json();
}

// Analyze an Act keyword: return related cases plus a connected lineage graph.
export async function analyzeAct(act: string): Promise<{ cases: CaseNode[]; nodes: CaseNode[]; edges: CitationEdge[] }> {
  if (useMock) {
    // simulate backend ML/AI processing delay
    await new Promise((res) => setTimeout(res, 1200 + Math.random() * 1200));

    const caseIds = actsIndex[act] || [];
    const cases = mockNodes.filter((n) => caseIds.includes(n.id));

    // If nothing matched, return a friendly fallback (show full sample graph)
    if (caseIds.length === 0) {
      return { cases: [], nodes: mockNodes, edges: mockEdges };
    }

    // build small graph connecting matched cases with their neighbors
    const connected = new Set<string>(caseIds);
    mockEdges.forEach((e) => {
      if (connected.has(e.source) || connected.has(e.target)) {
        connected.add(e.source);
        connected.add(e.target);
      }
    });

    const nodes = mockNodes.filter((n) => connected.has(n.id));
    const edges = mockEdges.filter((e) => connected.has(e.source) && connected.has(e.target));
    return { cases, nodes, edges };
  }

  const res = await fetch(`/api/legallineage/analyzeAct?act=${encodeURIComponent(act)}`);
  if (!res.ok) throw new Error('Failed to analyze act');
  return res.json();
}

export async function fetchLineage(caseId: string): Promise<{ nodes: CaseNode[]; edges: CitationEdge[] }> {
  if (useMock) {
    // return a small connected graph centered on the requested id when possible
    const center = mockNodes.find((n) => n.id === caseId) || mockNodes[0];
    // collect neighbors
    const connectedIds = new Set<string>();
    connectedIds.add(center.id);
    mockEdges.forEach((e) => {
      if (e.source === center.id || e.target === center.id) {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      }
    });
    const nodes = mockNodes.filter((n) => connectedIds.has(n.id));
    const edges = mockEdges.filter((e) => connectedIds.has(e.source) && connectedIds.has(e.target));
    return { nodes, edges };
  }

  const res = await fetch(`/api/legallineage/lineage?caseId=${encodeURIComponent(caseId)}`);
  if (!res.ok) throw new Error('Failed to fetch lineage');
  return res.json();
}
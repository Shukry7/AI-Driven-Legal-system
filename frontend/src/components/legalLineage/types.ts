export interface CaseNode {
  id: string;
  title: string;
  year?: number;
  summary?: string;
}

export type RelationType = 'cites' | 'followed' | 'distinguished' | 'limited' | 'overruled';

export interface CitationEdge {
  source: string;
  target: string;
  relation: RelationType;
}
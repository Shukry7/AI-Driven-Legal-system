import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseSuggestions } from '@/components/clause/ClauseSuggestions';
import { useClauseContext } from '@/components/clause/ClauseContext';
import { Loader2 } from 'lucide-react';

export default function ClauseSuggestionsPage() {
  const navigate = useNavigate();
  const { analysisResults, reset } = useClauseContext();
  const [loadingResults, setLoadingResults] = useState(false);
  const [localResults, setLocalResults] = useState(analysisResults);
  const [error, setError] = useState<string | null>(null);

  // Load real data from backend if no context data is available
  useEffect(() => {
    if (analysisResults) {
      setLocalResults(analysisResults);
      return;
    }

    // Try to load sample analysis from a recent upload
    const loadSampleAnalysis = async () => {
      try {
        setLoadingResults(true);
        const { getRecentUploads, analyzeByFilename } = await import('@/config/api');
        
        // Get recent uploads
        const recentFiles = await getRecentUploads();
        
        if (recentFiles.length === 0) {
          setError('No recent uploads found. Please upload a document first.');
          return;
        }

        // Use the most recent PDF file
        const mostRecent = recentFiles[0];
        // Convert "case.pdf" to "case.pdf.clean.txt"
        const cleanTextFilename = mostRecent.filename + '.clean.txt';
        
        const results = await analyzeByFilename(cleanTextFilename);
        
        if (results && results.success) {
          // Map the API response to the expected format
          const mappedResults = {
            totalClauses: results.clause_analysis?.statistics?.total_clauses || 0,
            validClauses: results.clause_analysis?.statistics?.present || 0,
            missingClauses: (results.clause_analysis?.clauses || [])
              .filter((c: any) => c.status === 'Missing')
              .map((c: any, idx: number) => ({
                id: idx + 1,
                name: c.clause_name,
                severity: 'medium' as const,
                description: c.content,
                expectedLocation: '',
                suggestion: c.llm_suggestion || c.content,
                predictedText: c.content,
                confidence: c.confidence,
                rationale: undefined,
                alternatives: [],
                jurisdiction: undefined,
                status: undefined,
                isPredictable: true,
              })),
            corruptedClauses: (results.clause_analysis?.clauses || [])
              .filter((c: any) => c.status === 'Corrupt')
              .map((c: any, idx: number) => ({
                id: idx + 1,
                name: c.clause_name,
                issue: 'Detected as corrupt',
                section: c.clause_name,
                suggestion: c.llm_suggestion || c.content,
                predictedText: c.content,
                status: undefined,
                isPredictable: false,
                requiresManualInput: true,
              })),
            originalDocument: results.full_text || '',
            modifiedDocument: results.full_text || '',
          };
          
          setLocalResults(mappedResults);
        } else {
          setError('Failed to load analysis results');
        }
      } catch (err: any) {
        console.error('Error loading sample analysis:', err);
        setError(err?.message || err?.error || 'Failed to load document analysis');
      } finally {
        setLoadingResults(false);
      }
    };

    loadSampleAnalysis();
  }, [analysisResults]);

  if (loadingResults) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading document analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-lg font-semibold text-foreground">Unable to load suggestions</p>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/clause')}
            className="inline-block px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  if (!localResults) {
    return null;
  }

  return (
    <ClauseSuggestions
      results={localResults}
      onComplete={() => {
        reset();
        setLocalResults(null);
        navigate('/clause');
      }}
    />
  );
}

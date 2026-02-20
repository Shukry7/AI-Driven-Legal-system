import { useState } from 'react';
import { ClauseEntry } from './ClauseEntry';
import { ClauseDocumentUpload } from './ClauseDocumentUpload';
import { ClauseWorkspace } from './ClauseWorkspace';
import { ClauseSuggestions } from './ClauseSuggestions';

type View = 'entry' | 'upload' | 'workspace' | 'suggestions';

interface UploadData {
  file: File;
  analysis?: any;
}

interface AnalysisResults {
  totalClauses: number;
  validClauses: number;
  missingClauses: any[];
  corruptedClauses: any[];
}

export function ClauseModule() {
  const [currentView, setCurrentView] = useState<View>('entry');
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);

  const handleStartNew = () => setCurrentView('upload');

  const handleProceed = (data: UploadData) => {
    setUploadData(data);
    setCurrentView('workspace');
  };

  const handleAnalysisComplete = (results: AnalysisResults) => {
    setAnalysisResults(results);
    setCurrentView('suggestions');
  };

  const handleFinish = () => {
    setCurrentView('entry');
    setUploadData(null);
    setAnalysisResults(null);
  };

  if (currentView === 'entry') {
    return (
      <ClauseEntry
        onStartNew={handleStartNew}
        onSelectJob={(id) => console.log('Selected job:', id)}
      />
    );
  }

  if (currentView === 'upload') {
    return (
      <ClauseDocumentUpload
        onProceed={handleProceed}
        onCancel={() => setCurrentView('entry')}
      />
    );
  }

  if (currentView === 'workspace' && uploadData) {
    return (
      <ClauseWorkspace
        file={uploadData.file}
        // Prefer full extracted text when available, otherwise use preview
        originalDocument={uploadData.analysis?.full_text ?? uploadData.analysis?.text_preview}
        onComplete={handleAnalysisComplete}
        onCancel={() => setCurrentView('entry')}
      />
    );
  }

  if (currentView === 'suggestions' && analysisResults) {
    return (
      <ClauseSuggestions
        results={analysisResults}
        onComplete={handleFinish}
      />
    );
  }

  return null;
}

import React, { createContext, useContext, useState } from 'react';

interface UploadData {
  file: File;
  analysis?: any;
}

interface AnalysisResults {
  totalClauses: number;
  validClauses: number;
  missingClauses: any[];
  corruptedClauses: any[];
  originalDocument?: string;
  modifiedDocument?: string;
}

interface ClauseContextValue {
  uploadData: UploadData | null;
  setUploadData: (d: UploadData | null) => void;
  analysisResults: AnalysisResults | null;
  setAnalysisResults: (r: AnalysisResults | null) => void;
  reset: () => void;
}

const ClauseContext = createContext<ClauseContextValue | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);

  const reset = () => {
    setUploadData(null);
    setAnalysisResults(null);
  };

  return (
    <ClauseContext.Provider value={{ uploadData, setUploadData, analysisResults, setAnalysisResults, reset }}>
      {children}
    </ClauseContext.Provider>
  );
};

export const useClauseContext = () => {
  const ctx = useContext(ClauseContext);
  if (!ctx) throw new Error('useClauseContext must be used within ClauseProvider');
  return ctx;
};

export default ClauseContext;

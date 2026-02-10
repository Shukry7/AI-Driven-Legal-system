import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseWorkspace } from '@/components/clause/ClauseWorkspace';
import { useClauseContext } from '@/components/clause/ClauseContext';

export default function ClauseWorkspacePage() {
  const navigate = useNavigate();
  const { uploadData, setAnalysisResults } = useClauseContext();

  useEffect(() => {
    if (!uploadData) navigate('/clause');
  }, [uploadData, navigate]);

  if (!uploadData) return null;

  return (
    <ClauseWorkspace
      file={uploadData.file}
      originalDocument={uploadData.analysis?.full_text ?? uploadData.analysis?.text_preview}
      onComplete={(results: any) => {
        setAnalysisResults(results);
        navigate('/clause/suggestions');
      }}
      onCancel={() => navigate('/clause')}
    />
  );
}

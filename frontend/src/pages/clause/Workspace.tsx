import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseWorkspace } from '@/components/clause/ClauseWorkspace';
import { useClauseContext } from '@/components/clause/ClauseContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function ClauseWorkspacePage() {
  const navigate = useNavigate();
  const { uploadData, setAnalysisResults } = useClauseContext();

  useEffect(() => {
    if (!uploadData) navigate('/clause');
  }, [uploadData, navigate]);

  if (!uploadData) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule="clause" onModuleChange={(m) => m === 'clause' ? navigate('/clause') : navigate('/')} />

      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <ClauseWorkspace
            file={uploadData.file}
            originalDocument={uploadData.analysis?.full_text ?? uploadData.analysis?.text_preview}
            onComplete={(results: any) => {
              setAnalysisResults(results);
              navigate('/clause/suggestions');
            }}
            onCancel={() => navigate('/clause')}
          />
        </div>
      </main>

      <Toaster />
    </div>
  );
}

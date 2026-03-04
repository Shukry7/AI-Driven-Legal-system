import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseDocumentUpload } from '@/components/clause/ClauseDocumentUpload';
import { useClauseContext } from '@/components/clause/ClauseContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function ClauseUploadPage() {
  const navigate = useNavigate();
  const { setUploadData } = useClauseContext();

  const handleProceed = (data: any) => {
    // store in context and go to workspace
    setUploadData(data);
    navigate('/clause/workspace');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule="clause" onModuleChange={(m) => m === 'clause' ? navigate('/clause') : navigate('/')} />

      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <ClauseDocumentUpload
            onProceed={handleProceed}
            onCancel={() => navigate('/clause')}
          />
        </div>
      </main>

      <Toaster />
    </div>
  );
}

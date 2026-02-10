import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseDocumentUpload } from '@/components/clause/ClauseDocumentUpload';
import { useClauseContext } from '@/components/clause/ClauseContext';

export default function ClauseUploadPage() {
  const navigate = useNavigate();
  const { setUploadData } = useClauseContext();

  const handleProceed = (data: any) => {
    // store in context and go to workspace
    setUploadData(data);
    navigate('/clause/workspace');
  };

  return (
    <ClauseDocumentUpload
      onProceed={handleProceed}
      onCancel={() => navigate('/clause')}
    />
  );
}

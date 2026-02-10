import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseEntry } from '@/components/clause/ClauseEntry';

export default function ClauseEntryPage() {
  const navigate = useNavigate();

  return (
    <ClauseEntry
      onStartNew={() => navigate('/clause/upload')}
      onSelectJob={(id) => console.log('Selected job:', id)}
    />
  );
}

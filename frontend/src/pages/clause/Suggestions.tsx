import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseSuggestions } from '@/components/clause/ClauseSuggestions';
import { useClauseContext } from '@/components/clause/ClauseContext';

export default function ClauseSuggestionsPage() {
  const navigate = useNavigate();
  const { analysisResults, reset } = useClauseContext();

  useEffect(() => {
    if (!analysisResults) navigate('/clause');
  }, [analysisResults, navigate]);

  if (!analysisResults) return null;

  return (
    <ClauseSuggestions
      results={analysisResults}
      onComplete={() => {
        reset();
        navigate('/clause');
      }}
    />
  );
}

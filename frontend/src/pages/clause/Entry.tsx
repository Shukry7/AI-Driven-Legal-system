import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClauseEntry } from '@/components/clause/ClauseEntry';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function ClauseEntryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule="clause" onModuleChange={(m) => m === 'clause' ? navigate('/clause') : navigate('/')} />

      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <ClauseEntry
            onStartNew={() => navigate('/clause/upload')}
            onSelectJob={(id) => console.log('Selected job:', id)}
          />
        </div>
      </main>

      <Toaster />
    </div>
  );
}

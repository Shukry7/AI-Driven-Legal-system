import { useState } from 'react';
import { TranslationEntry } from './TranslationEntry';
import { DocumentUpload } from './DocumentUpload';
import { TranslationWorkspace } from './TranslationWorkspace';
import { ComparisonView } from './ComparisonView';
import { GlossaryPanel } from './GlossaryPanel';
import { TranslationSummary } from './TranslationSummary';
import { ModelInsights } from './ModelInsights';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, GitCompare, BookOpen, BarChart3 } from 'lucide-react';

type View = 'entry' | 'upload' | 'workspace' | 'comparison' | 'glossary' | 'summary' | 'insights';

interface UploadData {
  file: File;
  sourceLanguage: string;
  targetLanguage: string;
}

export function TranslationModule() {
  const [currentView, setCurrentView] = useState<View>('entry');
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [activeTab, setActiveTab] = useState('translate');

  const handleStartNew = () => setCurrentView('upload');
  
  const handleProceed = (data: UploadData) => {
    setUploadData(data);
    setCurrentView('workspace');
  };

  const handleComplete = () => setCurrentView('summary');
  
  const handleFinish = () => {
    setCurrentView('entry');
    setUploadData(null);
  };

  // Tab-based navigation for sub-views
  if (currentView === 'entry') {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="translate" className="gap-2">
              <FileText className="w-4 h-4" />
              Translations
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="glossary" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Glossary
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Model Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translate" className="mt-6">
            <TranslationEntry 
              onStartNew={handleStartNew}
              onSelectJob={(id) => console.log('Selected job:', id)}
            />
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <ComparisonView onBack={() => setActiveTab('translate')} />
          </TabsContent>

          <TabsContent value="glossary" className="mt-6">
            <GlossaryPanel onBack={() => setActiveTab('translate')} />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <ModelInsights onBack={() => setActiveTab('translate')} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (currentView === 'upload') {
    return (
      <DocumentUpload 
        onProceed={handleProceed}
        onCancel={() => setCurrentView('entry')}
      />
    );
  }

  if (currentView === 'workspace' && uploadData) {
    return (
      <TranslationWorkspace 
        file={uploadData.file}
        sourceLanguage={uploadData.sourceLanguage}
        targetLanguage={uploadData.targetLanguage}
        onBack={() => setCurrentView('upload')}
        onComplete={handleComplete}
      />
    );
  }

  if (currentView === 'summary') {
    return (
      <TranslationSummary 
        onComplete={handleFinish}
        onBack={() => setCurrentView('workspace')}
      />
    );
  }

  return null;
}

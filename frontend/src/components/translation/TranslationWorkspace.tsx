import { useState } from 'react';
import { 
  Play, 
  Loader2, 
  Download, 
  Copy, 
  CheckCircle2, 
  FileText,
  Info,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { translateDocument, exportTranslation } from '@/config/api';
import type { TranslationJobResult, SourceSection, TranslationSection } from '@/config/api';

interface TranslationWorkspaceProps {
  file: File;
  sourceLanguage: string;
  targetLanguage: string;
  extractedText: string;
  onBack: () => void;
  onComplete: () => void;
  onTranslationComplete: (result: TranslationJobResult) => void;
}

export function TranslationWorkspace({ 
  file, 
  sourceLanguage, 
  targetLanguage, 
  extractedText,
  onBack,
  onComplete,
  onTranslationComplete,
}: TranslationWorkspaceProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationComplete, setTranslationComplete] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Real data from API
  const [sourceSections, setSourceSections] = useState<SourceSection[]>([]);
  const [translatedSections, setTranslatedSections] = useState<TranslationSection[]>([]);
  const [jobId, setJobId] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('');

  const handleTranslate = async () => {
    setIsTranslating(true);
    setUploadProgress(0);

    try {
      const result = await translateDocument(
        file,
        sourceLanguage,
        targetLanguage,
        (progress) => setUploadProgress(progress),
      );

      if (!result.success) {
        toast.error(result.error || 'Translation failed');
        setIsTranslating(false);
        return;
      }

      setSourceSections(result.source_sections || []);
      setTranslatedSections(result.translated_sections || []);
      setJobId(result.job_id);
      setModelUsed(result.model_used || '');
      setIsTranslating(false);
      setTranslationComplete(true);
      onTranslationComplete(result);
      toast.success(`Translation completed in ${result.processing_time}s`);
    } catch (err: any) {
      toast.error(err?.error || 'Translation failed');
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    const fullText = translatedSections.map(s => s.translated_content).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'pdf' | 'txt') => {
    if (!jobId) return;
    try {
      const blob = await exportTranslation(jobId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, '')}_translated.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.error || `Export failed`);
    }
  };

  const getLanguageLabel = (code: string) => {
    const labels: Record<string, string> = { en: 'English', si: 'Sinhala', ta: 'Tamil' };
    return labels[code] || code;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.8) return 'text-warning';
    return 'text-destructive';
  };

  // Before translation, show extracted text as preview sections
  const previewSections: SourceSection[] = sourceSections.length > 0
    ? sourceSections
    : extractedText
      ? extractedText.split(/\n\s*\n/).filter(Boolean).map((para, i) => ({
          id: `preview-${i + 1}`,
          type: i === 0 ? 'header' : 'paragraph',
          content: para.trim(),
          keywords: [],
        }))
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={onBack} className="hover:text-foreground transition-colors">
              Translation
            </button>
            <ChevronRight className="w-4 h-4" />
            <span>Workspace</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{file.name}</h2>
          <p className="text-muted-foreground mt-1">
            {getLanguageLabel(sourceLanguage)} → {getLanguageLabel(targetLanguage)}
          </p>
        </div>
        
        {/* Model Info */}
        <Card className="bg-muted/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {modelUsed && modelUsed !== 'mock-fallback' ? modelUsed : 'mBART Fine-Tuned Legal Model'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {modelUsed === 'mock-fallback' ? 'Mock mode – model not loaded' : 'Stage 1 - Sri Lankan Legal Corpus'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Actions (sticky) */}
      <div className="sticky top-0 z-20 bg-background border-b border-border -mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onBack} 
            size="default"
          >
            Back to Upload
          </Button>

          {translationComplete && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="default"
                onClick={() => handleExport('pdf')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="default"
                onClick={() => handleExport('txt')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export TXT
              </Button>
              <Button 
                onClick={onComplete} 
                size="default"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete & Save
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace - 3 Pane Layout */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
        {/* Left Pane - Original Document */}
        <div className="col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Original Document
                </CardTitle>
                <Badge variant="outline">{getLanguageLabel(sourceLanguage)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {previewSections.map((section) => (
                  <div 
                    key={section.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedSection === section.id 
                        ? "border-accent bg-accent/5" 
                        : "border-transparent hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {section.type}
                      </Badge>
                    </div>
                    <p className="text-sm legal-text whitespace-pre-line text-foreground">
                      {section.content}
                    </p>
                    {section.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {section.keywords.map((keyword, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                  {keyword}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Legal term from glossary</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Pane - Controls */}
        <div className="col-span-2 flex flex-col items-center justify-center gap-4">
          {!translationComplete ? (
            <Button 
              size="lg" 
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full gap-2"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Translate
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Complete</span>
            </div>
          )}

          {isTranslating && (
            <div className="text-center">
              <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300" 
                  style={{ width: `${uploadProgress > 0 ? uploadProgress : 60}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {uploadProgress < 100 ? 'Uploading & translating...' : 'Processing sections...'}
              </p>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            disabled 
            className="w-full text-xs"
          >
            Improve (Stage 2)
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Advanced refinement model not available
          </p>
        </div>

        {/* Right Pane - Translated Output */}
        <div className="col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Translated Output
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getLanguageLabel(targetLanguage)}</Badge>
                  {translationComplete && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!translationComplete && !isTranslating && (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Click "Translate" to start</p>
                </div>
              )}
              
              {isTranslating && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-4" />
                    <p className="text-sm text-muted-foreground">Generating translation...</p>
                  </div>
                </div>
              )}

              {translationComplete && (
                <div className="space-y-4">
                  {translatedSections.map((section, index) => (
                    <div 
                      key={section.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedSection === section.id 
                          ? "border-accent bg-accent/5" 
                          : "border-transparent hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Section {index + 1}
                        </Badge>
                        <span className={cn("text-xs font-medium", getConfidenceColor(section.confidence))}>
                          {Math.round(section.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm legal-text whitespace-pre-line text-foreground">
                        {section.translated_content}
                      </p>
                      {section.keywords && section.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {section.keywords.map((kw, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { uploadPdf } from '@/config/api';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onProceed: (data: { file: File; sourceLanguage: string; targetLanguage: string; extractedText: string }) => void;
  onCancel: () => void;
}

const languages = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'si', label: 'Sinhala', native: 'සිංහල' },
  { value: 'ta', label: 'Tamil', native: 'தமிழ்' }
];

const preprocessingSteps = [
  { id: 'extract', label: 'Text Extraction', description: 'Extracting text from document' },
  { id: 'ocr', label: 'OCR Processing', description: 'Optical character recognition (if needed)' },
  { id: 'clean', label: 'Legal Formatting', description: 'Cleaning and preserving legal structure' },
  { id: 'split', label: 'Clause Splitting', description: 'Identifying articles, sections, and clauses' }
];

export function DocumentUpload({ onProceed, onCancel }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLanguage] = useState<string>('en');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [extractedPreview, setExtractedPreview] = useState<string>('');
  const [fullExtractedText, setFullExtractedText] = useState<string>('');
  const [extractionError, setExtractionError] = useState<string>('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setExtractionError('');
    setIsProcessing(true);
    setProcessingStep(0);

    // Step 1: Text extraction (real API call)
    setProcessingStep(1);
    try {
      const result = await uploadPdf(selectedFile, () => {});

      if (!result.success) {
        setExtractionError(result.error || 'Text extraction failed');
        setIsProcessing(false);
        toast.error('Failed to extract text from document');
        return;
      }

      // Step 2: OCR (handled server-side automatically)
      setProcessingStep(2);
      await new Promise(r => setTimeout(r, 300));

      // Step 3: Legal formatting
      setProcessingStep(3);
      await new Promise(r => setTimeout(r, 300));

      // Step 4: Clause splitting
      setProcessingStep(4);
      await new Promise(r => setTimeout(r, 300));

      const fullText = result.full_text || result.preview || '';
      setFullExtractedText(fullText);
      setExtractedPreview(fullText.length > 2000 ? fullText.slice(0, 2000) + '\n\n[... document continues]' : fullText);
      setIsProcessing(false);
      toast.success('Document processed successfully');
    } catch (err: any) {
      setExtractionError(err?.error || 'Failed to process document');
      setIsProcessing(false);
      toast.error('Failed to process document');
    }
  };

  const isValidFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    return validTypes.includes(file.type);
  };

  const canProceed = file && targetLanguage && targetLanguage !== 'en' && !isProcessing && fullExtractedText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Upload Document</h2>
        <p className="text-muted-foreground mt-1">
          Upload your legal document for translation. Supported formats: PDF, Word, Text.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Upload</CardTitle>
              <CardDescription>Drag and drop or click to select a file</CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                    isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  )}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) handleFileSelect(selected);
                    }}
                  />
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium mb-1">Drop your document here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supports PDF, DOC, DOCX, TXT up to 25MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => { setFile(null); setExtractedPreview(''); setFullExtractedText(''); setExtractionError(''); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Extracted Preview */}
                  {extractedPreview && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Extracted Text Preview</p>
                      <div className="bg-card border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-body legal-text">
                          {extractedPreview}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Extraction Error */}
                  {extractionError && (
                    <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {extractionError}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Translation Settings</CardTitle>
              <CardDescription>Select source and target languages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Source Language
                  </label>
                  {/*<Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label} ({lang.native})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>*/}
                  ENGLISH
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Target Language
                  </label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.filter(l => l.value !== 'en').map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label} ({lang.native})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {targetLanguage === 'en' && (
                <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Target language cannot be the same as source language (English)
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preprocessing Status */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pre-processing</CardTitle>
              <CardDescription>Document preparation steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {preprocessingSteps.map((step, index) => {
                  const stepNumber = index + 1;
                  const isComplete = processingStep >= stepNumber;
                  const isCurrent = processingStep === stepNumber && isProcessing;
                  
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        isComplete ? "bg-success text-success-foreground" : 
                        isCurrent ? "bg-accent text-accent-foreground" : 
                        "bg-muted text-muted-foreground"
                      )}>
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="text-xs">{stepNumber}</span>
                        )}
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => file && onProceed({ file, sourceLanguage, targetLanguage, extractedText: fullExtractedText })}
          disabled={!canProceed}
          className="gap-2"
        >
          Proceed to Translate
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

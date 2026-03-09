/**
 * DocumentUpload – supports BOTH document (PDF) and text-based translation.
 * Two-tab layout: "Upload Document" and "Enter Text".
 */
import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Type,
  ChevronLeft,
  Home,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadPdf, getTranslationUploads, extractFromSaved } from "@/config/api";
import type { UploadedFile } from "@/config/api";
import { toast } from "sonner";
import type { UploadData } from "./TranslationModule";

interface DocumentUploadProps {
  onProceed: (data: UploadData) => void;
  onCancel: () => void;
}

const languages = [
  { value: "en", label: "English", native: "English" },
  { value: "si", label: "Sinhala", native: "සිංහල" },
  { value: "ta", label: "Tamil", native: "தமிழ்" },
];

const preprocessingSteps = [
  {
    id: "extract",
    label: "Text Extraction",
    description: "Extracting text from document",
  },
  {
    id: "ocr",
    label: "OCR Processing",
    description: "Optical character recognition (if needed)",
  },
  {
    id: "clean",
    label: "Legal Formatting",
    description: "Stripping format markers & cleaning",
  },
  {
    id: "split",
    label: "Section Splitting",
    description: "Identifying paragraphs and sections",
  },
];

/**
 * Strip HTML tags and decode entities from extracted text
 */
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleaned;
  cleaned = textarea.value;
  
  // Normalize whitespace but preserve paragraph breaks
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');
  
  // Remove excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Check if file type is valid for upload
 */
function isValidFile(f: File): boolean {
  const valid = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  return valid.includes(f.type);
}

export function DocumentUpload({ onProceed, onCancel }: DocumentUploadProps) {
  const [inputMode, setInputMode] = useState<"document" | "text" | "uploaded">("document");

  // Document mode state
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [extractedPreview, setExtractedPreview] = useState("");
  const [fullExtractedText, setFullExtractedText] = useState("");
  const [extractionError, setExtractionError] = useState("");

  // Saved documents state
  const [savedFiles, setSavedFiles] = useState<UploadedFile[]>([]);
  const [loadingSavedFiles, setLoadingSavedFiles] = useState(false);
  const [selectedSavedFile, setSelectedSavedFile] = useState<string | null>(null);
  const [isSavedLoading, setIsSavedLoading] = useState(false);

  // Text mode state
  const [rawText, setRawText] = useState("");
  const [textTargetLang, setTextTargetLang] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const fetchSavedFiles = useCallback(() => {
    setLoadingSavedFiles(true);
    getTranslationUploads()
      .then(setSavedFiles)
      .catch(() => setSavedFiles([]))
      .finally(() => setLoadingSavedFiles(false));
  }, []);

  useEffect(() => { fetchSavedFiles(); }, [fetchSavedFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      handleFileSelect(droppedFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulateStreaming = (text: string) => {
    setIsStreaming(true);
    setStreamingText("");
    const lines = text.split('\n');
    let lineIdx = 0;
    const interval = setInterval(() => {
      if (lineIdx < lines.length) {
        const batchEnd = Math.min(lineIdx + 3, lines.length);
        setStreamingText(lines.slice(0, batchEnd).join('\n'));
        lineIdx = batchEnd;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 80);
  };

  const _applyExtractResult = async (fullText: string) => {
    setProcessingStep(2);
    await new Promise((r) => setTimeout(r, 200));
    setProcessingStep(3);
    await new Promise((r) => setTimeout(r, 200));
    setProcessingStep(4);
    await new Promise((r) => setTimeout(r, 200));

    const cleanedFullText = cleanExtractedText(fullText);
    setFullExtractedText(cleanedFullText);
    const previewText =
      cleanedFullText.length > 2000
        ? cleanedFullText.slice(0, 2000) + "\n\n[… document continues]"
        : cleanedFullText;
    setExtractedPreview(previewText);
    setIsProcessing(false);
    simulateStreaming(previewText);
    toast.success("Document processed successfully");
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setSelectedSavedFile(null);
    setExtractionError("");
    setIsProcessing(true);
    setProcessingStep(0);
    setStreamingText("");
    setExtractedPreview("");
    setFullExtractedText("");

    setProcessingStep(1);
    try {
      const result = await uploadPdf(selectedFile, () => {});
      if (!result.success) {
        setExtractionError(result.error || "Text extraction failed");
        setIsProcessing(false);
        toast.error("Failed to extract text");
        return;
      }
      await _applyExtractResult(result.full_text || result.preview || "");
    } catch (err: unknown) {
      const msg =
        (err as Record<string, string>)?.error || "Failed to process document";
      setExtractionError(msg);
      setIsProcessing(false);
      toast.error("Failed to process document");
    }
  };

  const handleSavedFileSelect = async (filename: string) => {
    setSelectedSavedFile(filename);
    setFile(null);
    setExtractionError("");
    setIsProcessing(true);
    setProcessingStep(0);
    setStreamingText("");
    setExtractedPreview("");
    setFullExtractedText("");

    setProcessingStep(1);
    try {
      const result = await extractFromSaved(filename);
      if (!result.success) {
        setExtractionError(result.error || "Text extraction failed");
        setIsProcessing(false);
        toast.error("Failed to extract text");
        return;
      }
      await _applyExtractResult(result.full_text || result.preview || "");
    } catch (err: unknown) {
      const msg =
        (err as Record<string, string>)?.error || "Failed to process document";
      setExtractionError(msg);
      setIsProcessing(false);
      toast.error("Failed to process document");
    }
  };

  const canProceedDoc =
    !!(((file || selectedSavedFile) && targetLanguage && targetLanguage !== "en" && !isProcessing && fullExtractedText && !isSavedLoading));
  const canProceedText =
    rawText.trim().length >= 30 && textTargetLang && textTargetLang !== "en";

  const handleProceedDoc = () => {
    if (!file || !canProceedDoc) return;
    onProceed({
      file,
      sourceLanguage: "en",
      targetLanguage,
      extractedText: fullExtractedText,
      mode: "document",
    });
  };

  const handleProceedSaved = () => {
    if (!selectedSavedFile || !targetLanguage || !fullExtractedText) return;
    onProceed({
      sourceLanguage: "en",
      targetLanguage,
      extractedText: fullExtractedText,
      mode: "text",
    });
  };

  const handleProceedText = () => {
    if (!canProceedText) return;
    onProceed({
      text: rawText.trim(),
      sourceLanguage: "en",
      targetLanguage: textTargetLang,
      extractedText: rawText.trim(),
      mode: "text",
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onCancel} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" />
          Translations
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">New Translation</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            New Translation
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload a document or paste text for translation. You can continue
            using the app while translation runs in the background.
          </p>
        </div>
      </div>

      {/* Tabs: Document / Text */}
      <Tabs
        value={inputMode}
        onValueChange={(v) => setInputMode(v as "document" | "text" | "uploaded")}
      >
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="document" className="gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <Type className="w-4 h-4" /> Enter Text
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="gap-2">
            <FolderOpen className="w-4 h-4" /> Uploaded Documents
          </TabsTrigger>
        </TabsList>

        {/* ── Document mode ─────────────────────────────────────────────── */}
        <TabsContent value="document" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Upload</CardTitle>
                  <CardDescription>
                    Drag & drop or click to browse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!file ? (
                    <div className="space-y-4">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                          isDragging
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50",
                        )}
                        onClick={() =>
                          document.getElementById("file-input")?.click()
                        }
                      >
                        <input
                          id="file-input"
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const sel = e.target.files?.[0];
                            if (sel) { setSelectedSavedFile(null); handleFileSelect(sel); }
                          }}
                        />
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-foreground font-medium mb-1">
                          Drop your document here
                        </p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-3">
                          Supports PDF, DOC, DOCX, TXT up to 25 MB
                        </p>
                      </div>


                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {file.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFile(null);
                            setExtractedPreview("");
                            setFullExtractedText("");
                            setExtractionError("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {(extractedPreview || isStreaming) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              Extracted Text Preview
                            </p>
                            {isStreaming && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Extracting...
                              </span>
                            )}
                          </div>
                          <div className="bg-card border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                            <div className="text-sm text-foreground whitespace-pre-wrap font-body leading-relaxed">
                              {isStreaming ? streamingText : extractedPreview}
                              {isStreaming && <span className="animate-pulse">▊</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {extractionError && (
                        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                          <AlertCircle className="w-4 h-4" /> {extractionError}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Language Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Translation Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Source Language
                      </label>
                      <div className="h-10 px-3 border rounded-md flex items-center text-sm bg-muted text-muted-foreground">
                        English
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Target Language
                      </label>
                      <Select
                        value={targetLanguage}
                        onValueChange={setTargetLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages
                            .filter((l) => l.value !== "en")
                            .map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label} ({lang.native})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preprocessing sidebar */}
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pre-processing</CardTitle>
                  <CardDescription>Document preparation steps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {preprocessingSteps.map((step, index) => {
                      const stepNum = index + 1;
                      const isComplete = processingStep >= stepNum;
                      const isCurrent =
                        processingStep === stepNum && isProcessing;
                      const isLast = index === preprocessingSteps.length - 1;
                      return (
                        <div key={step.id} className="flex items-start gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                                isComplete
                                  ? "bg-green-500 text-white"
                                  : isCurrent
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isCurrent ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <span className="text-xs">{stepNum}</span>
                              )}
                            </div>
                            {!isLast && (
                              <div className={cn(
                                "w-0.5 h-8 mt-1",
                                isComplete ? "bg-green-500" : "bg-muted",
                              )} />
                            )}
                          </div>
                          <div className="pb-6">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isComplete || isCurrent
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
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
          <div className="flex items-center justify-end gap-3 pt-4 pb-6">
            {file && !targetLanguage && !isProcessing && (
              <p className="text-sm text-destructive mr-auto flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Please select a target language to proceed
              </p>
            )}
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedDoc}
              disabled={!file || !targetLanguage || targetLanguage === "en" || isProcessing || !fullExtractedText}
              className="gap-2"
            >
              Proceed to Translate <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ── Text mode ─────────────────────────────────────────────────── */}
        <TabsContent value="text" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enter Legal Text</CardTitle>
                  <CardDescription>
                    Paste or type the English legal text you want to translate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your legal text here…&#10;&#10;e.g. The defendant is hereby ordered to appear before the Magistrate's Court…"
                    className="min-h-[300px] font-body text-sm"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    {rawText.length > 0 && rawText.trim().length < 30 && (
                      <p className="text-xs text-destructive">
                        Minimum 30 characters required ({30 - rawText.trim().length} more needed)
                      </p>
                    )}
                    {rawText.trim().length >= 30 && (
                      <p className="text-xs text-green-600">
                        ✓ Ready to translate
                      </p>
                    )}
                    {rawText.length === 0 && <span />}
                    <p className="text-xs text-muted-foreground text-right">
                      {rawText.trim().split(/\s+/).filter(Boolean).length} words •{" "}
                      {rawText.length} characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Target Language</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Source
                      </label>
                      <div className="h-10 px-3 border rounded-md flex items-center text-sm bg-muted text-muted-foreground">
                        English
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Target
                      </label>
                      <Select
                        value={textTargetLang}
                        onValueChange={setTextTargetLang}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages
                            .filter((l) => l.value !== "en")
                            .map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label} ({lang.native})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info sidebar */}
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• Best results with formal legal English</p>
                  <p>
                    • The model handles court judgments, contracts, and statutes
                  </p>
                  <p>
                    • Legal terms from the glossary (9 000+ terms) are preserved
                  </p>
                  <p>
                    • Translation runs in background — you can navigate away
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            {rawText.trim().length > 0 && !textTargetLang && (
              <p className="text-sm text-destructive mr-auto flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Please select a target language to proceed
              </p>
            )}
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedText}
              disabled={!canProceedText}
              className="gap-2"
            >
              Translate Text <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ── Uploaded Documents mode ───────────────────────────────────── */}
        <TabsContent value="uploaded" className="mt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Uploaded Documents</span>
                    <button
                      onClick={fetchSavedFiles}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingSavedFiles && "animate-spin")} />
                    </button>
                  </CardTitle>
                  <CardDescription>
                    Select a previously uploaded document to translate
                    {savedFiles.length > 0 && ` (${savedFiles.length} files)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSavedFiles ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading saved files…</span>
                    </div>
                  ) : savedFiles.length === 0 ? (
                    <div className="text-center py-10">
                      <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No documents in uploads folder yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a document first using the "Upload Document" tab
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {savedFiles.map((f) => (
                        <div
                          key={f.filename}
                          onClick={() => handleSavedFileSelect(f.filename)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors",
                            selectedSavedFile === f.filename
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/60 hover:bg-accent/5",
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded flex items-center justify-center flex-shrink-0",
                            selectedSavedFile === f.filename ? "bg-accent/20" : "bg-primary/10",
                          )}>
                            <FileText className={cn(
                              "w-5 h-5",
                              selectedSavedFile === f.filename ? "text-accent" : "text-primary",
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {(f.size / 1024).toFixed(0)} KB •{" "}
                              {new Date(f.modified * 1000).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedSavedFile === f.filename && (
                            <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extraction preview for selected saved file */}
              {selectedSavedFile && (extractedPreview || isStreaming) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Extracted Text Preview
                      {isStreaming && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting...
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-card border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="text-sm text-foreground whitespace-pre-wrap font-body leading-relaxed">
                        {isStreaming ? streamingText : extractedPreview}
                        {isStreaming && <span className="animate-pulse">▊</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedSavedFile && isProcessing && !extractedPreview && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting text from document…
                </div>
              )}

              {selectedSavedFile && extractionError && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4" /> {extractionError}
                </div>
              )}

              {/* Language selection for uploaded docs */}
              {selectedSavedFile && fullExtractedText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Translation Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Source Language
                        </label>
                        <div className="h-10 px-3 border rounded-md flex items-center text-sm bg-muted text-muted-foreground">
                          English
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Target Language
                        </label>
                        <Select
                          value={targetLanguage}
                          onValueChange={setTargetLanguage}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {languages
                              .filter((l) => l.value !== "en")
                              .map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label} ({lang.native})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preprocessing sidebar */}
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pre-processing</CardTitle>
                  <CardDescription>Document preparation steps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {preprocessingSteps.map((step, index) => {
                      const stepNum = index + 1;
                      const isComplete = processingStep >= stepNum;
                      const isCurrent =
                        processingStep === stepNum && isProcessing;
                      const isLast = index === preprocessingSteps.length - 1;
                      return (
                        <div key={step.id} className="flex items-start gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                                isComplete
                                  ? "bg-green-500 text-white"
                                  : isCurrent
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isCurrent ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <span className="text-xs">{stepNum}</span>
                              )}
                            </div>
                            {!isLast && (
                              <div className={cn(
                                "w-0.5 h-8 mt-1",
                                isComplete ? "bg-green-500" : "bg-muted",
                              )} />
                            )}
                          </div>
                          <div className="pb-6">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isComplete || isCurrent
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
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
          <div className="flex items-center justify-end gap-3 pt-4 pb-6">
            {selectedSavedFile && !targetLanguage && !isProcessing && fullExtractedText && (
              <p className="text-sm text-destructive mr-auto flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Please select a target language to proceed
              </p>
            )}
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedSaved}
              disabled={!selectedSavedFile || !targetLanguage || targetLanguage === "en" || isProcessing || !fullExtractedText}
              className="gap-2"
            >
              Proceed to Translate <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

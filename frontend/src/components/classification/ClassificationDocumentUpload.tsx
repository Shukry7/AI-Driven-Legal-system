/**
 * ClassificationDocumentUpload – supports BOTH document (PDF/TXT) and manual text input.
 * Two-tab layout: "Upload Document" and "Enter Text".
 */
import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Home,
  Type,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DocumentUploadProps {
  onProceed: (data: {
    file?: File;
    text?: string;
    mode: "document" | "text";
  }) => void;
  onCancel: () => void;
}

/**
 * Check if file type is valid for upload
 */
function isValidFile(f: File): boolean {
  const valid = ["application/pdf", "text/plain"];
  return valid.includes(f.type);
}

export function ClassificationDocumentUpload({
  onProceed,
  onCancel,
}: DocumentUploadProps) {
  const [inputMode, setInputMode] = useState<"document" | "text">("document");

  // Document mode state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Text mode state
  const [rawText, setRawText] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      handleFileSelect(droppedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      toast.success("File selected: " + selectedFile.name);
    } else {
      toast.error("Please select a valid PDF or TXT file");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const canProceedDoc = file !== null;
  const canProceedText = rawText.trim().length >= 30;

  const handleProceedDoc = () => {
    if (!file || !canProceedDoc) return;
    onProceed({
      file,
      mode: "document",
    });
  };

  const handleProceedText = () => {
    if (!canProceedText) return;
    onProceed({
      text: rawText.trim(),
      mode: "text",
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Classifications
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">New Classification</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            New Classification
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a document or paste text for legal risk classification
          </p>
        </div>
      </div>

      {/* Tab Layout */}
      <Tabs
        value={inputMode}
        onValueChange={(v) => setInputMode(v as "document" | "text")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="document" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <Type className="w-4 h-4" />
            Enter Text
          </TabsTrigger>
        </TabsList>

        {/* ── DOCUMENT UPLOAD TAB ── */}
        <TabsContent value="document" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>
                Upload a PDF or TXT file for legal risk classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Drop Zone */}
              <div className="space-y-2">
                <Label>Select Document</Label>
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer",
                    isDragging
                      ? "border-accent bg-accent/10 scale-[1.02]"
                      : "border-border hover:border-accent/50 hover:bg-accent/5",
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={handleFileInputChange}
                  />
                  <div className="flex flex-col items-center gap-3">
                    {file ? (
                      <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {file.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(file.size / 1024).toFixed(1)} KB •{" "}
                            {file.type === "application/pdf" ? "PDF" : "TXT"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Drop your file here, or click to browse
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Supports PDF and TXT files
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    Processing Pipeline
                  </p>
                  <p className="text-sm text-blue-700">
                    Your document will be analyzed using Legal-BERT models for{" "}
                    <strong>clause segmentation</strong> and{" "}
                    <strong>risk classification</strong>.
                  </p>
                </div>
              </div>

              {/* Proceed Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedDoc}
                  disabled={!canProceedDoc}
                  className="min-w-[140px]"
                >
                  Proceed to Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEXT INPUT TAB ── */}
        <TabsContent value="text" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Text Input</CardTitle>
              <CardDescription>
                Paste or type legal text directly for classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="raw-text">Legal Text</Label>
                <Textarea
                  id="raw-text"
                  placeholder="Paste your legal document text here...&#10;&#10;Example:&#10;IN THE SUPREME COURT OF SRI LANKA&#10;&#10;The Plaintiff entered into a contract with the Defendant on 15th January 2021..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  {rawText.length} characters{" "}
                  {rawText.length < 30 && "(minimum 30 required)"}
                </p>
              </div>

              {/* Info Alert */}
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">
                    Text Input Guidelines
                  </p>
                  <ul className="text-sm text-amber-700 space-y-0.5 list-disc list-inside">
                    <li>Minimum 30 characters required</li>
                    <li>Paste cleaned legal text (without formatting)</li>
                    <li>Preserve paragraph breaks for better analysis</li>
                  </ul>
                </div>
              </div>

              {/* Proceed Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedText}
                  disabled={!canProceedText}
                  className="min-w-[140px]"
                >
                  Proceed to Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

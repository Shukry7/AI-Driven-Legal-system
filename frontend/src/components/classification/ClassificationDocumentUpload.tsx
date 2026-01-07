import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DocumentUploadProps {
  onProceed: (data: { file: File }) => void;
  onCancel: () => void;
}

export function ClassificationDocumentUpload({
  onProceed,
  onCancel,
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (
      file &&
      (file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain")
    ) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleProceed = () => {
    if (selectedFile) {
      onProceed({ file: selectedFile });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          ← Back
        </Button>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Upload Judgment for Risk Analysis
        </h2>
        <p className="text-muted-foreground mt-2">
          Upload a Sri Lankan civil court judgment to perform clause
          segmentation and risk classification
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Selection</CardTitle>
          <CardDescription>
            Choose a PDF or TXT file containing the judgment text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Judgment File</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drop file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports PDF and TXT files
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
              <div className="w-10 h-10 bg-accent/10 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Clause Segmentation
              </p>
              <p className="text-xs text-muted-foreground">
                Legal-BERT performs token-level classification using BIO tagging
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Risk Classification
              </p>
              <p className="text-xs text-muted-foreground">
                Each clause is analyzed for legal risk (High, Medium, or Low)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Visual Analysis
              </p>
              <p className="text-xs text-muted-foreground">
                View highlighted clauses with filtering and detailed insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleProceed}
          disabled={!selectedFile}
          className="flex-1"
        >
          Analyze Judgment
        </Button>
      </div>
    </div>
  );
}

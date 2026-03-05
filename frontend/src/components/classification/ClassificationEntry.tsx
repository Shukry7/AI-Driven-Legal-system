import { AlertCircle, Upload, FileText, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ClassificationEntryProps {
  onStartNew: () => void;
  onSelectFile?: (id: string) => void;
}

export function ClassificationEntry({
  onStartNew,
  onSelectFile,
}: ClassificationEntryProps) {
  // Mock OCR-processed files from Flask backend
  const ocrProcessedFiles = [
    {
      id: "1",
      filename: "Supreme Court Judgment - Civil Appeal 2023-45.pdf",
      uploadDate: "2024-01-15",
      pages: 12,
      extractedText: "Sample extracted text...",
      status: "ready",
    },
    {
      id: "2",
      filename: "District Court - Contract Dispute Case.pdf",
      uploadDate: "2024-01-14",
      pages: 8,
      extractedText: "Sample extracted text...",
      status: "ready",
    },
    {
      id: "3",
      filename: "High Court - Property Rights Matter.pdf",
      uploadDate: "2024-01-12",
      pages: 15,
      extractedText: "Sample extracted text...",
      status: "ready",
    },
    {
      id: "4",
      filename: "Commercial Arbitration Award 2024.pdf",
      uploadDate: "2024-01-10",
      pages: 20,
      extractedText: "Sample extracted text...",
      status: "ready",
    },
    {
      id: "5",
      filename: "Land Dispute Settlement Order.pdf",
      uploadDate: "2024-01-08",
      pages: 6,
      extractedText: "Sample extracted text...",
      status: "ready",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="w-6 h-6 text-accent" />
            Legal Risk Classification
          </CardTitle>
          <CardDescription>
            AI-powered clause segmentation and risk assessment for Sri Lankan
            civil court judgments using fine-tuned Legal-BERT models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onStartNew} size="lg" className="w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-2" />
            Upload & Classify New Document
          </Button>
        </CardContent>
      </Card>

      {/* OCR Processed Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            OCR Processed Documents
          </CardTitle>
          <CardDescription>
            Select a document to analyze for legal risk classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ocrProcessedFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onSelectFile?.(file.id)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {file.filename}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Uploaded: {file.uploadDate} • {file.pages} pages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      {file.status === "ready" ? "Ready" : "Processing"}
                    </div>
                  </div>
                  <div className="text-accent font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Analyze →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Stage 1: Clause Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Token-level classification using BIO tagging to split complex
              legal sentences into meaningful clause units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Stage 2: Risk Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Semantic analysis to categorize each clause as High, Medium, or
              Low risk based on legal implications
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

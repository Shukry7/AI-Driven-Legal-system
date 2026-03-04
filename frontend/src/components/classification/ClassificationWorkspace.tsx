import { useState, useEffect } from "react";
import { FileText, AlertCircle, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  classifyText,
  classifyFile,
  type ClauseResult,
  type ClassificationResult,
} from "@/config/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Local type for normalized clause results (with lowercase risk)
interface NormalizedClause extends Omit<ClauseResult, "risk"> {
  risk: "high" | "medium" | "low";
  start_char: number;
  end_char: number;
}

interface FileData {
  id: string;
  filename: string;
  uploadDate: string;
  pages: number;
  extractedText: string;
}

interface ClassificationWorkspaceProps {
  file?: File;
  fileData?: FileData;
  onComplete: () => void;
  onCancel: () => void;
}

export function ClassificationWorkspace({
  file,
  fileData,
  onComplete,
  onCancel,
}: ClassificationWorkspaceProps) {
  const fileName = file ? file.name : fileData?.filename || "Unknown Document";
  const fileDate =
    fileData?.uploadDate || new Date().toISOString().split("T")[0];

  const [documentText, setDocumentText] = useState<string>("");
  const [clauses, setClauses] = useState<NormalizedClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskStats, setRiskStats] = useState({
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  });

  const [filter, setFilter] = useState<string>("all");
  const [selectedClause, setSelectedClause] = useState<NormalizedClause | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch classification on component mount
  useEffect(() => {
    const performClassification = async () => {
      setLoading(true);
      setError(null);

      try {
        let result: ClassificationResult;
        let textContent = "";

        // If we have fileData with extracted text, use that
        if (fileData?.extractedText) {
          textContent = fileData.extractedText;
          setDocumentText(textContent);
          result = await classifyText(textContent);
        }
        // If we have a file, classify it
        else if (file) {
          // For now, read the file and send as text
          // In production, you might want to use classifyFile for PDFs
          textContent = await file.text();
          setDocumentText(textContent);
          result = await classifyText(textContent);
        } else {
          throw new Error("No file or text provided");
        }

        // Update state with results
        // Normalize risk values to lowercase for UI consistency
        const normalizedClauses: NormalizedClause[] = result.clauses.map(
          (clause) => ({
            ...clause,
            risk: clause.risk.toLowerCase() as "high" | "medium" | "low",
          }),
        );

        setClauses(normalizedClauses);
        setRiskStats({
          high: result.risk_summary.High,
          medium: result.risk_summary.Medium,
          low: result.risk_summary.Low,
          total: result.total_clauses,
        });
      } catch (err: any) {
        console.error("Classification error:", err);
        setError(
          err.message ||
            "Failed to classify document. Make sure the FastAPI server is running on port 8000.",
        );
      } finally {
        setLoading(false);
      }
    };

    performClassification();
  }, [file, fileData]);

  const handleClauseClick = (clause: NormalizedClause) => {
    setSelectedClause(clause);
    setDialogOpen(true);
  };

  const getHighlightClass = (risk: string) => {
    const lowerRisk = risk.toLowerCase();
    switch (lowerRisk) {
      case "high":
        return "bg-red-200 border-b-2 border-red-500";
      case "medium":
        return "bg-yellow-200 border-b-2 border-yellow-500";
      case "low":
        return "bg-green-200 border-b-2 border-green-500";
      default:
        return "";
    }
  };

  const highlightDocument = () => {
    if (filter === "original") {
      return (
        <div className="whitespace-pre-wrap leading-relaxed">
          {documentText}
        </div>
      );
    }

    // Use character offsets from the API for exact highlighting
    // Sort clauses by start position and remove overlaps
    const sorted = [...clauses]
      .filter((c) => c.start_char !== undefined && c.end_char !== undefined)
      .sort((a, b) => a.start_char - b.start_char);

    const nonOverlapping: NormalizedClause[] = [];
    let lastEnd = 0;
    for (const clause of sorted) {
      if (clause.start_char >= lastEnd) {
        nonOverlapping.push(clause);
        lastEnd = clause.end_char;
      }
    }

    // Build highlighted document from offsets
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    nonOverlapping.forEach((clause) => {
      const shouldHighlight = filter === "all" || filter === clause.risk;

      // Add text before this clause
      if (clause.start_char > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {documentText.substring(lastIndex, clause.start_char)}
          </span>,
        );
      }

      // Get the ORIGINAL text from the document using offsets
      const originalText = documentText.substring(
        clause.start_char,
        clause.end_char,
      );

      // Add the clause (highlighted or not)
      if (shouldHighlight) {
        parts.push(
          <mark
            key={`clause-${clause.id}`}
            onClick={() => handleClauseClick(clause)}
            className={`${getHighlightClass(
              clause.risk,
            )} cursor-pointer transition-all hover:opacity-80 hover:shadow-sm`}
            title={`${clause.risk.toUpperCase()} RISK (${
              clause.confidence
            }% confidence) - Click for details`}
          >
            {originalText}
          </mark>,
        );
      } else {
        parts.push(<span key={`clause-${clause.id}`}>{originalText}</span>);
      }

      lastIndex = clause.end_char;
    });

    // Add remaining text
    if (lastIndex < documentText.length) {
      parts.push(
        <span key={`text-end`}>{documentText.substring(lastIndex)}</span>,
      );
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={onCancel} className="mb-4">
            ← Back
          </Button>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Analyzing Document...
          </h2>
        </div>
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Classification in progress
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Stage 1: Clause Segmentation (BIO Tagging)
              <br />
              Stage 2: Risk Classification
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={onCancel} className="mb-4">
            ← Back
          </Button>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Classification Error
          </h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">{error}</p>
            <p className="text-sm">
              Please ensure the FastAPI classification server is running on port
              8000.
              <br />
              Run:{" "}
              <code className="bg-black/10 px-2 py-1 rounded text-xs">
                python fastapi_server.py
              </code>
            </p>
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Back to Files
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          ← Back
        </Button>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Legal Risk Analysis Results
        </h2>
        <div className="flex items-center text-muted-foreground mt-2">
          <FileText className="w-4 h-4 mr-2" />
          <span className="text-sm">{fileName}</span>
          {fileData && (
            <span className="text-xs ml-3 text-muted-foreground">
              • Uploaded: {fileDate} • {fileData.pages} pages
            </span>
          )}
        </div>
      </div>

      {/* Risk Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {riskStats.total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total Clauses
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-700">
                  {riskStats.high}
                </div>
                <div className="text-xs text-red-600 mt-1">High Risk</div>
              </div>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-700">
                  {riskStats.medium}
                </div>
                <div className="text-xs text-yellow-600 mt-1">Medium Risk</div>
              </div>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {riskStats.low}
                </div>
                <div className="text-xs text-green-600 mt-1">Low Risk</div>
              </div>
              <AlertCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Dropdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select display mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">
                Show Original (No Highlights)
              </SelectItem>
              <SelectItem value="all">Show All Risks</SelectItem>
              <SelectItem value="high">Show Only High Risk</SelectItem>
              <SelectItem value="medium">Show Only Medium Risk</SelectItem>
              <SelectItem value="low">Show Only Low Risk</SelectItem>
            </SelectContent>
          </Select>

          {/* Legend */}
          {filter !== "original" && (
            <div className="flex items-center flex-wrap gap-4 text-sm pt-2">
              <span className="font-medium text-foreground">Legend:</span>
              {(filter === "all" || filter === "high") && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-red-200 border-b-2 border-red-500"></span>
                  <span className="text-muted-foreground">High Risk</span>
                </div>
              )}
              {(filter === "all" || filter === "medium") && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-yellow-200 border-b-2 border-yellow-500"></span>
                  <span className="text-muted-foreground">Medium Risk</span>
                </div>
              )}
              {(filter === "all" || filter === "low") && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 bg-green-200 border-b-2 border-green-500"></span>
                  <span className="text-muted-foreground">Low Risk</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="text-base">Judgment Document</CardTitle>
            {clauses.length > 0 && filter !== "original" && (
              <p className="text-xs text-muted-foreground">
                ℹ️ Click on any highlighted clause to view detailed risk
                analysis
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="prose max-w-none text-foreground text-sm"
            style={{ lineHeight: "1.2" }}
          >
            {highlightDocument()}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onComplete} className="flex-1">
          Save Analysis
        </Button>
      </div>

      {/* Clause Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle
                className={`w-5 h-5 ${
                  selectedClause?.risk === "high"
                    ? "text-red-500"
                    : selectedClause?.risk === "medium"
                      ? "text-yellow-500"
                      : "text-green-500"
                }`}
              />
              Clause Risk Analysis
            </DialogTitle>
            <DialogDescription>
              Detailed risk assessment and AI model insights
            </DialogDescription>
          </DialogHeader>

          {selectedClause && (
            <div className="space-y-6">
              {/* Clause Text */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Clause Text
                </h3>
                <p className="text-sm text-muted-foreground bg-accent/5 p-3 rounded-lg border">
                  "
                  {documentText.substring(
                    selectedClause.start_char,
                    selectedClause.end_char,
                  )}
                  "
                </p>
              </div>

              {/* Risk Level & Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Risk Level
                  </h3>
                  <Badge
                    variant={
                      selectedClause.risk === "high" ? "destructive" : "default"
                    }
                    className={`text-sm capitalize ${
                      selectedClause.risk === "medium"
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : selectedClause.risk === "low"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                    }`}
                  >
                    {selectedClause.risk} Risk
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Confidence Score
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-foreground">
                        {selectedClause.confidence}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedClause.confidence >= 90
                          ? "Very High"
                          : selectedClause.confidence >= 80
                            ? "High"
                            : selectedClause.confidence >= 70
                              ? "Moderate"
                              : "Low"}
                      </span>
                    </div>
                    <Progress
                      value={selectedClause.confidence}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>

              {/* Key Factors */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Key Risk Factors
                </h3>
                <div className="space-y-2">
                  {selectedClause.keyFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          selectedClause.risk === "high"
                            ? "bg-red-500"
                            : selectedClause.risk === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <span className="text-foreground">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Probability Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Risk Probability Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600 font-medium">
                        High Risk
                      </span>
                      <span className="text-muted-foreground">
                        {selectedClause.probabilities.High}%
                      </span>
                    </div>
                    <Progress
                      value={selectedClause.probabilities.High}
                      className="h-2 [&>div]:bg-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yellow-600 font-medium">
                        Medium Risk
                      </span>
                      <span className="text-muted-foreground">
                        {selectedClause.probabilities.Medium}%
                      </span>
                    </div>
                    <Progress
                      value={selectedClause.probabilities.Medium}
                      className="h-2 [&>div]:bg-yellow-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-medium">
                        Low Risk
                      </span>
                      <span className="text-muted-foreground">
                        {selectedClause.probabilities.Low}%
                      </span>
                    </div>
                    <Progress
                      value={selectedClause.probabilities.Low}
                      className="h-2 [&>div]:bg-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Model Information */}
              <div className="pt-4 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Model:</span> Legal-BERT
                    (Fine-tuned)
                  </p>
                  <p>
                    <span className="font-medium">Stage 1:</span> Clause
                    Segmentation (BIO Tagging)
                  </p>
                  <p>
                    <span className="font-medium">Stage 2:</span> Risk
                    Classification (Semantic Analysis)
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

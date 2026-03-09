import { useState, useEffect } from "react";
import {
  FileText,
  AlertCircle,
  TrendingUp,
  Loader2,
  Download,
  Eye,
  Save,
  CheckCircle2,
  MousePointerClick,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  classifyText,
  classifyFile,
  classifyUploadedFile,
  type ClauseResult,
  type ClassificationResult,
} from "@/config/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClassification } from "./ClassificationContext";
import { useToast } from "@/hooks/use-toast";

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
  text?: string;
  mode?: "document" | "text";
  uploadedFilename?: string;
  existingResult?: ClassificationResult | null;
  filename: string;
  onComplete: (result: ClassificationResult) => void;
  onViewSummary: () => void;
  onCancel: () => void;
}

export function ClassificationWorkspace({
  file,
  text,
  mode = "document",
  uploadedFilename,
  existingResult,
  filename,
  onComplete,
  onViewSummary,
  onCancel,
}: ClassificationWorkspaceProps) {
  const fileName = filename || "Unknown Document";
  const fileDate = new Date().toISOString().split("T")[0];
  const { saveClassification } = useClassification();
  const { toast } = useToast();

  const [documentText, setDocumentText] = useState<string>("");
  const [clauses, setClauses] = useState<NormalizedClause[]>([]);
  const [loading, setLoading] = useState(!existingResult);
  const [saving, setSaving] = useState(false);
  const [classificationResult, setClassificationResult] =
    useState<ClassificationResult | null>(existingResult || null);
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
  const [processingStep, setProcessingStep] = useState(0);

  // Classification processing steps for progress indicators
  const classificationSteps = [
    {
      id: "load",
      label: "Loading File",
      description: "Reading document from server",
    },
    {
      id: "extract",
      label: "Text Extraction",
      description: "Extracting text content",
    },
    {
      id: "segment",
      label: "Clause Segmentation",
      description: "Identifying individual clauses",
    },
    {
      id: "analyze",
      label: "Risk Analysis",
      description: "Analyzing legal risk factors",
    },
  ];

  // Fetch classification on component mount or load existing result
  useEffect(() => {
    const loadClassification = async () => {
      // If we have an existing result (loaded from recent), use it
      if (existingResult) {
        setLoading(false);
        const normalizedClauses: NormalizedClause[] =
          existingResult.clauses.map((clause) => ({
            ...clause,
            risk: clause.risk.toLowerCase() as "high" | "medium" | "low",
          }));
        setClauses(normalizedClauses);
        setDocumentText(existingResult.document_text || "");
        setRiskStats({
          high: existingResult.risk_summary.High,
          medium: existingResult.risk_summary.Medium,
          low: existingResult.risk_summary.Low,
          total: existingResult.total_clauses,
        });
        setClassificationResult(existingResult);
        return;
      }

      // Handle uploaded file processing with progress indicators
      if (uploadedFilename) {
        setLoading(true);
        setError(null);
        setProcessingStep(0);

        try {
          // Step 1: Loading file
          setProcessingStep(1);
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Step 2: Text extraction
          setProcessingStep(2);
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Step 3: Clause segmentation & Step 4: Risk analysis
          // These happen together on the backend
          setProcessingStep(3);
          const result = await classifyUploadedFile(uploadedFilename);

          setProcessingStep(4);

          // Use extracted text from result
          const textContent = result.document_text || "";
          setDocumentText(textContent);

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
          setClassificationResult(result);
          onComplete(result);
        } catch (err: any) {
          console.error("Classification error:", err);
          setError(
            err.message ||
              "Failed to classify document. Make sure the FastAPI server is running on port 8000.",
          );
        } finally {
          setLoading(false);
          setProcessingStep(0);
        }
        return;
      }

      // Otherwise, perform new classification
      if (!file && !text) return;

      setLoading(true);
      setError(null);
      setProcessingStep(0);

      try {
        let result: ClassificationResult;
        let textContent = "";

        // Step 1: Loading
        setProcessingStep(1);

        // Handle text mode
        if (mode === "text" && text) {
          textContent = text;
          setDocumentText(textContent);
          setProcessingStep(2);
          result = await classifyText(textContent);
        }
        // Handle file mode
        else if (file) {
          setProcessingStep(2);
          result = await classifyFile(file);

          // Use extracted text from backend if available (PDF case)
          if (result.document_text) {
            textContent = result.document_text;
          }
          // For text files, read locally as fallback
          else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
            textContent = await file.text();
          } else {
            throw new Error("No text content available for display");
          }

          setDocumentText(textContent);
        } else {
          throw new Error("No file or text provided");
        }

        // Step 3 & 4: Segmentation and analysis (backend handles both)
        setProcessingStep(3);
        await new Promise((resolve) => setTimeout(resolve, 200));
        setProcessingStep(4);

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
        setClassificationResult(result);
        onComplete(result);
      } catch (err: any) {
        console.error("Classification error:", err);
        setError(
          err.message ||
            "Failed to classify document. Make sure the FastAPI server is running on port 8000.",
        );
      } finally {
        setLoading(false);
        setProcessingStep(0);
      }
    };

    loadClassification();
  }, [file, text, mode, uploadedFilename, existingResult, onComplete]);

  const handleClauseClick = (clause: NormalizedClause) => {
    setSelectedClause(clause);
  };

  const handleSave = async () => {
    if (!classificationResult) return;

    setSaving(true);
    try {
      await saveClassification(filename, classificationResult);
      toast({
        title: "Success",
        description: "Classification saved successfully",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save classification",
      });
    } finally {
      setSaving(false);
    }
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

  const downloadPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    const lineHeight = 6;
    const fontSize = 9;

    // ── HEADER SECTION ──
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Legal Risk Classification Report", margin, yPosition);
    yPosition += 10;

    // Document info
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Document: ${fileName}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Date: ${fileDate}`, margin, yPosition);
    yPosition += 6;
    pdf.text(
      `Total Clauses: ${riskStats.total} | High: ${riskStats.high} | Medium: ${riskStats.medium} | Low: ${riskStats.low}`,
      margin,
      yPosition,
    );
    yPosition += 8;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // ── DOCUMENT SECTION (preserving original structure) ──
    pdf.setFontSize(fontSize);

    // Sort clauses by position
    const sorted = [...clauses]
      .filter((c) => c.start_char !== undefined && c.end_char !== undefined)
      .sort((a, b) => a.start_char - b.start_char);

    // Build text segments with color information
    interface TextSegment {
      text: string;
      color: number[];
      isBold: boolean;
    }

    const segments: TextSegment[] = [];
    let lastIndex = 0;

    sorted.forEach((clause) => {
      // Add text before this clause (normal black text)
      if (clause.start_char > lastIndex) {
        const beforeText = documentText.substring(lastIndex, clause.start_char);
        segments.push({
          text: beforeText,
          color: [0, 0, 0],
          isBold: false,
        });
      }

      // Add the clause text with risk-based color
      const clauseText = documentText.substring(
        clause.start_char,
        clause.end_char,
      );

      let color: number[];
      switch (clause.risk) {
        case "high":
          color = [220, 38, 38]; // Red
          break;
        case "medium":
          color = [202, 138, 4]; // Orange/Yellow
          break;
        case "low":
          color = [22, 163, 74]; // Green
          break;
        default:
          color = [0, 0, 0];
      }

      segments.push({
        text: clauseText,
        color: color,
        isBold: true,
      });

      lastIndex = clause.end_char;
    });

    // Add remaining text after last clause
    if (lastIndex < documentText.length) {
      const remainingText = documentText.substring(lastIndex);
      segments.push({
        text: remainingText,
        color: [0, 0, 0],
        isBold: false,
      });
    }

    // Render all segments preserving flow
    // Combine all segments into one string and track where colors change
    let currentX = margin;
    const startY = yPosition;

    segments.forEach((segment) => {
      if (!segment.text) return;

      pdf.setTextColor(segment.color[0], segment.color[1], segment.color[2]);
      pdf.setFont("helvetica", segment.isBold ? "bold" : "normal");

      // Split text into words to handle wrapping properly
      const words = segment.text.split(/(\s+)/); // Keep whitespace

      words.forEach((word) => {
        if (word.includes("\n")) {
          // Handle newlines - split by newline
          const lines = word.split("\n");
          lines.forEach((line, idx) => {
            if (idx > 0) {
              // New line
              yPosition += lineHeight;
              currentX = margin;

              // Check if we need a new page
              if (yPosition > pageHeight - margin - 10) {
                pdf.addPage();
                yPosition = margin;
              }
            }

            if (line) {
              const wordWidth = pdf.getTextWidth(line);
              // Check if word fits on current line
              if (
                currentX + wordWidth > pageWidth - margin &&
                currentX > margin
              ) {
                yPosition += lineHeight;
                currentX = margin;

                if (yPosition > pageHeight - margin - 10) {
                  pdf.addPage();
                  yPosition = margin;
                }
              }

              pdf.text(line, currentX, yPosition);
              currentX += wordWidth;
            }
          });
        } else {
          // Regular word or space
          const wordWidth = pdf.getTextWidth(word);

          // Check if word fits on current line
          if (
            currentX + wordWidth > pageWidth - margin &&
            currentX > margin &&
            word.trim()
          ) {
            yPosition += lineHeight;
            currentX = margin;

            if (yPosition > pageHeight - margin - 10) {
              pdf.addPage();
              yPosition = margin;
            }
          }

          pdf.text(word, currentX, yPosition);
          currentX += wordWidth;
        }
      });
    });

    // Add footer with page numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
    }

    // Save the PDF
    pdf.save(`${fileName.replace(/\.[^/.]+$/, "")}_risk_analysis.pdf`);
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

      // Skip empty, whitespace-only, or very short artifact text (PDF artifacts like "|", "18")
      const tightText = originalText.trim();
      if (!tightText || tightText.length < 3 || !/[a-zA-Z]/.test(tightText)) {
        lastIndex = clause.end_char;
        return;
      }

      // Compute tight bounds — exclude leading/trailing whitespace from the highlight
      // so wide "empty-looking" blocks don't appear when the model spans whitespace regions
      const leadingWs = originalText.length - originalText.trimStart().length;
      const trailingWs = originalText.length - originalText.trimEnd().length;
      const tightStart = clause.start_char + leadingWs;
      const tightEnd = clause.end_char - trailingWs;

      // Add the clause (highlighted or not)
      if (shouldHighlight) {
        // Render leading whitespace outside the mark so it keeps proper layout
        if (leadingWs > 0) {
          parts.push(
            <span key={`lead-${clause.start_char}`}>
              {documentText.substring(clause.start_char, tightStart)}
            </span>,
          );
        }
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
            {tightText}
          </mark>,
        );
        // Render trailing whitespace outside the mark
        if (trailingWs > 0) {
          parts.push(
            <span key={`trail-${clause.end_char}`}>
              {documentText.substring(tightEnd, clause.end_char)}
            </span>,
          );
        }
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

  // Show loading state with progress indicators
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Classification in progress
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Please wait while we analyze your document...
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Processing Steps Sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Classification steps
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {classificationSteps.map((step, index) => {
                    const stepNum = index + 1;
                    const isComplete = processingStep > stepNum;
                    const isCurrent = processingStep === stepNum;
                    const isLast = index === classificationSteps.length - 1;
                    return (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 relative"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                              isComplete
                                ? "bg-green-500 text-white"
                                : isCurrent
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground"
                            }`}
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
                            <div
                              className={`w-0.5 h-8 mt-1 ${
                                isComplete ? "bg-green-500" : "bg-muted"
                              }`}
                            />
                          )}
                        </div>
                        <div className="pb-6">
                          <p
                            className={`text-sm font-medium ${
                              isComplete || isCurrent
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
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
          <span className="text-xs ml-3 text-muted-foreground">
            • {fileDate}
          </span>
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

      {/* Two Column Layout: Document + Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Document Content */}
        <Card className="lg:col-span-1">
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

        {/* Right: Clause Details Panel */}
        <Card className="lg:col-span-1 lg:sticky lg:top-6 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Clause Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedClause ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <MousePointerClick className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    No Clause Selected
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Click on any highlighted clause in the document to view its
                    detailed risk analysis and insights
                  </p>
                </div>
              </div>
            ) : (
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
                        selectedClause.risk === "high"
                          ? "destructive"
                          : "default"
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
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
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
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={downloadPDF}
          className="flex-1 gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !classificationResult}
          className="flex-1 gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Result
            </>
          )}
        </Button>
        <Button
          onClick={onViewSummary}
          disabled={!classificationResult}
          className="flex-1 gap-2"
        >
          <Eye className="w-4 h-4" />
          View Summary
        </Button>
      </div>
    </div>
  );
}

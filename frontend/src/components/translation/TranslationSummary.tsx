import {
  CheckCircle2,
  Download,
  FileText,
  Link2,
  BarChart3,
  Clock,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { exportTranslation } from "@/config/api";
import type { TranslationJobResult } from "@/config/api";

interface TranslationSummaryProps {
  translationResult?: TranslationJobResult | null;
  onComplete: () => void;
  onBack: () => void;
}

export function TranslationSummary({
  translationResult,
  onComplete,
  onBack,
}: TranslationSummaryProps) {
  const result = translationResult;

  // Derive display values from real data
  const fileName = result?.filename || "Unknown Document";
  const jobId = result?.job_id || "";
  const sourceLang = result?.source_language || "en";
  const targetLang = result?.target_language || "si";
  const processingTime =
    result?.processing_time != null ? `${result.processing_time}s` : "—";
  const stats = result?.statistics || {};
  const sectionsCount =
    stats.sections_translated ?? result?.translated_sections?.length ?? 0;
  const wordCount = stats.total_words ?? 0;
  const legalTermsCount = stats.legal_terms_found ?? 0;
  const pagesCount = stats.pages ?? (Math.ceil(wordCount / 250) || 0);

  // Confidence metrics
  const overallConfidence =
    result?.overall_confidence != null ? result.overall_confidence * 100 : 0;
  const legalTermAccuracy =
    stats.glossary_match_rate != null ? stats.glossary_match_rate * 100 : 0;
  const bleuScore = result?.bleu_score ?? 0;

  const getLanguageLabel = (code: string) => {
    const labels: Record<string, string> = {
      en: "English",
      si: "Sinhala",
      ta: "Tamil",
    };
    return labels[code] || code;
  };

  const handleExport = async (format: "pdf" | "txt" | "json") => {
    if (!jobId) {
      toast.error("No translation job to export");
      return;
    }
    try {
      const blob = await exportTranslation(jobId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.[^.]+$/, "")}_translated.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.error || "Export failed");
    }
  };

  const handleDownloadAll = async () => {
    await handleExport("pdf");
  };
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Translation Complete
        </h2>
        <p className="text-muted-foreground mt-2">
          Your document has been successfully translated and is ready for
          download
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Document Info */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Translation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Document Name</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {fileName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Job ID</p>
                <p className="font-medium text-foreground font-mono text-xs">
                  {jobId || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Translation Direction
                </p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  {getLanguageLabel(sourceLang)} →{" "}
                  {getLanguageLabel(targetLang)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {processingTime}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {sectionsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sections Translated
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {wordCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Words Processed
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {legalTermsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Legal Terms
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {pagesCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pages</p>
              </div>
            </div>

            {/* Quality Indicators */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground">
                Quality Indicators
              </h4>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      Overall Confidence
                    </span>
                    <span className="font-medium text-success">
                      {overallConfidence.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={overallConfidence} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      Legal Term Accuracy
                    </span>
                    <span className="font-medium text-success">
                      {legalTermAccuracy.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={legalTermAccuracy} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      Estimated BLEU Score
                    </span>
                    <span className="font-medium text-foreground">
                      {bleuScore.toFixed(3)}
                    </span>
                  </div>
                  <Progress value={bleuScore * 100} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download Options</CardTitle>
              <CardDescription>Export your translated document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleExport("pdf")}
              >
                <div className="w-8 h-8 bg-destructive/10 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-medium">PDF Document</p>
                  <p className="text-xs text-muted-foreground">
                    Formatted for print
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleExport("txt")}
              >
                <div className="w-8 h-8 bg-accent/10 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Text Document</p>
                  <p className="text-xs text-muted-foreground">
                    Plain text TXT format
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleExport("json")}
              >
                <div className="w-8 h-8 bg-warning/10 rounded flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-warning" />
                </div>
                <div className="text-left">
                  <p className="font-medium">JSON Output</p>
                  <p className="text-xs text-muted-foreground">
                    Structured data format
                  </p>
                </div>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full gap-2">
                <Link2 className="w-4 h-4" />
                Attach to Case File
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Link this translation to a case file
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 h-10"
        >
          Back to Workspace
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 h-10"
            onClick={handleDownloadAll}
          >
            <Download className="w-4 h-4" />
            Download All
          </Button>
          <Button
            onClick={onComplete}
            className="flex items-center gap-2 px-4 py-2 h-10"
          >
            Complete & Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

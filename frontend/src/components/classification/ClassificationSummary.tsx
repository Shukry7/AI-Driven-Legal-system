import {
  CheckCircle2,
  Download,
  FileText,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Shield,
  Clock,
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
import type { ClassificationResult } from "@/config/api";

interface ClassificationSummaryProps {
  classificationResult: ClassificationResult;
  filename: string;
  onComplete: () => void;
  onBack: () => void;
}

export function ClassificationSummary({
  classificationResult,
  filename,
  onComplete,
  onBack,
}: ClassificationSummaryProps) {
  const result = classificationResult;
  const totalClauses = result.total_clauses;
  const highRisk = result.risk_summary.High;
  const mediumRisk = result.risk_summary.Medium;
  const lowRisk = result.risk_summary.Low;

  // Calculate risk percentage
  const highPct = totalClauses > 0 ? (highRisk / totalClauses) * 100 : 0;
  const mediumPct = totalClauses > 0 ? (mediumRisk / totalClauses) * 100 : 0;
  const lowPct = totalClauses > 0 ? (lowRisk / totalClauses) * 100 : 0;

  // Overall risk level
  let overallRisk = "Low";
  let overallRiskIcon = Shield;
  let overallRiskColor = "text-green-600";

  if (highPct > 30) {
    overallRisk = "High";
    overallRiskIcon = AlertCircle;
    overallRiskColor = "text-red-600";
  } else if (highPct > 10 || mediumPct > 40) {
    overallRisk = "Medium";
    overallRiskIcon = AlertTriangle;
    overallRiskColor = "text-orange-600";
  }

  const OverallRiskIcon = overallRiskIcon;

  // Average confidence
  const avgConfidence =
    result.clauses && result.clauses.length > 0
      ? result.clauses.reduce((sum, c) => sum + (c.confidence || 0), 0) /
        result.clauses.length
      : 0;

  const handleExport = async (format: "json" | "txt") => {
    try {
      // For now, create client-side export
      if (format === "json") {
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename.replace(/\.[^.]+$/, "")}_classification.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Exported as JSON");
      } else if (format === "txt") {
        let txtContent = "LEGAL RISK CLASSIFICATION REPORT\n";
        txtContent += "=".repeat(80) + "\n\n";
        txtContent += `Document: ${filename}\n`;
        txtContent += `Total Clauses: ${totalClauses}\n\n`;
        txtContent += `Risk Summary:\n`;
        txtContent += `  High Risk: ${highRisk} clauses (${highPct.toFixed(1)}%)\n`;
        txtContent += `  Medium Risk: ${mediumRisk} clauses (${mediumPct.toFixed(1)}%)\n`;
        txtContent += `  Low Risk: ${lowRisk} clauses (${lowPct.toFixed(1)}%)\n\n`;
        txtContent += "=".repeat(80) + "\n";
        txtContent += "CLASSIFIED CLAUSES\n";
        txtContent += "=".repeat(80) + "\n\n";

        result.clauses?.forEach((clause) => {
          txtContent += `[${clause.risk.toUpperCase()} RISK - ${clause.confidence}% Confidence]\n`;
          txtContent += `${clause.text}\n`;
          txtContent += "-".repeat(80) + "\n\n";
        });

        const dataBlob = new Blob([txtContent], { type: "text/plain" });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename.replace(/\.[^.]+$/, "")}_classification.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Exported as TXT");
      }
    } catch (err: any) {
      toast.error(err?.message || "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Classification Complete
        </h2>
        <p className="text-muted-foreground mt-2">
          Your document has been successfully analyzed for legal risk
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Document Info */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Classification Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Document Name</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {filename}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Clauses</p>
                <p className="font-medium text-foreground">{totalClauses}</p>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Risk Distribution
              </p>

              {/* High Risk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>High Risk</span>
                  </span>
                  <span className="font-medium">
                    {highRisk} ({highPct.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={highPct} className="h-2 bg-red-100" />
              </div>

              {/* Medium Risk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Medium Risk</span>
                  </span>
                  <span className="font-medium">
                    {mediumRisk} ({mediumPct.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={mediumPct} className="h-2 bg-orange-100" />
              </div>

              {/* Low Risk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Low Risk</span>
                  </span>
                  <span className="font-medium">
                    {lowRisk} ({lowPct.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={lowPct} className="h-2 bg-green-100" />
              </div>
            </div>

            {/* Model Info */}
            {result.model_info && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">
                  Models Used
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Segmentation:{" "}
                    <span className="font-medium text-foreground">
                      {result.model_info.segmentation_model}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Classification:{" "}
                    <span className="font-medium text-foreground">
                      {result.model_info.classification_model}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Device:{" "}
                    <span className="font-medium text-foreground">
                      {result.model_info.device}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Risk */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
                <OverallRiskIcon className={`w-8 h-8 ${overallRiskColor}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Overall Risk Level
              </p>
              <p className={`text-2xl font-bold ${overallRiskColor}`}>
                {overallRisk}
              </p>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Confidence</span>
                <span className="font-medium">{avgConfidence.toFixed(1)}%</span>
              </div>
              <Progress value={avgConfidence} className="h-2" />
            </div>

            {/* Export Actions */}
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Export Report</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport("json")}
              >
                <Download className="w-4 h-4 mr-2" />
                JSON Format
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport("txt")}
              >
                <Download className="w-4 h-4 mr-2" />
                Text Format
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Results
        </Button>
        <Button onClick={onComplete}>Analyze Another Document</Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { FileText, AlertCircle, TrendingUp } from "lucide-react";
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

interface Clause {
  id: number;
  text: string;
  risk: "high" | "medium" | "low";
  confidence: number;
  keyFactors: string[];
}

interface ClassificationWorkspaceProps {
  file: File;
  onComplete: () => void;
  onCancel: () => void;
}

export function ClassificationWorkspace({
  file,
  onComplete,
  onCancel,
}: ClassificationWorkspaceProps) {
  // Sample document text - in production, this would be extracted from the uploaded file
  const [documentText] =
    useState(`IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA

SC APPEAL NO. 15/2023

In the matter of an Appeal from the Judgment of the Court of Appeal

BETWEEN:
JOHN PERERA
Plaintiff-Appellant

AND:
SILVA ENTERPRISES (PRIVATE) LIMITED
Defendant-Respondent

JUDGMENT

This Appeal arises from a commercial dispute concerning breach of contract and damages claimed by the Plaintiff-Appellant against the Defendant-Respondent.

FACTS OF THE CASE

The Plaintiff entered into a contract with the Defendant on 15th January 2021 for the supply of construction materials. The Defendant failed to deliver the materials within the agreed timeframe, causing significant financial losses to the Plaintiff.

The Plaintiff claims damages amounting to Rs. 5,000,000 for breach of contract. The Defendant admits the delay but disputes the quantum of damages.

ISSUES FOR DETERMINATION

1. Whether the Defendant breached the contract
2. Whether the Plaintiff is entitled to damages
3. The quantum of damages, if any

ANALYSIS AND FINDINGS

Upon careful consideration of the evidence presented, this Court finds that the Defendant did breach the contract by failing to deliver the materials within the stipulated timeframe.

The Plaintiff has provided sufficient evidence of the financial losses incurred due to the delay. However, the quantum of damages claimed appears to be excessive.

The Court notes that the Plaintiff failed to mitigate losses by seeking alternative suppliers. This failure must be taken into account when assessing damages.

The Defendant's conduct, while constituting a breach, was not malicious or intentional. The delay was caused by unforeseen circumstances beyond their reasonable control.

DECISION

The Court finds in favor of the Plaintiff regarding the breach of contract. However, the damages are reduced to Rs. 2,500,000 taking into account the Plaintiff's failure to mitigate losses and the circumstances of the breach.

The Defendant is ordered to pay the reduced damages within 60 days of this judgment. Costs are awarded to the Plaintiff.

Any further delays in payment will result in additional penalties as prescribed by law.`);

  // Sample clauses extracted and classified - in production, this would come from the AI model
  const [clauses] = useState<Clause[]>([
    {
      id: 1,
      text: "The Defendant failed to deliver the materials within the agreed timeframe, causing significant financial losses to the Plaintiff.",
      risk: "high",
      confidence: 94.5,
      keyFactors: [
        "Admission of breach",
        "Quantifiable damages",
        "Direct causation",
        "Material harm established",
      ],
    },
    {
      id: 2,
      text: "The Plaintiff claims damages amounting to Rs. 5,000,000 for breach of contract.",
      risk: "medium",
      confidence: 87.2,
      keyFactors: [
        "Specific monetary claim",
        "Subject to judicial review",
        "Quantum may be disputed",
      ],
    },
    {
      id: 3,
      text: "The Defendant admits the delay but disputes the quantum of damages.",
      risk: "high",
      confidence: 91.8,
      keyFactors: [
        "Admission of delay",
        "Liability acknowledged",
        "Quantum in dispute",
        "Partial defense only",
      ],
    },
    {
      id: 4,
      text: "Upon careful consideration of the evidence presented, this Court finds that the Defendant did breach the contract by failing to deliver the materials within the stipulated timeframe.",
      risk: "high",
      confidence: 96.3,
      keyFactors: [
        "Court finding",
        "Breach established",
        "Evidence-based decision",
        "Legal liability confirmed",
      ],
    },
    {
      id: 5,
      text: "The Plaintiff has provided sufficient evidence of the financial losses incurred due to the delay.",
      risk: "low",
      confidence: 89.1,
      keyFactors: [
        "Procedural statement",
        "Evidence assessment",
        "No new liability created",
      ],
    },
    {
      id: 6,
      text: "However, the quantum of damages claimed appears to be excessive.",
      risk: "medium",
      confidence: 85.7,
      keyFactors: [
        "Damages may be reduced",
        "Claim challenged",
        "Moderate financial impact",
      ],
    },
    {
      id: 7,
      text: "The Court notes that the Plaintiff failed to mitigate losses by seeking alternative suppliers.",
      risk: "high",
      confidence: 92.4,
      keyFactors: [
        "Failure to mitigate",
        "Adverse finding",
        "Damages reduction likely",
        "Legal duty breach",
      ],
    },
    {
      id: 8,
      text: "The Defendant's conduct, while constituting a breach, was not malicious or intentional.",
      risk: "low",
      confidence: 88.6,
      keyFactors: [
        "Mitigating circumstance",
        "No malice found",
        "Reduces liability severity",
      ],
    },
    {
      id: 9,
      text: "The delay was caused by unforeseen circumstances beyond their reasonable control.",
      risk: "low",
      confidence: 86.9,
      keyFactors: [
        "Force majeure elements",
        "Reduced culpability",
        "Partial defense established",
      ],
    },
    {
      id: 10,
      text: "The Court finds in favor of the Plaintiff regarding the breach of contract.",
      risk: "medium",
      confidence: 93.1,
      keyFactors: [
        "Liability established",
        "Favorable finding",
        "Quantum pending",
      ],
    },
    {
      id: 11,
      text: "However, the damages are reduced to Rs. 2,500,000 taking into account the Plaintiff's failure to mitigate losses and the circumstances of the breach.",
      risk: "high",
      confidence: 95.7,
      keyFactors: [
        "50% damages reduction",
        "Final monetary award",
        "Mitigation failure impact",
        "Significant financial consequence",
      ],
    },
    {
      id: 12,
      text: "The Defendant is ordered to pay the reduced damages within 60 days of this judgment.",
      risk: "medium",
      confidence: 90.5,
      keyFactors: [
        "Payment order",
        "Time-bound obligation",
        "Enforceable judgment",
      ],
    },
    {
      id: 13,
      text: "Any further delays in payment will result in additional penalties as prescribed by law.",
      risk: "high",
      confidence: 93.8,
      keyFactors: [
        "Penalty clause",
        "Escalating liability risk",
        "Conditional additional costs",
        "Compliance critical",
      ],
    },
  ]);

  const [filter, setFilter] = useState<string>("all");
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClauseClick = (clause: Clause) => {
    setSelectedClause(clause);
    setDialogOpen(true);
  };

  const getHighlightClass = (risk: "high" | "medium" | "low") => {
    switch (risk) {
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
        <div className="whitespace-pre" style={{ lineHeight: '1.2' }}>
          {documentText}
        </div>
      );
    }

    let result = documentText;
    const replacements: Array<{
      index: number;
      length: number;
      clause: Clause;
    }> = [];

    // Find all clause positions in the document
    clauses.forEach((clause) => {
      const index = result.indexOf(clause.text);
      if (index !== -1) {
        replacements.push({
          index: index,
          length: clause.text.length,
          clause: clause,
        });
      }
    });

    // Sort by position
    replacements.sort((a, b) => a.index - b.index);

    // Build highlighted document
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    replacements.forEach((replacement) => {
      const shouldHighlight =
        filter === "all" || filter === replacement.clause.risk;

      // Add text before this clause
      if (replacement.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {result.substring(lastIndex, replacement.index)}
          </span>
        );
      }

      // Add the clause (highlighted or not)
      if (shouldHighlight) {
        parts.push(
          <mark
            key={`clause-${replacement.clause.id}`}
            onClick={() => handleClauseClick(replacement.clause)}
            className={`${getHighlightClass(
              replacement.clause.risk
            )} cursor-pointer transition-all hover:opacity-80 hover:shadow-sm`}
            title={`${replacement.clause.risk.toUpperCase()} RISK (${
              replacement.clause.confidence
            }% confidence) - Click for details`}
          >
            {replacement.clause.text}
          </mark>
        );
      } else {
        parts.push(
          <span key={`clause-${replacement.clause.id}`}>
            {replacement.clause.text}
          </span>
        );
      }

      lastIndex = replacement.index + replacement.length;
    });

    // Add remaining text
    if (lastIndex < result.length) {
      parts.push(<span key={`text-end`}>{result.substring(lastIndex)}</span>);
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
  };

  const riskStats = {
    high: clauses.filter((c) => c.risk === "high").length,
    medium: clauses.filter((c) => c.risk === "medium").length,
    low: clauses.filter((c) => c.risk === "low").length,
    total: clauses.length,
  };

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
          <span className="text-sm">{file.name}</span>
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
          <CardTitle className="text-base">Judgment Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-foreground text-sm" style={{ lineHeight: '1.2' }}>
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
                  "{selectedClause.text}"
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

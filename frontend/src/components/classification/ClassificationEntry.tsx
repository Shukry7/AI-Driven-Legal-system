import { AlertCircle, Upload, Clock, CheckCircle } from "lucide-react";
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
  onSelectJob?: (id: string) => void;
}

export function ClassificationEntry({
  onStartNew,
  onSelectJob,
}: ClassificationEntryProps) {
  const recentAnalyses = [
    {
      id: "1",
      name: "Supreme Court Judgment - Civil Appeal 2023/45",
      date: "2024-01-15",
      status: "completed",
      highRisk: 5,
      mediumRisk: 8,
      lowRisk: 12,
    },
    {
      id: "2",
      name: "District Court - Contract Dispute Case",
      date: "2024-01-14",
      status: "completed",
      highRisk: 3,
      mediumRisk: 6,
      lowRisk: 15,
    },
    {
      id: "3",
      name: "High Court - Property Rights Matter",
      date: "2024-01-12",
      status: "completed",
      highRisk: 7,
      mediumRisk: 10,
      lowRisk: 8,
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
            Analyze New Judgment
          </Button>
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Analyses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => onSelectJob?.(analysis.id)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {analysis.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {analysis.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="font-medium">{analysis.highRisk}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="font-medium">
                          {analysis.mediumRisk}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium">{analysis.lowRisk}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </div>
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

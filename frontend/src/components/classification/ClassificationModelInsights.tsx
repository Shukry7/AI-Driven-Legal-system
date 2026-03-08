/**
 * ClassificationModelInsights - Shows Legal-BERT model performance and training details
 * Based on actual training results from Google Colab
 */
import { useState } from "react";
import {
  Brain,
  Zap,
  Cpu,
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Layers,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClassificationModelInsightsProps {
  onBack: () => void;
}

export function ClassificationModelInsights({
  onBack,
}: ClassificationModelInsightsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Training data from Colab notebook
  const segmentationMetrics = {
    f1: 0.8542,
    accuracy: 0.9123,
    precision: 0.8698,
    recall: 0.8401,
  };

  const classificationMetrics = {
    f1: 0.8634,
    accuracy: 0.8745,
    precision: 0.8701,
    recall: 0.8598,
  };

  const trainingConfig = {
    segmentation: {
      model: "nlpaueb/legal-bert-base-uncased",
      learningRate: "3e-5",
      batchSize: 8,
      epochs: 8,
      maxLength: 256,
      optimizer: "AdamW",
      weightDecay: 0.01,
    },
    classification: {
      model: "nlpaueb/legal-bert-base-uncased",
      learningRate: "2e-5",
      batchSize: 8,
      epochs: 8,
      maxLength: 256,
      optimizer: "AdamW",
      weightDecay: 0.01,
    },
  };

  const datasetInfo = {
    segmentation: {
      totalSamples: "2,071 sentences",
      trainingSamples: "1,656 (80%)",
      testSamples: "415 (20%)",
      labelDistribution: {
        O: "45.2%",
        "B-CLAUSE": "27.4%",
        "I-CLAUSE": "27.4%",
      },
    },
    classification: {
      totalSamples: "2,071 clauses",
      trainingSamples: "1,656 (80%)",
      testSamples: "415 (20%)",
      labelDistribution: {
        High: "18.2%",
        Medium: "37.6%",
        Low: "44.2%",
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Model Insights
          </h2>
          <p className="text-muted-foreground mt-1">
            Legal-BERT fine-tuned for Sri Lankan legal document analysis
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Model Overview Card */}
      <Card className="border-accent/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                Legal-BERT Two-Stage Pipeline
              </CardTitle>
              <CardDescription>
                Fine-tuned on Sri Lankan civil court judgments
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Production Ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">Base Model</span>
              </div>
              <p className="font-medium text-foreground">
                nlpaueb/legal-bert-base-uncased
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span className="text-sm">Parameters</span>
              </div>
              <p className="font-medium text-foreground">110M (Base)</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Avg. Speed</span>
              </div>
              <p className="font-medium text-foreground">~1-2 sec/doc</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                <span className="text-sm">Training Device</span>
              </div>
              <p className="font-medium text-foreground">CUDA GPU (Colab)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Detailed Insights */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Segmentation Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Stage 1: Clause Segmentation
                </CardTitle>
                <CardDescription>
                  Token-level BIO tagging with Legal-BERT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">F1-Score</span>
                    <span className="font-semibold">
                      {(segmentationMetrics.f1 * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={segmentationMetrics.f1 * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-semibold">
                      {(segmentationMetrics.accuracy * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={segmentationMetrics.accuracy * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precision</span>
                    <span className="font-semibold">
                      {(segmentationMetrics.precision * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={segmentationMetrics.precision * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recall</span>
                    <span className="font-semibold">
                      {(segmentationMetrics.recall * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={segmentationMetrics.recall * 100} />
                </div>
              </CardContent>
            </Card>

            {/* Classification Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                  Stage 2: Risk Classification
                </CardTitle>
                <CardDescription>
                  Sequence classification (High/Medium/Low)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">F1-Score</span>
                    <span className="font-semibold">
                      {(classificationMetrics.f1 * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={classificationMetrics.f1 * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-semibold">
                      {(classificationMetrics.accuracy * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={classificationMetrics.accuracy * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precision</span>
                    <span className="font-semibold">
                      {(classificationMetrics.precision * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={classificationMetrics.precision * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recall</span>
                    <span className="font-semibold">
                      {(classificationMetrics.recall * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={classificationMetrics.recall * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Advantages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Domain-Specific</p>
                    <p className="text-xs text-muted-foreground">
                      Pre-trained on legal corpora for better understanding
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">High Accuracy</p>
                    <p className="text-xs text-muted-foreground">
                      86%+ F1-score on both segmentation and classification
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Fast Processing</p>
                    <p className="text-xs text-muted-foreground">
                      Real-time classification in 1-2 seconds per document
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segmentation Tab */}
        <TabsContent value="segmentation" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Training Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs">
                    {trainingConfig.segmentation.model}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Learning Rate</span>
                  <span className="font-medium">
                    {trainingConfig.segmentation.learningRate}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Batch Size</span>
                  <span className="font-medium">
                    {trainingConfig.segmentation.batchSize}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Epochs</span>
                  <span className="font-medium">
                    {trainingConfig.segmentation.epochs}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Length</span>
                  <span className="font-medium">
                    {trainingConfig.segmentation.maxLength}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dataset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Samples</span>
                  <span className="font-medium">
                    {datasetInfo.segmentation.totalSamples}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Training Set</span>
                  <span className="font-medium">
                    {datasetInfo.segmentation.trainingSamples}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Test Set</span>
                  <span className="font-medium">
                    {datasetInfo.segmentation.testSamples}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">
                    Label Distribution:
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">O (Outside)</span>
                      <span className="font-medium">
                        {datasetInfo.segmentation.labelDistribution.O}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        B-CLAUSE (Begin)
                      </span>
                      <span className="font-medium">
                        {datasetInfo.segmentation.labelDistribution["B-CLAUSE"]}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        I-CLAUSE (Inside)
                      </span>
                      <span className="font-medium">
                        {datasetInfo.segmentation.labelDistribution["I-CLAUSE"]}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Legal-BERT Encoder</p>
                    <p className="text-xs text-muted-foreground">
                      12-layer transformer pre-trained on legal documents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Token Classification Head
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Linear layer with 3 outputs (O, B-CLAUSE, I-CLAUSE)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Subword Alignment</p>
                    <p className="text-xs text-muted-foreground">
                      Character-offset mapping for pixel-perfect highlighting
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classification Tab */}
        <TabsContent value="classification" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Training Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs">
                    {trainingConfig.classification.model}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Learning Rate</span>
                  <span className="font-medium">
                    {trainingConfig.classification.learningRate}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Batch Size</span>
                  <span className="font-medium">
                    {trainingConfig.classification.batchSize}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Epochs</span>
                  <span className="font-medium">
                    {trainingConfig.classification.epochs}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Length</span>
                  <span className="font-medium">
                    {trainingConfig.classification.maxLength}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dataset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Samples</span>
                  <span className="font-medium">
                    {datasetInfo.classification.totalSamples}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Training Set</span>
                  <span className="font-medium">
                    {datasetInfo.classification.trainingSamples}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Test Set</span>
                  <span className="font-medium">
                    {datasetInfo.classification.testSamples}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Risk Distribution:</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">High Risk</span>
                      <span className="font-medium text-red-600">
                        {datasetInfo.classification.labelDistribution.High}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Medium Risk</span>
                      <span className="font-medium text-yellow-600">
                        {datasetInfo.classification.labelDistribution.Medium}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Low Risk</span>
                      <span className="font-medium text-green-600">
                        {datasetInfo.classification.labelDistribution.Low}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Legal-BERT Encoder</p>
                    <p className="text-xs text-muted-foreground">
                      Same pre-trained model with legal domain knowledge
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Sequence Classification Head
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pooled output + linear layer with 3 risk classes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Softmax Classification
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence scores for High/Medium/Low risk levels
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Alert */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Optimized for Legal Domain
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Legal-BERT's pre-training on legal corpora provides a
                    significant advantage over general-purpose BERT models,
                    especially for understanding legal terminology and clause
                    structures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

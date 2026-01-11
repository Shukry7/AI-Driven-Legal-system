import { TrendingDown, Zap, Globe, Cpu, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ModelInsightsProps {
  onBack: () => void;
}

export function ModelInsights({ onBack }: ModelInsightsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Model Insights</h2>
          <p className="text-muted-foreground mt-1">
            Performance metrics and research overview for the fine-tuned mBART model
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Model Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">mBART Fine-Tuned Legal Model</CardTitle>
              <CardDescription>Stage 1 - Sri Lankan Legal Corpus</CardDescription>
            </div>
            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span className="text-sm">Languages</span>
              </div>
              <p className="font-medium text-foreground">English, Sinhala, Tamil</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">Base Model</span>
              </div>
              <p className="font-medium text-foreground">facebook/mbart-large-50</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Avg. Speed</span>
              </div>
              <p className="font-medium text-foreground">~2.5 sec/page</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Training Data</span>
              </div>
              <p className="font-medium text-foreground">50,000+ legal documents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-success" />
              Training Loss Curve
            </CardTitle>
            <CardDescription>Before vs After Fine-tuning</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Simple Chart Representation */}
            <div className="h-48 relative">
              <div className="absolute inset-0 flex items-end justify-between gap-2 pb-8">
                {[2.8, 2.4, 1.9, 1.5, 1.2, 0.9, 0.7, 0.5, 0.4, 0.35].map((value, i) => (
                  <div 
                    key={i}
                    className="flex-1 bg-accent/20 rounded-t transition-all hover:bg-accent/30"
                    style={{ height: `${value * 30}%` }}
                  />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
                <span>Epoch 1</span>
                <span>Epoch 5</span>
                <span>Epoch 10</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Initial Loss: </span>
                <span className="font-medium text-foreground">2.84</span>
              </div>
              <div>
                <span className="text-muted-foreground">Final Loss: </span>
                <span className="font-medium text-success">0.35</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reduction: </span>
                <span className="font-medium text-success">87.7%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              BLEU Score Improvement
            </CardTitle>
            <CardDescription>Translation quality metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Before/After Comparison Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">EN → SI (Before)</span>
                    <span className="font-medium">0.52</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: '52%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">EN → SI (After)</span>
                    <span className="font-medium text-success">0.84</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: '84%' }} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">EN → TA (Before)</span>
                    <span className="font-medium">0.48</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: '48%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">EN → TA (After)</span>
                    <span className="font-medium text-success">0.81</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: '81%' }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics by Language Pair</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Language Pair</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">BLEU Score</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Legal Term Accuracy</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Avg. Processing Time</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">English → Sinhala</td>
                <td className="py-3 px-4 text-center text-success font-medium">0.847</td>
                <td className="py-3 px-4 text-center">98.2%</td>
                <td className="py-3 px-4 text-center">2.3s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-success/10 text-success border-0">Excellent</Badge>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">English → Tamil</td>
                <td className="py-3 px-4 text-center text-success font-medium">0.812</td>
                <td className="py-3 px-4 text-center">96.8%</td>
                <td className="py-3 px-4 text-center">2.5s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-success/10 text-success border-0">Excellent</Badge>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">Sinhala → English</td>
                <td className="py-3 px-4 text-center text-success font-medium">0.823</td>
                <td className="py-3 px-4 text-center">97.5%</td>
                <td className="py-3 px-4 text-center">2.4s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-success/10 text-success border-0">Excellent</Badge>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">Tamil → English</td>
                <td className="py-3 px-4 text-center text-warning font-medium">0.795</td>
                <td className="py-3 px-4 text-center">95.2%</td>
                <td className="py-3 px-4 text-center">2.6s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-warning/10 text-warning border-0">Good</Badge>
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">Sinhala → Tamil</td>
                <td className="py-3 px-4 text-center text-warning font-medium">0.768</td>
                <td className="py-3 px-4 text-center">94.1%</td>
                <td className="py-3 px-4 text-center">2.8s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-warning/10 text-warning border-0">Good</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Tamil → Sinhala</td>
                <td className="py-3 px-4 text-center text-warning font-medium">0.754</td>
                <td className="py-3 px-4 text-center">93.8%</td>
                <td className="py-3 px-4 text-center">2.9s</td>
                <td className="py-3 px-4 text-center">
                  <Badge className="bg-warning/10 text-warning border-0">Good</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Research Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Research & Development
            </h3>
            <p className="text-sm text-muted-foreground">
              This model was fine-tuned on a curated corpus of 50,000+ Sri Lankan legal documents, 
              including court proceedings, contracts, and statutory texts. The training focused on 
              preserving legal terminology accuracy while maintaining fluent translations across 
              English, Sinhala, and Tamil.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

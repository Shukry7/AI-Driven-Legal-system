import { CheckCircle2, Download, FileText, Link2, BarChart3, Clock, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TranslationSummaryProps {
  onComplete: () => void;
  onBack: () => void;
}

export function TranslationSummary({ onComplete, onBack }: TranslationSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Translation Complete</h2>
        <p className="text-muted-foreground mt-2">
          Your document has been successfully translated and is ready for download
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
                  Plaintiff_Statement.pdf
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Case Reference</p>
                <p className="font-medium text-foreground">CASE-2024-0341</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Translation Direction</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  English → Sinhala
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  2.3 seconds
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">15</p>
                <p className="text-xs text-muted-foreground mt-1">Clauses Translated</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">847</p>
                <p className="text-xs text-muted-foreground mt-1">Words Processed</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">23</p>
                <p className="text-xs text-muted-foreground mt-1">Legal Terms</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-xs text-muted-foreground mt-1">Pages</p>
              </div>
            </div>

            {/* Quality Indicators */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground">Quality Indicators</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Overall Confidence</span>
                    <span className="font-medium text-success">92.4%</span>
                  </div>
                  <Progress value={92.4} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Legal Term Accuracy</span>
                    <span className="font-medium text-success">98.2%</span>
                  </div>
                  <Progress value={98.2} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Estimated BLEU Score</span>
                    <span className="font-medium text-foreground">0.847</span>
                  </div>
                  <Progress value={84.7} className="h-2" />
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
              <Button variant="outline" className="w-full justify-start gap-3">
                <div className="w-8 h-8 bg-destructive/10 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-medium">PDF Document</p>
                  <p className="text-xs text-muted-foreground">Formatted for print</p>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Word Document</p>
                  <p className="text-xs text-muted-foreground">Editable DOCX format</p>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-3">
                <div className="w-8 h-8 bg-warning/10 rounded flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-warning" />
                </div>
                <div className="text-left">
                  <p className="font-medium">JSON Output</p>
                  <p className="text-xs text-muted-foreground">Structured data format</p>
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
                Link this translation to CASE-2024-0341
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

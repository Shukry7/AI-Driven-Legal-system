import { FileText, Upload, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/config/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ClauseEntryProps {
  onStartNew: () => void;
  onSelectJob?: (id: string) => void;
}

export function ClauseEntry({ onStartNew }: ClauseEntryProps) {
  const [recentAnalyses, setRecentAnalyses] = useState<Array<{ filename: string; date: string }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const files = await api.getRecentUploads();
        if (!mounted) return;
        setRecentAnalyses(files.map(f => ({ filename: f.filename, date: new Date(f.iso_timestamp).toLocaleString() })));
      } catch (err) {
        console.error('Failed to load recent uploads', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6 text-accent" />
            Clause Detection & Analysis
          </CardTitle>
          <CardDescription>
            AI-powered analysis to detect missing, corrupted, or problematic clauses in legal documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onStartNew}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            Start New Analysis
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
            {recentAnalyses.map((analysis, idx) => (
              <div
                key={analysis.filename + idx}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{analysis.filename}</h3>
                    <p className="text-sm text-muted-foreground">{analysis.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">Ready</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Detection Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                Missing clauses
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                Corrupted text
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                Incomplete sections
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>Automatic clause detection</li>
              <li>Smart text prediction</li>
              <li>Compliance validation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Supported Formats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>PDF Documents</li>
              <li>Word (.docx)</li>
              <li>Text Files (.txt)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

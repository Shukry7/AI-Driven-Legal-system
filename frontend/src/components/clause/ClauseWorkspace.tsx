import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText, ZoomIn, ZoomOut, Download, AlertTriangle, Eye, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ClauseWorkspaceProps {
  file: File;
  onComplete: (results: AnalysisResults) => void;
  onCancel: () => void;
}

interface AnalysisResults {
  totalClauses: number;
  validClauses: number;
  missingClauses: MissingClause[];
  corruptedClauses: CorruptedClause[];
}

interface MissingClause {
  id: number;
  name: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  expectedLocation: string;
  suggestion: string;
  predictedText: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
}

interface CorruptedClause {
  id: number;
  name: string;
  issue: string;
  section: string;
  suggestion: string;
  predictedText: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
}

interface ProcessStep {
  id: number;
  name: string;
  status: 'pending' | 'processing' | 'complete';
  icon: string;
}

export function ClauseWorkspace({ file, onComplete, onCancel }: ClauseWorkspaceProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedIssue, setSelectedIssue] = useState<{ type: string; data: any } | null>(null);

  const steps: ProcessStep[] = [
    { id: 1, name: 'Extracting text', status: 'pending', icon: '📄' },
    { id: 2, name: 'Identifying clauses', status: 'pending', icon: '🔍' },
    { id: 3, name: 'Validating structure', status: 'pending', icon: '✓' },
    { id: 4, name: 'Checking completeness', status: 'pending', icon: '📋' },
    { id: 5, name: 'Generating report', status: 'pending', icon: '📊' }
  ];

  const [processSteps, setProcessSteps] = useState(steps);

  const documentText = `
    EMPLOYMENT AGREEMENT

    This Employment Agreement ("Agreement") is entered into as of January 1, 2024, by and between TechCorp Inc. ("Employer") and John Doe ("Employee").

    1. POSITION AND DUTIES
    Employee agrees to serve as Senior Software Engineer and shall perform duties as assigned by the Employer.

    2. COMPENSATION
    Employee shall receive an annual salary of [CORRUPTED: $###,###] payable in accordance with standard payroll practices.

    3. TERM OF EMPLOYMENT
    This Agreement shall commence on January 1, 2024 and continue until terminated by either party.

    4. CONFIDENTIALITY
    Employee agrees to maintain confidentiality of all proprietary information during employment.

    5. INTELLECTUAL PROPERTY
    All work product created during employment shall belong to Employer.

    6. TERMINATION
    Either party may terminate this agreement with [CORRUPTED: ## days] written notice.

    7. GOVERNING LAW
    This Agreement shall be governed by the laws of the State of California.

    [MISSING: Force Majeure Clause - Should appear here]

    8. ENTIRE AGREEMENT
    This Agreement constitutes the entire agreement between the parties.

    [MISSING: Arbitration Clause - Required for dispute resolution]
  `;

  const mockResults: AnalysisResults = {
    totalClauses: 24,
    validClauses: 19,
    missingClauses: [
      {
        id: 1,
        name: 'Force Majeure Clause',
        severity: 'high',
        description: 'Protection for unforeseen circumstances beyond control',
        expectedLocation: 'Section 8',
        suggestion: 'Should include provisions for natural disasters, pandemics, and government actions',
        predictedText: 'Neither party shall be liable for any failure or delay in performance under this Agreement due to causes beyond their reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, pandemics, government actions, labor disputes, or utility failures. The affected party shall promptly notify the other party and shall use reasonable efforts to minimize the impact of such events.',
        status: 'pending'
      },
      {
        id: 2,
        name: 'Arbitration Clause',
        severity: 'medium',
        description: 'Dispute resolution mechanism missing',
        expectedLocation: 'Section 9',
        suggestion: 'Recommend mandatory arbitration before litigation',
        predictedText: 'Any dispute, controversy, or claim arising out of or relating to this Agreement shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in California, and the decision of the arbitrator shall be final and binding upon both parties.',
        status: 'pending'
      }
    ],
    corruptedClauses: [
      {
        id: 1,
        name: 'Compensation Amount',
        issue: 'Salary figure corrupted or unreadable',
        section: '2. COMPENSATION',
        suggestion: 'Verify and restore the exact compensation amount',
        predictedText: '$125,000',
        status: 'pending'
      },
      {
        id: 2,
        name: 'Notice Period',
        issue: 'Number of days missing',
        section: '6. TERMINATION',
        suggestion: 'Standard notice period is typically 14-30 days',
        predictedText: '30 days',
        status: 'pending'
      }
    ]
  };

  useEffect(() => {
    startAnalysis();
  }, []);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisComplete(false);

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setProcessSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx < i + 1 ? 'complete' : idx === i + 1 ? 'processing' : 'pending'
      })));
      setProgress(((i + 1) / steps.length) * 100);
    }

    setAnalyzing(false);
    setAnalysisComplete(true);
  };

  const renderDocumentWithHighlights = () => {
    const lines = documentText.trim().split('\n');

    return lines.map((line, idx) => {
      const isCorrupted = line.includes('[CORRUPTED:');
      const isMissing = line.includes('[MISSING:');

      if (isCorrupted) {
        const match = line.match(/\[CORRUPTED: ([^\]]+)\]/);
        const corruptedText = match ? match[1] : '###';
        const beforeText = line.substring(0, line.indexOf('[CORRUPTED:'));
        const afterText = line.substring(line.indexOf(']') + 1);

        return (
          <div key={idx} className="py-1 hover:bg-warning/5 transition-colors">
            {beforeText}
            <span
              className="relative inline-block bg-warning text-warning-foreground px-2 py-0.5 rounded cursor-pointer hover:bg-warning/80 transition-all duration-200"
              onClick={() => setSelectedIssue({ type: 'corrupted', data: mockResults.corruptedClauses[0] })}
            >
              {corruptedText}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
            </span>
            {afterText}
          </div>
        );
      }

      if (isMissing) {
        const match = line.match(/\[MISSING: ([^\]]+)\]/);
        const missingClause = match ? match[1] : 'Missing Clause';

        return (
          <div key={idx} className="my-4">
            <div
              className="relative bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg cursor-pointer hover:bg-destructive/10 transition-all duration-200 group"
              onClick={() => {
                const clause = mockResults.missingClauses.find(c => missingClause.includes(c.name));
                setSelectedIssue({ type: 'missing', data: clause });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-destructive rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-destructive font-bold text-sm mb-1">
                    ⚠️ MISSING CLAUSE DETECTED
                  </div>
                  <p className="text-foreground font-semibold">{missingClause}</p>
                </div>
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>
        );
      }

      return <div key={idx} className="py-1">{line || '\u00A0'}</div>;
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Document Analysis
          </h2>
          <p className="text-muted-foreground mt-1">
            Analyzing: {file.name}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left & Center - Document Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Document Preview
              </CardTitle>
              {analysisComplete && (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-12 text-center">{zoom}%</span>
                  <Button size="icon" variant="outline" onClick={() => setZoom(Math.min(150, zoom + 10))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto bg-muted/30 p-6 rounded-lg" style={{ maxHeight: '600px' }}>
                {!analysisComplete && analyzing && (
                  <div className="flex flex-col items-center justify-center h-96">
                    <Loader2 className="w-16 h-16 animate-spin text-accent mb-4" />
                    <p className="text-lg font-bold text-foreground">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground mt-2">AI is scanning for issues</p>
                  </div>
                )}

                {analysisComplete && (
                  <div
                    className="font-mono text-sm text-foreground leading-relaxed bg-card p-6 rounded-lg shadow-sm"
                    style={{ fontSize: `${zoom}%` }}
                  >
                    {renderDocumentWithHighlights()}
                  </div>
                )}
              </div>

              {analysisComplete && (
                <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-warning rounded"></div>
                    <span className="font-semibold text-muted-foreground">Corrupted Text</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-destructive/10 border-l-4 border-destructive rounded"></div>
                    <span className="font-semibold text-muted-foreground">Missing Clause</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issue Detail Panel */}
          {selectedIssue && (
            <Card className="border-accent/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-accent" />
                    Issue Details
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedIssue(null)}>
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIssue.type === 'corrupted' && selectedIssue.data && (
                  <>
                    <div className="p-4 bg-warning/10 rounded-lg border-l-4 border-warning">
                      <p className="text-xs font-semibold text-warning uppercase mb-2">Issue Type</p>
                      <Badge variant="default" className="bg-warning text-warning-foreground">
                        🔧 Corrupted Clause
                      </Badge>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clause Name</p>
                      <p className="font-bold text-foreground text-lg">{selectedIssue.data.name}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Location</p>
                      <p className="text-foreground font-medium">{selectedIssue.data.section}</p>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg border-l-4 border-destructive">
                      <p className="text-xs font-semibold text-destructive uppercase mb-2">Problem Identified</p>
                      <p className="text-foreground">{selectedIssue.data.issue}</p>
                    </div>
                    <div className="p-4 bg-success/10 rounded-lg border-l-4 border-success">
                      <p className="text-xs font-semibold text-success uppercase mb-2">💡 Suggestion</p>
                      <p className="text-foreground">{selectedIssue.data.suggestion}</p>
                    </div>
                  </>
                )}

                {selectedIssue.type === 'missing' && selectedIssue.data && (
                  <>
                    <div className="p-4 bg-destructive/10 rounded-lg border-l-4 border-destructive">
                      <p className="text-xs font-semibold text-destructive uppercase mb-2">Issue Type</p>
                      <Badge variant={getSeverityBadge(selectedIssue.data.severity)}>
                        ⚠️ Missing Clause - {selectedIssue.data.severity.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clause Name</p>
                      <p className="font-bold text-foreground text-lg">{selectedIssue.data.name}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Expected Location</p>
                      <p className="text-foreground font-medium">{selectedIssue.data.expectedLocation}</p>
                    </div>
                    <div className="p-4 bg-accent/10 rounded-lg border-l-4 border-accent">
                      <p className="text-xs font-semibold text-accent uppercase mb-2">Description</p>
                      <p className="text-foreground">{selectedIssue.data.description}</p>
                    </div>
                    <div className="p-4 bg-success/10 rounded-lg border-l-4 border-success">
                      <p className="text-xs font-semibold text-success uppercase mb-2">💡 Recommendation</p>
                      <p className="text-foreground">{selectedIssue.data.suggestion}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Progress & Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className={analyzing ? 'animate-spin text-accent' : 'text-success'} />
                Analysis Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="w-full" />
              <div className="space-y-2">
                {processSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {step.status === 'complete' && (
                        <CheckCircle className="w-5 h-5 text-success" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <span className="text-lg">{step.icon}</span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${step.status === 'complete' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {analysisComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-semibold text-muted-foreground">Total Clauses</span>
                  <span className="text-2xl font-bold text-foreground">{mockResults.totalClauses}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                  <span className="text-sm font-semibold text-success">Valid</span>
                  <span className="text-2xl font-bold text-success">{mockResults.validClauses}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg">
                  <span className="text-sm font-semibold text-warning">Corrupted</span>
                  <span className="text-2xl font-bold text-warning">{mockResults.corruptedClauses.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                  <span className="text-sm font-semibold text-destructive">Missing</span>
                  <span className="text-2xl font-bold text-destructive">{mockResults.missingClauses.length}</span>
                </div>
                <Button className="w-full mt-4" onClick={() => onComplete(mockResults)}>
                  <Download className="w-4 h-4 mr-2" />
                  View Suggestions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

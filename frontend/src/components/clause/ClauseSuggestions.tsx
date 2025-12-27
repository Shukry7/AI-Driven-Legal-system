import { useState } from 'react';
import { CheckCircle, XCircle, Edit3, Check, X, Sparkles, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface ClauseSuggestionsProps {
  results: AnalysisResults;
  onComplete: () => void;
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

export function ClauseSuggestions({ results: initialResults, onComplete }: ClauseSuggestionsProps) {
  const [results, setResults] = useState(initialResults);
  const [editingClause, setEditingClause] = useState<{ type: string; clause: any } | null>(null);
  const [editedText, setEditedText] = useState('');

  const handleAcceptClause = (type: 'missingClauses' | 'corruptedClauses', id: number) => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        clause.id === id ? { ...clause, status: 'accepted' } : clause
      )
    }));
  };

  const handleRejectClause = (type: 'missingClauses' | 'corruptedClauses', id: number) => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        clause.id === id ? { ...clause, status: 'rejected' } : clause
      )
    }));
  };

  const handleEditClause = (type: 'missingClauses' | 'corruptedClauses', clause: any) => {
    setEditingClause({ type, clause });
    setEditedText(clause.predictedText);
  };

  const handleSaveEdit = () => {
    if (editingClause) {
      const { type, clause } = editingClause;
      const clauseType = type as 'missingClauses' | 'corruptedClauses';
      setResults(prev => ({
        ...prev,
        [clauseType]: prev[clauseType].map((c: any) =>
          c.id === clause.id ? { ...c, predictedText: editedText, status: 'edited' } : c
        )
      }));
      setEditingClause(null);
      setEditedText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingClause(null);
    setEditedText('');
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
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            AI Predictions
          </h2>
          <p className="text-muted-foreground mt-1">
            Review and approve suggested clauses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button onClick={onComplete}>
            Complete Analysis
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{results.totalClauses}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Clauses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{results.validClauses}</p>
              <p className="text-sm text-muted-foreground mt-1">Valid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{results.corruptedClauses.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Corrupted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{results.missingClauses.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Missing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Corrupted Clauses */}
      {results.corruptedClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              Corrupted Clauses
            </CardTitle>
            <CardDescription>
              Review AI predictions for corrupted or unreadable text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.corruptedClauses.map((clause) => (
              <Card
                key={clause.id}
                className={`${
                  clause.status === 'accepted'
                    ? 'border-success bg-success/5'
                    : clause.status === 'rejected'
                    ? 'border-destructive bg-destructive/5'
                    : clause.status === 'edited'
                    ? 'border-accent bg-accent/5'
                    : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{clause.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{clause.section}</p>
                    </div>
                    {clause.status === 'accepted' && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                      </Badge>
                    )}
                    {clause.status === 'rejected' && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" /> Rejected
                      </Badge>
                    )}
                    {clause.status === 'edited' && (
                      <Badge variant="default">
                        <Edit3 className="w-3 h-3 mr-1" /> Edited
                      </Badge>
                    )}
                  </div>

                  {editingClause?.clause.id === clause.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={3}
                        className="font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="bg-success hover:bg-success/90">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-muted/50 p-3 rounded-lg mb-3">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold">AI Prediction:</p>
                        <p className="text-sm text-foreground font-mono">{clause.predictedText}</p>
                      </div>

                      {!clause.status && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptClause('corruptedClauses', clause.id)}
                            className="flex-1 bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleEditClause('corruptedClauses', clause)}
                            className="flex-1"
                          >
                            <Edit3 className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClause('corruptedClauses', clause.id)}
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing Clauses */}
      {results.missingClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              Missing Clauses
            </CardTitle>
            <CardDescription>
              AI-generated clauses to fill gaps in your document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.missingClauses.map((clause) => (
              <Card
                key={clause.id}
                className={`${
                  clause.status === 'accepted'
                    ? 'border-success bg-success/5'
                    : clause.status === 'rejected'
                    ? 'border-destructive bg-destructive/5'
                    : clause.status === 'edited'
                    ? 'border-accent bg-accent/5'
                    : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{clause.name}</p>
                      <Badge variant={getSeverityBadge(clause.severity)} className="mt-2">
                        {clause.severity.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                    {clause.status === 'accepted' && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                      </Badge>
                    )}
                    {clause.status === 'rejected' && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" /> Rejected
                      </Badge>
                    )}
                    {clause.status === 'edited' && (
                      <Badge variant="default">
                        <Edit3 className="w-3 h-3 mr-1" /> Edited
                      </Badge>
                    )}
                  </div>

                  {editingClause?.clause.id === clause.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={5}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="bg-success hover:bg-success/90">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-muted/50 p-3 rounded-lg mb-3">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold">AI Generated Clause:</p>
                        <p className="text-sm text-foreground">{clause.predictedText}</p>
                      </div>

                      <div className="bg-accent/10 p-3 rounded-lg mb-3 border-l-4 border-accent">
                        <p className="text-xs text-accent font-semibold mb-1">💡 Recommendation:</p>
                        <p className="text-sm text-foreground">{clause.suggestion}</p>
                      </div>

                      {!clause.status && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptClause('missingClauses', clause.id)}
                            className="flex-1 bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleEditClause('missingClauses', clause)}
                            className="flex-1"
                          >
                            <Edit3 className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClause('missingClauses', clause.id)}
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

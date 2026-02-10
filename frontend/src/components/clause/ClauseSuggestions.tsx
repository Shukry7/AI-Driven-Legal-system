import { useState } from 'react';
import { CheckCircle, XCircle, Edit3, Check, X, Sparkles, Download, RotateCcw, CheckCheck, XOctagon, ChevronRight, ChevronLeft, Info, Lightbulb, Copy, AlertTriangle, Eye, FileText, Home, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClauseSuggestionsProps {
  results: AnalysisResults;
  onComplete: () => void;
}

interface AnalysisResults {
  totalClauses: number;
  validClauses: number;
  missingClauses: MissingClause[];
  corruptedClauses: CorruptedClause[];
  originalDocument?: string;
  modifiedDocument?: string;
}

interface MissingClause {
  id: number;
  name: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  expectedLocation: string;
  suggestion: string;
  predictedText: string;
  originalText?: string;
  confidence?: number;
  rationale?: string;
  alternatives?: string[];
  jurisdiction?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
  // NEW: Predictable vs Non-predictable
  isPredictable?: boolean;
  placeholderText?: string;
  inputType?: 'text' | 'date' | 'currency' | 'signature' | 'number';
  userInputValue?: string;
}

interface CorruptedClause {
  id: number;
  name: string;
  issue: string;
  section: string;
  suggestion: string;
  predictedText: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
  // NEW: Corrupted clauses are never predictable
  isPredictable?: false;
  requiresManualInput?: boolean;
  inputType?: 'text' | 'date' | 'currency' | 'number';
  userInputValue?: string;
}

export function ClauseSuggestions({ results: initialResults, onComplete }: ClauseSuggestionsProps) {
  const [results, setResults] = useState(initialResults);
  const [editingClause, setEditingClause] = useState<{ type: string; clause: any } | null>(null);
  const [editedText, setEditedText] = useState('');
  const [style, setStyle] = useState<'formal' | 'plain'>('formal');
  const [currentClauseIndex, setCurrentClauseIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'wizard' | 'list'>('wizard');
  const [mainView, setMainView] = useState<'review' | 'comparison'>('review');
  const [manualInputValues, setManualInputValues] = useState<Record<number, string>>({});
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  // Separate predictable and non-predictable missing clauses
  const predictableMissing = results.missingClauses.filter(c => c.isPredictable !== false);
  const nonPredictableMissing = results.missingClauses.filter(c => c.isPredictable === false);

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
    setEditedText(clause.predictedText || clause.userInputValue || '');
  };

  // Handle manual input for non-predictable clauses
  const handleManualInput = (type: 'missingClauses' | 'corruptedClauses', id: number, value: string) => {
    setManualInputValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveManualInput = (type: 'missingClauses' | 'corruptedClauses', id: number) => {
    const value = manualInputValues[id];
    if (!value) return;
    
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        clause.id === id 
          ? { ...clause, userInputValue: value, predictedText: value, status: 'accepted' } 
          : clause
      )
    }));
  };

  const handleSkipManualInput = (type: 'missingClauses' | 'corruptedClauses', id: number) => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        clause.id === id ? { ...clause, status: 'rejected' } : clause
      )
    }));
  };

  const handleSaveEdit = () => {
    if (editingClause) {
      const { type, clause } = editingClause;
      const clauseType = type as 'missingClauses' | 'corruptedClauses';
      setResults(prev => ({
        ...prev,
        [clauseType]: prev[clauseType].map((c: any) =>
          c.id === clause.id 
            ? { 
                ...c, 
                originalText: c.originalText || c.predictedText, // Store original
                predictedText: editedText, 
                status: 'edited' 
              } 
            : c
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

  const handleResetClause = (type: 'missingClauses' | 'corruptedClauses', id: number) => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        clause.id === id 
          ? { 
              ...clause, 
              status: undefined,
              predictedText: clause.originalText || clause.predictedText 
            } 
          : clause
      )
    }));
  };

  const handleAcceptAll = (type: 'missingClauses' | 'corruptedClauses') => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        !clause.status ? { ...clause, status: 'accepted' } : clause
      )
    }));
  };

  const handleRejectAll = (type: 'missingClauses' | 'corruptedClauses') => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) =>
        !clause.status ? { ...clause, status: 'rejected' } : clause
      )
    }));
  };

  const handleDownloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clause-analysis-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToDatabase = async () => {
    try {
      const analysisData = {
        timestamp: new Date().toISOString(),
        totalClauses: results.totalClauses,
        validClauses: results.validClauses,
        missingClauses: results.missingClauses,
        corruptedClauses: results.corruptedClauses,
        acceptedChanges: [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'accepted'),
        rejectedChanges: [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'rejected'),
        editedChanges: [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'edited')
      };
      
      console.log('Saving to database:', analysisData);
      // TODO: Replace with actual API call
      // await fetch('/api/clause-analysis', { method: 'POST', body: JSON.stringify(analysisData) });
      
      setIsSavedToDb(true);
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  };

  const handleBackToDashboard = () => {
    setShowCompleteDialog(false);
    onComplete();
  };

  const generateReport = () => {
    const acceptedCount = [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'accepted').length;
    const rejectedCount = [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'rejected').length;
    const editedCount = [...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'edited').length;
    
    return `CLAUSE ANALYSIS REPORT
========================
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Clauses: ${results.totalClauses}
Valid Clauses: ${results.validClauses}
Corrupted Clauses: ${results.corruptedClauses.length}
Missing Clauses: ${results.missingClauses.length}

REVIEW STATISTICS
-----------------
Accepted: ${acceptedCount}
Rejected: ${rejectedCount}
Edited: ${editedCount}
Pending: ${[...results.missingClauses, ...results.corruptedClauses].filter(c => !c.status).length}

MISSING CLAUSES
---------------
${results.missingClauses.map(c => `
${c.name} (${c.severity.toUpperCase()})
Status: ${c.status || 'Pending'}
Description: ${c.description}
Suggestion: ${c.suggestion}
${c.status === 'accepted' ? `Accepted Text: ${c.userInputValue || c.predictedText}` : ''}`).join('\n')}

CORRUPTED CLAUSES
-----------------
${results.corruptedClauses.map(c => `
${c.name}
Status: ${c.status || 'Pending'}
Issue: ${c.issue}
Suggestion: ${c.suggestion}
${c.status === 'accepted' ? `Corrected Text: ${c.userInputValue || c.predictedText}` : ''}`).join('\n')}

--- END OF REPORT ---`;
  };


  const handleResetAll = (type: 'missingClauses' | 'corruptedClauses') => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type].map((clause: any) => ({
        ...clause,
        status: undefined,
        predictedText: clause.originalText || clause.predictedText
      }))
    }));
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

  const applyStyle = (text: string, mode: 'formal' | 'plain') => {
    if (mode === 'plain') {
      // Minimal heuristic simplifier for plain language
      return text
        .replace(/hereunder|thereunder|hereto|thereof/gi, 'this agreement')
        .replace(/forthwith/gi, 'immediately')
        .replace(/notwithstanding/gi, 'despite')
        .replace(/shall/gi, 'will')
        .replace(/party/gi, 'side')
        .replace(/in accordance with/gi, 'under')
        .replace(/prior to/gi, 'before');
    }
    return text;
  };

  // Get input type icon and placeholder
  const getInputConfig = (inputType?: string) => {
    switch (inputType) {
      case 'date': return { placeholder: 'YYYY-MM-DD', type: 'date' };
      case 'currency': return { placeholder: '$0.00', type: 'text' };
      case 'number': return { placeholder: 'Enter number', type: 'number' };
      case 'signature': return { placeholder: 'Type signature or leave blank', type: 'text' };
      default: return { placeholder: 'Enter value', type: 'text' };
    }
  };

  // Calculate progress
  const totalItems = [...results.missingClauses, ...results.corruptedClauses];
  const completedItems = totalItems.filter(c => c.status === 'accepted' || c.status === 'edited');
  const progress = totalItems.length > 0 ? (completedItems.length / totalItems.length) * 100 : 0;

  // Check if ready for comparison view
  const allReviewed = totalItems.every(c => c.status);
  const acceptedChanges = totalItems.filter(c => c.status === 'accepted' || c.status === 'edited');

  const renderComparisonView = () => {
    if (!results.originalDocument || !results.modifiedDocument) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Document comparison data not available</p>
          </CardContent>
        </Card>
      );
    }

    // Normalize line endings so \r\n vs \n doesn't cause every line to be treated as "new"
    const toNormalizedLines = (doc: string) =>
      doc
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .split('\n');

    const originalLines = toNormalizedLines(results.originalDocument);
    const modifiedLines = toNormalizedLines(results.modifiedDocument);

    const originalLineSet = new Set(originalLines);
    const modifiedLineSet = new Set(modifiedLines);

    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Original Document */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-muted-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Original Document
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div className="font-mono text-sm text-foreground leading-relaxed space-y-1">
                  {originalLines.map((line, idx) => {
                    const isRemoved = !modifiedLineSet.has(line) && (line.includes('[CORRUPTED:') || line.includes('[MISSING:'));
                    return (
                      <div
                        key={idx}
                        className={`py-1 px-2 rounded ${
                          isRemoved ? 'bg-red-100 dark:bg-red-900/30 line-through text-red-600' : ''
                        }`}
                      >
                        {line || '\u00A0'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modified Document */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-success flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Completed Document
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div className="font-mono text-sm text-foreground leading-relaxed space-y-1">
                  {modifiedLines.map((line, idx) => {
                    const isNew = !originalLineSet.has(line) && !line.includes('[CORRUPTED:') && !line.includes('[MISSING:');
                    const isReplaced = acceptedChanges.some(c => 
                      line.includes(c.userInputValue || c.predictedText)
                    );
                    return (
                      <div
                        key={idx}
                        className={`py-1 px-2 rounded ${
                          isNew || isReplaced ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium' : ''
                        }`}
                      >
                        {line || '\u00A0'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded"></div>
              <span className="font-semibold text-muted-foreground">Removed/Corrupted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span className="font-semibold text-muted-foreground">Added/Corrected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            {mainView === 'review' ? (
              <>
                <Sparkles className="w-6 h-6 text-accent" />
                AI Predictions
              </>
            ) : (
              <>
                <Eye className="w-6 h-6 text-green-600" />
                Document Comparison
              </>
            )}
          </h2>
          <p className="text-muted-foreground mt-1">
            {mainView === 'review' 
              ? 'Review and approve suggested clauses' 
              : 'Compare original and completed document'}
          </p>
        </div>
        <div className="flex gap-2">
          {mainView === 'review' ? (
            <>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button 
                variant="outline"
                onClick={() => setMainView('comparison')}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Show Comparison
              </Button>
              <Button onClick={() => setShowCompleteDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <CheckCheck className="w-4 h-4 mr-2" />
                Complete Analysis
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMainView('review')}>
                Back to Review
              </Button>
              <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Finish & Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {mainView === 'review' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Review Progress</span>
            <span className="font-medium">{completedItems.length}/{totalItems.length} reviewed</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Comparison View */}
      {mainView === 'comparison' && renderComparisonView()}

      {/* Summary Cards */}
      {mainView === 'review' && (
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
      )}

      {/* Corrupted Clauses - Manual Input Required */}
      {mainView === 'review' && results.corruptedClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Corrupted Clauses - Manual Verification Required
            </CardTitle>
            <CardDescription>
              These values are corrupted or unreadable. AI cannot predict them - please enter the correct values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Why no AI prediction?</strong> Corrupted data (amounts, dates, specific numbers) 
                  cannot be reliably predicted. Please verify these values from the original source.
                </p>
              </div>
            </div>

            {results.corruptedClauses.map((clause) => (
              <Card
                key={clause.id}
                className={`${
                  clause.status === 'accepted'
                    ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10'
                    : clause.status === 'rejected'
                    ? 'border-gray-300 bg-gray-50/50 dark:bg-gray-900/10 opacity-60'
                    : 'border-amber-200 dark:border-amber-800'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{clause.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{clause.section}</p>
                    </div>
                    {clause.status === 'accepted' && (
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" /> Saved
                      </Badge>
                    )}
                    {clause.status === 'rejected' && (
                      <Badge variant="outline">
                        <XCircle className="w-3 h-3 mr-1" /> Skipped
                      </Badge>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Issue:</strong> {clause.issue}
                    </p>
                  </div>

                  {/* Suggestion */}
                  <div className="bg-muted/50 p-2 rounded mb-3 text-xs text-muted-foreground">
                    💡 {clause.suggestion}
                  </div>

                  {/* Saved Value Display */}
                  {clause.status === 'accepted' && clause.userInputValue && (
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                      <p className="text-xs font-semibold text-green-600 mb-1">Your Value:</p>
                      <p className="text-lg font-bold text-foreground">{clause.userInputValue}</p>
                    </div>
                  )}

                  {/* Input Field for Manual Entry */}
                  {!clause.status && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`corrupted-${clause.id}`} className="text-sm font-medium">
                          Enter Correct Value
                        </Label>
                        <Input
                          id={`corrupted-${clause.id}`}
                          type={getInputConfig(clause.inputType).type}
                          placeholder={getInputConfig(clause.inputType).placeholder}
                          value={manualInputValues[clause.id] || ''}
                          onChange={(e) => handleManualInput('corruptedClauses', clause.id, e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveManualInput('corruptedClauses', clause.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={!manualInputValues[clause.id]}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Save Value
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkipManualInput('corruptedClauses', clause.id)}
                          className="flex-1"
                        >
                          Skip for Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reset button if already handled */}
                  {clause.status && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetClause('corruptedClauses', clause.id)}
                      className="w-full mt-2"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" /> Reset
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing Clauses - Non-Predictable (Manual Input Required) */}
      {nonPredictableMissing.length > 0 && mainView === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Missing Information - Manual Input Required
            </CardTitle>
            <CardDescription>
              These items cannot be predicted by AI. Please provide the required information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Why no AI prediction?</strong> Values like signatures, specific dates, 
                  monetary amounts require manual input to ensure accuracy and legal validity.
                </p>
              </div>
            </div>

            {nonPredictableMissing.map((clause) => (
              <Card
                key={clause.id}
                className={`${
                  clause.status === 'accepted'
                    ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10'
                    : clause.status === 'rejected'
                    ? 'border-gray-300 bg-gray-50/50 dark:bg-gray-900/10 opacity-60'
                    : 'border-amber-200 dark:border-amber-800'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{clause.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{clause.expectedLocation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        clause.severity === 'high' ? 'destructive' :
                        clause.severity === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {clause.severity}
                      </Badge>
                      {clause.status === 'accepted' && (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" /> Saved
                        </Badge>
                      )}
                      {clause.status === 'rejected' && (
                        <Badge variant="outline">Skipped</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{clause.description}</p>

                  <div className="bg-muted/50 p-2 rounded mb-3 text-xs text-muted-foreground">
                    💡 {clause.suggestion}
                  </div>

                  {clause.status === 'accepted' && clause.userInputValue && (
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                      <p className="text-xs font-semibold text-green-600 mb-1">Your Value:</p>
                      <p className="text-lg font-bold text-foreground">{clause.userInputValue}</p>
                    </div>
                  )}

                  {!clause.status && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`missing-${clause.id}`} className="text-sm font-medium">
                          {clause.inputType === 'signature' ? 'Your Signature' : 'Enter Value'}
                        </Label>
                        {clause.inputType === 'signature' ? (
                          <Textarea
                            id={`missing-${clause.id}`}
                            placeholder={clause.placeholderText || 'Type your signature or leave for manual signing'}
                            value={manualInputValues[clause.id] || ''}
                            onChange={(e) => handleManualInput('missingClauses', clause.id, e.target.value)}
                            rows={2}
                            className="font-cursive text-lg"
                          />
                        ) : (
                          <Input
                            id={`missing-${clause.id}`}
                            type={getInputConfig(clause.inputType).type}
                            placeholder={getInputConfig(clause.inputType).placeholder}
                            value={manualInputValues[clause.id] || ''}
                            onChange={(e) => handleManualInput('missingClauses', clause.id, e.target.value)}
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveManualInput('missingClauses', clause.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={!manualInputValues[clause.id]}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkipManualInput('missingClauses', clause.id)}
                          className="flex-1"
                        >
                          Skip for Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {clause.status && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetClause('missingClauses', clause.id)}
                      className="w-full mt-2"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" /> Reset
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing Clauses - Predictable (AI-Generated) */}
      {predictableMissing.length > 0 && mainView === 'review' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Missing Clauses - AI Predictions
                </CardTitle>
                <CardDescription>
                  Review {predictableMissing.length} AI-generated clause{predictableMissing.length > 1 ? 's' : ''} • {predictableMissing.filter(c => !c.status).length} pending
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'wizard' ? 'default' : 'outline'}
                  onClick={() => setViewMode('wizard')}
                >
                  Step-by-Step
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  View All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'wizard' ? (
              // Wizard Mode - One clause at a time
              <div className="space-y-4">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Clause {currentClauseIndex + 1} of {predictableMissing.length}
                  </p>
                  <div className="flex gap-1">
                    {predictableMissing.map((c, idx) => (
                      <div
                        key={c.id}
                        className={`w-8 h-1.5 rounded-full transition-colors ${
                          idx === currentClauseIndex
                            ? 'bg-accent'
                            : c.status === 'accepted'
                            ? 'bg-success'
                            : c.status === 'rejected'
                            ? 'bg-destructive'
                            : c.status === 'edited'
                            ? 'bg-accent/50'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Current Clause */}
                {(() => {
                  const clause = results.missingClauses[currentClauseIndex];
                  if (!clause) return null;

                  return (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{clause.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getSeverityBadge(clause.severity)}>
                              {clause.severity.toUpperCase()} PRIORITY
                            </Badge>
                            {clause.jurisdiction && (
                              <Badge variant="outline">{clause.jurisdiction}</Badge>
                            )}
                            {clause.status && (
                              <Badge
                                variant={
                                  clause.status === 'accepted'
                                    ? 'default'
                                    : clause.status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className={clause.status === 'accepted' ? 'bg-success text-success-foreground' : ''}
                              >
                                {clause.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {clause.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                {clause.status === 'edited' && <Edit3 className="w-3 h-3 mr-1" />}
                                {clause.status.charAt(0).toUpperCase() + clause.status.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {clause.status && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetClause('missingClauses', clause.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" /> Reset
                          </Button>
                        )}
                      </div>

                      {/* Tabbed Content */}
                      <Tabs defaultValue="prediction" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="prediction">Prediction</TabsTrigger>
                          <TabsTrigger value="alternatives">
                            Alternatives {clause.alternatives?.length ? `(${clause.alternatives.length})` : ''}
                          </TabsTrigger>
                          <TabsTrigger value="details">Details</TabsTrigger>
                        </TabsList>

                        <TabsContent value="prediction" className="space-y-4 mt-4">
                          {editingClause?.clause.id === clause.id ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Edit Clause Text</label>
                                <Textarea
                                  value={editedText}
                                  onChange={(e) => setEditedText(e.target.value)}
                                  rows={6}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Select value={style} onValueChange={(v) => setStyle(v as 'formal' | 'plain')}>
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="formal">Formal</SelectItem>
                                    <SelectItem value="plain">Plain English</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditedText((t) => applyStyle(t, style))}
                                >
                                  Apply Style
                                </Button>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button onClick={handleSaveEdit} className="bg-success hover:bg-success/90">
                                  <Check className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                                <Button variant="outline" onClick={handleCancelEdit}>
                                  <X className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-card border-2 border-accent/20 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                                    {clause.status === 'edited' ? 'Your Edited Version' : 'AI Generated Clause'}
                                  </p>
                                  {typeof clause.confidence === 'number' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Confidence</span>
                                      <Badge variant="outline" className="font-mono">
                                        {Math.round(clause.confidence * 100)}%
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                  {clause.predictedText}
                                </p>
                                {clause.status === 'edited' && clause.originalText && (
                                  <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Original Prediction:</p>
                                    <p className="text-xs text-muted-foreground/60 line-through">{clause.originalText}</p>
                                  </div>
                                )}
                              </div>

                              {!clause.status && (
                                <>
                                  <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r-lg">
                                    <div className="flex items-start gap-2">
                                      <Lightbulb className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs font-semibold text-accent mb-1">Why this clause?</p>
                                        <p className="text-sm text-foreground">{clause.suggestion}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleAcceptClause('missingClauses', clause.id)}
                                      className="flex-1 bg-success hover:bg-success/90"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" /> Accept
                                    </Button>
                                    <Button
                                      variant="default"
                                      onClick={() => handleEditClause('missingClauses', clause)}
                                      className="flex-1"
                                    >
                                      <Edit3 className="w-4 h-4 mr-2" /> Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleRejectClause('missingClauses', clause.id)}
                                      className="flex-1"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="alternatives" className="space-y-3 mt-4">
                          {clause.alternatives && clause.alternatives.length > 0 ? (
                            clause.alternatives.map((alt, idx) => (
                              <Card key={idx}>
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline">Option {idx + 1}</Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => navigator.clipboard.writeText(alt)}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-foreground leading-relaxed mb-3">{alt}</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      setEditingClause({ type: 'missingClauses', clause });
                                      setEditedText(alt);
                                    }}
                                  >
                                    Use This Version
                                  </Button>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No alternative versions available
                            </p>
                          )}
                        </TabsContent>

                        <TabsContent value="details" className="space-y-3 mt-4">
                          <div className="space-y-3">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Description</p>
                              <p className="text-sm text-foreground">{clause.description}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Expected Location</p>
                              <p className="text-sm text-foreground">{clause.expectedLocation}</p>
                            </div>
                            {clause.rationale && (
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Info className="w-4 h-4 text-accent mt-0.5" />
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">AI Rationale</p>
                                    <p className="text-sm text-foreground">{clause.rationale}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>

                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentClauseIndex(Math.max(0, currentClauseIndex - 1))}
                          disabled={currentClauseIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          {results.missingClauses.filter(c => c.status === 'accepted').length} accepted •{' '}
                          {results.missingClauses.filter(c => c.status === 'rejected').length} rejected •{' '}
                          {results.missingClauses.filter(c => c.status === 'edited').length} edited
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setCurrentClauseIndex(Math.min(results.missingClauses.length - 1, currentClauseIndex + 1))
                          }
                          disabled={currentClauseIndex === results.missingClauses.length - 1}
                        >
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // List Mode - All clauses
              <div className="space-y-3">
                <div className="flex justify-end gap-2 mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcceptAll('missingClauses')}
                    className="text-success"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" /> Accept All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetAll('missingClauses')}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset All
                  </Button>
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {results.missingClauses.map((clause, idx) => (
                    <AccordionItem key={clause.id} value={`clause-${clause.id}`} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                            <p className="font-semibold text-foreground">{clause.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityBadge(clause.severity)} className="text-xs">
                              {clause.severity}
                            </Badge>
                            {clause.status && (
                              <Badge
                                variant={clause.status === 'accepted' ? 'default' : clause.status === 'rejected' ? 'destructive' : 'secondary'}
                                className={clause.status === 'accepted' ? 'bg-success' : ''}
                              >
                                {clause.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          <div className="bg-muted/50 p-3 rounded">
                            <p className="text-sm text-foreground">{clause.predictedText}</p>
                          </div>
                          {!clause.status && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleAcceptClause('missingClauses', clause.id);
                                  setCurrentClauseIndex(idx);
                                }}
                                className="flex-1 bg-success hover:bg-success/90"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentClauseIndex(idx);
                                  setViewMode('wizard');
                                }}
                                className="flex-1"
                              >
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClause('missingClauses', clause.id)}
                                className="flex-1"
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                          {clause.status && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetClause('missingClauses', clause.id)}
                              className="w-full"
                            >
                              <RotateCcw className="w-3 h-3 mr-2" /> Reset
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Analysis Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-600" />
              Complete Analysis
            </DialogTitle>
            <DialogDescription>
              Your clause analysis is complete. Choose your next action:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleDownloadReport} 
              className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Download className="w-5 h-5 mr-3" />
              Download Report
            </Button>
            <Button 
              onClick={handleSaveToDatabase} 
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              size="lg"
              disabled={isSavedToDb}
            >
              <Database className="w-5 h-5 mr-3" />
              {isSavedToDb ? 'Saved to Database ✓' : 'Save to Database'}
            </Button>
            <Button 
              onClick={handleBackToDashboard} 
              className="w-full justify-start"
              variant="outline"
              size="lg"
            >
              <Home className="w-5 h-5 mr-3" />
              Back to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText, ZoomIn, ZoomOut, Download, AlertTriangle, Eye, XCircle, Edit3, Check, X, Lightbulb, Info, List, Sparkles, Brain, RefreshCw, ChevronDown, ChevronUp, Home, Database, CheckCheck, HelpCircle, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supremeCourtMissingClauses } from './mock-clauses-data';
import api from '@/config/api';
import { predictClauses, getPredictionConfig, acceptSuggestion, saveTextFile, saveToDatabase, type PredictionResult, type PredictionSuggestion, type PredictionConfig } from '@/config/api';

interface ClauseWorkspaceProps {
  file: File;
  onComplete: (results: AnalysisResults) => void;
  onCancel: () => void;
  // Optional original document text provided by backend preview
  originalDocument?: string;
}

interface AnalysisResults {
  totalClauses: number;
  validClauses: number;
  presentClauses: number; // New: clauses that are present and valid
  missingClauses: MissingClause[];
  corruptedClauses: CorruptedClause[];
  originalDocument?: string;
  modifiedDocument?: string;
  filename?: string; // The finalized filename for database storage
  statistics?: {
    total_clauses: number;
    present: number;
    missing: number;
    corrupted: number;
    completion_percentage: number;
  };
}

interface MissingClause {
  id: number;
  name: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  expectedLocation: string;
  suggestion: string;
  predictedText: string;
  confidence?: number; // 0-1
  rationale?: string;
  alternatives?: string[];
  jurisdiction?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
  // NEW: Distinguish predictable vs non-predictable missing clauses
  isPredictable: boolean; // true = AI can suggest, false = user must input (signatures, dates, amounts)
  placeholderText?: string; // For non-predictable: hint text like "[Enter signature here]"
  inputType?: 'text' | 'date' | 'currency' | 'signature' | 'number'; // For non-predictable clauses
  userInputValue?: string; // Store user's manual input for non-predictable items
}

interface CorruptedClause {
  id: number;
  name: string;
  issue: string;
  section: string;
  suggestion: string;
  predictedText: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'edited';
  // NEW: Corrupted clauses should NOT be auto-predicted - user must verify/input
  isPredictable: false; // Always false for corrupted clauses
  requiresManualInput: boolean; // true = user must input, false = just needs verification
  inputType?: 'text' | 'date' | 'currency' | 'number'; // Type of input expected
  userInputValue?: string; // Store user's manual input
}

interface ProcessStep {
  id: number;
  name: string;
  status: 'pending' | 'processing' | 'complete';
  icon: string;
}

export function ClauseWorkspace({ file, onComplete, onCancel, originalDocument }: ClauseWorkspaceProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  const defaultDocumentText = `IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA

In the matter of an application for Leave to Appeal under and in terms of Section 5C (1) of the High Court of the Provinces (Special Provisions) Act No.19 of 1990 as amended by Act, No. 54 of 2006

Believers Church
No. 54, Jayasooriya Mawatha,
Kandana.

S.C. Case No: [CORRUPTED: SC/###/LA 184/2023]
CP/HCCA/KANDY/67/2021(LA)
D.C. Nawalapitiya Case No. 80/16/SPL

Plaintiff

Vs.

Rev. Father Paneer Selvam
(Now Deceased)
Believers Church
No. 26, Dekinda Road,
Nawalapitiya.

Defendant

Paneer Selvam Jenita Enriya
No. 5B, Dekinda Road, Bawwagama,
Nawalapitiya.

Substituted Defendant

THEN BETWEEN

Believers Church
No. 54, Jayasooriya Mawatha,
Kandana.

Plaintiff – Petitioner

And

Paneer Selvam Jenita Enriya
No. 5B, Dekinda Road, Bawwagama,
Nawalapitiya.

Substituted Defendant – Respondent

NOW BETWEEN

Believers Church
No. 54, Jayasooriya Mawatha,
Kandana.

Plaintiff – Petitioner – Petitioner

Vs.

Paneer Selvam Jenita Enriya
No. 5B, Dekinda Road, Bawwagama,
Nawalapitiya.

Substituted Defendant -Respondent-Respondent

AND NOW BETWEEN

Believers Church
No. 54, Jayasooriya Mawatha,
Kandana.

Plaintiff – Petitioner – Petitioner – Petitioner

Vs.

Paneer Selvam Jenita Enriya
No. 5B, Dekinda Road, Bawwagama,
Nawalapitiya

Substituted Defendant – Respondent – Respondent – Respondent

Before: Hon. Vijith K. Malalgoda, PC, J.
Hon. A. L. Shiran Gooneratne, J.
Hon. Janak De Silva, J.

Counsel:
C. Sooriyaarachchi with G.C. Gunawardhena for the Plaintiff – Petitioner – Petitioner – Petitioner
Ishan Alawathurage for the Substituted Defendant – Respondent – Respondent – Respondent

Argued on: [MISSING: Argument Date - Enter date]
Decided on: [MISSING: Decision Date - Enter date]

[MISSING: Judge's Opening Statement - Required introduction]

Janak De Silva, J.

This is an application for leave to appeal from the judgment of the Civil Appellate High Court of the Central Province (Holden in Kandy) dated [CORRUPTED: ##.03.2023] by which leave to appeal against the order of the learned District Judge of Nawalapitiya dated 16.12.2021 was dismissed.

The Plaintiff-Petitioner-Petitioner-Petitioner instituted action against the Defendant-Respondent-Respondent-Respondent seeking a declaration of title to the land more fully described in the schedule to the plaint, and an order of eviction against the Respondent and all persons claiming under him.

[MISSING: Procedural History Clause - Details of previous hearings]

The Petitioner as well as his registered Attorney-at-Law were absent when the matter was taken up for further trial on 24.09.2020. Hence, the action was dismissed.

The Petitioner made an application in terms of Section 87(3) of the Civil Procedure Code to have the dismissal set aside. After inquiry, the learned District Judge refused to set aside the judgment entered upon the default of the Petitioner.

Aggrieved by the said order of the learned District Judge, the Petitioner filed a leave to appeal application in the Civil Appellate High Court. The Respondent raised a preliminary objection that the application was misconceived in law and that the Petitioner should have come by way of final appeal. This was upheld by the Civil Appellate High Court and the Petitioner has filed this leave to appeal application against the said judgment.

[MISSING: Legal Framework Section - Statutory provisions overview]

The question that arises for determination is whether a party aggrieved by a default judgment must come by way of appeal or leave to appeal.

Section 88(2) of the Civil Procedure Code reads as follows:
"The order setting aside or refusing to set aside the judgment entered upon default shall be accompanied by a judgment adjudicating upon the facts and specifying the grounds upon which it is made, and shall be liable to an appeal to the Court of Appeal."

This provision was examined by a fuller bench of this Court in Barbara Iranganie De Silva v. Hewa Waduge Indralatha [(2017) BALR 68] and it was held that the application approach test have no application to an application made pursuant to Section 88(2) of the Civil Procedure Code.

I am in respectful agreement with the decision in Barbara Iranganie De Silva v. Hewa Waduge Indralatha. Hence, the leave to appeal application made by the Petitioner is misconceived in law. The Civil Appellate High Court was correct in dismissing the application on the preliminary objection raised by the Respondent. Accordingly, leave to appeal must be refused in this application.

Before parting, I must make reference to the fact that the learned Counsel for the Respondent assisted Court by drawing our attention to the amendment made to Section 88(2) of the Civil Procedure Code by Act No. 5 of 2022.

For all the foregoing reasons, I hold that leave to appeal must be refused. Application is dismissed. Parties shall bear their costs.

Judge: [MISSING: Judge Signature - Signature required]
Date: [MISSING: Signature Date - Enter date]

Vijith K. Malalgoda, P.C., J.
I agree.

Judge: [MISSING: Second Judge Signature - Signature required]

A. L. Shiran Gooneratne, J.
I agree.

Judge: [MISSING: Third Judge Signature - Signature required]
  `;

  // Use provided `originalDocument` if available, otherwise fall back to sample
  const [documentText, setDocumentText] = useState<string>(originalDocument ?? defaultDocumentText);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedIssue, setSelectedIssue] = useState<{ type: string; data: any } | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [corruptedMatches, setCorruptedMatches] = useState<string[]>([]);
  const [corruptedRegions, setCorruptedRegions] = useState<Array<{clause_name: string, text: string, start: number, end: number}>>([]);
  const [editingClauseId, setEditingClauseId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [modifiedDocumentText, setModifiedDocumentText] = useState(documentText);
  const [savedTextFilename, setSavedTextFilename] = useState<string | null>(null);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'comparison'>('review');
  const [manualInputValues, setManualInputValues] = useState<Record<number, string>>({});
  const [showClauseDetailsDialog, setShowClauseDetailsDialog] = useState(false);

  // ─── AI Prediction State ─────────────────────────────────────────
  const [predictionConfig, setPredictionConfig] = useState<PredictionConfig | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [suggestionStatuses, setSuggestionStatuses] = useState<Record<string, 'pending' | 'accepted' | 'edited' | 'rejected'>>({});
  const [editingSuggestionKey, setEditingSuggestionKey] = useState<string | null>(null);
  const [editedSuggestionText, setEditedSuggestionText] = useState('');
  const [showPredictionsPanel, setShowPredictionsPanel] = useState(true);

  const steps: ProcessStep[] = [
    { id: 1, name: 'Extracting text', status: 'pending', icon: '📄' },
    { id: 2, name: 'Identifying clauses', status: 'pending', icon: '🔍' },
    { id: 3, name: 'Validating structure', status: 'pending', icon: '✓' },
    { id: 4, name: 'Checking completeness', status: 'pending', icon: '📋' },
    { id: 5, name: 'AI is Generating Suggestions...', status: 'pending', icon: '🧠' }
  ];

  const [processSteps, setProcessSteps] = useState(steps);

  // Helper function to strip formatting markers for display
  const stripFormattingMarkers = (text: string): string => {
    // Remove format markers like <<F:size=14,bold=1>>...<</F>>
    return text
      .replace(/<<F:[^>]+>>/g, '')
      .replace(/<<\/F>>/g, '')
      // Also remove old-style bold markers for backward compatibility
      .replace(/<<BOLD>>/g, '')
      .replace(/<<\/BOLD>>/g, '');
  };

  const updateStepStatus = (stepId: number, status: 'pending' | 'processing' | 'complete') => {
    setProcessSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  };
  // store active timeouts so we can clear them on new analysis/run
  const timeoutsRef = (globalThis as any).__clause_timeouts__ || { ids: [] };
  (globalThis as any).__clause_timeouts__ = timeoutsRef;
  const clearScheduledTimeouts = () => {
    try {
      timeoutsRef.ids.forEach((id: number) => clearTimeout(id));
    } catch {}
    timeoutsRef.ids = [];
  };

  const resetProcessSteps = () => {
    setProcessSteps(steps.map(s => ({ ...s, status: 'pending' })));
  };

  const mockResults: AnalysisResults = {
    totalClauses: 18,
    validClauses: 13,
    presentClauses: 13,
    missingClauses: supremeCourtMissingClauses as any,
    corruptedClauses: [
      {
        id: 1,
        name: 'Case Number',
        issue: 'Part of the Supreme Court case number is corrupted (SC/###/LA)',
        section: 'S.C. Case No:',
        suggestion: 'Verify the complete SC case number from court records. The corrupted text shows: SC/###/LA 184/2023',
        predictedText: 'SC/HCCA/LA 184/2023',
        isPredictable: false,
        requiresManualInput: true,
        inputType: 'text',
        userInputValue: ''
      },
      {
        id: 2,
        name: 'Civil Appellate High Court Date',
        issue: 'Day portion of the date is corrupted (##.03.2023)',
        section: 'Civil Appellate High Court',
        suggestion: 'The date appears to be in March 2023 - verify the exact day. The corrupted text shows: ##.03.2023',
        predictedText: '17.03.2023',
        isPredictable: false,
        requiresManualInput: true,
        inputType: 'text',
        userInputValue: ''
      }
    ]
  };

  // Analysis will run only when the user explicitly starts it via the UI

  const startAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisComplete(false);
    setProgress(5);
    // reset UI step state and clear previous timers
    clearScheduledTimeouts();
    resetProcessSteps();
    setAnalysisRunning(true);

    try {
      // mark extracting text as started
      updateStepStatus(1, 'processing');
      setProgress(8);

      const resp = await api.analyzeClauses(file, (p: number) => setProgress(Math.max(8, Math.round(p * 0.9))));
      // Expect backend response shape: { success, full_text, clause_analysis }
      if (resp && resp.success) {
        // Extraction finished
        updateStepStatus(1, 'complete');
        // Begin clause identification
        updateStepStatus(2, 'processing');
        setProgress(60);
        const analysis = resp.clause_analysis || {};
        const stats = analysis.statistics || {};

        // Map backend clause list into UI's expected missing/corrupted arrays
        const clauses = Array.isArray(analysis.clauses) ? analysis.clauses : [];
        const missingClauses = clauses
          .map((c: any, idx: number) => ({
            id: idx + 1,
            name: c.clause_name,
            severity: 'medium',
            description: c.content || '',
            expectedLocation: '',
            suggestion: c.llm_suggestion || '',
            predictedText: c.content || '',
            confidence: c.confidence || undefined,
            rationale: undefined,
            alternatives: [],
            jurisdiction: undefined,
            status: c.status === 'Missing' ? undefined : c.status === 'Present' ? 'accepted' : undefined,
            isPredictable: true
          }))
          .filter((c: any) => !c.status || c.status !== 'accepted');

        const corruptedClauses = clauses
          .map((c: any, idx: number) => ({
            id: idx + 1,
            name: c.clause_name,
            issue: c.status === 'Corrupt' ? 'Detected as corrupt' : '',
            section: c.clause_name,
            suggestion: c.llm_suggestion || '',
            predictedText: c.content || '',
            status: c.status === 'Corrupt' ? undefined : 'accepted',
            isPredictable: false,
            requiresManualInput: c.status === 'Corrupt'
          }))
          .filter((c: any) => c.requiresManualInput);

        const mappedResults = {
          totalClauses: stats.total_clauses || clauses.length,
          validClauses: stats.present || 0,
          presentClauses: stats.present || 0,
          missingClauses,
          corruptedClauses,
          originalDocument: resp.full_text || documentText,
          modifiedDocument: resp.full_text || documentText,
          statistics: stats,
          __raw_response__: resp // Store raw response for detailed clause access
        };

        // Save the server-side saved text filename (if provided) so edits can be persisted
        const savedPath = resp.saved_text_path || resp.full_text_path || resp.full_text_path || '';
        const filenameOnly = typeof savedPath === 'string' && savedPath ? savedPath.split(/[/\\]/).pop() : null;
        if (filenameOnly) setSavedTextFilename(filenameOnly);

        setDocumentText(resp.full_text || documentText);
        setModifiedDocumentText(resp.full_text || documentText);
        setResults(mappedResults as any);
        
        // Set corrupted regions from backend for highlighting
        if (resp && resp.clause_analysis && Array.isArray(resp.clause_analysis.corrupted_regions)) {
          setCorruptedRegions(resp.clause_analysis.corrupted_regions);
        } else {
          setCorruptedRegions([]);
        }
        
        // set corrupted matches from backend if provided (legacy support)
        if (resp && Array.isArray(resp.corruptions)) {
          setCorruptedMatches(resp.corruptions.map((c: any) => c.match));
        } else {
          setCorruptedMatches([]);
        }

        // Stage the remaining steps over ~10 seconds so the progress animation looks smooth
        // timings: ~2.5s, ~5s, ~7.5s, ~10s from now
        // schedule staged updates and keep references
        timeoutsRef.ids.push(setTimeout(() => {
          updateStepStatus(2, 'complete');
          updateStepStatus(3, 'processing');
          setProgress(70);
        }, 2500) as unknown as number);
        timeoutsRef.ids.push(setTimeout(() => {
          updateStepStatus(3, 'complete');
          updateStepStatus(4, 'processing');
          setProgress(85);
        }, 5000) as unknown as number);
        timeoutsRef.ids.push(setTimeout(() => {
          updateStepStatus(4, 'complete');
          updateStepStatus(5, 'processing');
          setProgress(95);
          // Don't set analyzing to false yet - let predictions complete step 5
          setAnalysisRunning(false);
          setAnalysisComplete(true);
          // clear timeout refs since analysis steps are done
          timeoutsRef.ids = [];

          // Auto-mode: if predictions came with the response, load them
          if (resp.predictions && resp.prediction_mode === 'auto') {
            setPredictions(resp.predictions);
            // init statuses
            const statuses: Record<string, 'pending'> = {};
            if (resp.predictions.suggestions) {
              Object.keys(resp.predictions.suggestions).forEach(k => { statuses[k] = 'pending'; });
            }
            setSuggestionStatuses(statuses);
            setShowPredictionsPanel(true);
            // Complete step 5 and analyzing immediately since predictions are already loaded
            updateStepStatus(5, 'complete');
            setProgress(100);
            setAnalyzing(false);
          }
        }, 7500) as unknown as number);
      } else {
        console.error('analyzeClauses failed', resp);
      }
    } catch (err) {
      console.error('Analysis error', err);
      clearScheduledTimeouts();
      setAnalysisRunning(false);
      setAnalyzing(false);
    }
  };

  // ─── Fetch prediction config on mount ────────────────────────────────────
  useEffect(() => {
    getPredictionConfig()
      .then(cfg => setPredictionConfig(cfg))
      .catch(err => console.warn('Failed to fetch prediction config:', err));
  }, []);

  // ─── Auto-fetch predictions when analysis completes ──────────────────────
  useEffect(() => {
    if (analysisComplete && !predictions && savedTextFilename && !predictionsLoading) {
      // Automatically fetch AI suggestions when analysis completes
      updateStepStatus(5, 'processing');
      handleGetAISuggestions(false);
    }
  }, [analysisComplete, predictions, savedTextFilename]);

  // ─── AI Prediction Handlers ──────────────────────────────────────────────
  const handleGetAISuggestions = async (forceRefresh: boolean = false) => {
    if (!savedTextFilename) {
      setPredictionsError('No saved text file available. Please run analysis first.');
      return;
    }
    setPredictionsLoading(true);
    setPredictionsError(null);
    try {
      const result = await predictClauses(savedTextFilename, forceRefresh);
      setPredictions(result);
      // Initialize statuses
      const statuses: Record<string, 'pending'> = {};
      if (result.suggestions) {
        Object.keys(result.suggestions).forEach(k => { statuses[k] = 'pending'; });
      }
      setSuggestionStatuses(statuses);
      setShowPredictionsPanel(true);
      // Complete step 5 when predictions are loaded
      updateStepStatus(5, 'complete');
      setProgress(100);
      setAnalyzing(false);
    } catch (err: any) {
      console.error('Prediction error:', err);
      setPredictionsError(err.message || 'Failed to get AI suggestions');
      // Still complete step 5 on error to avoid infinite loading
      updateStepStatus(5, 'complete');
      setAnalyzing(false);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleAcceptSuggestion = async (clauseKey: string) => {
    const suggestion = predictions?.suggestions?.[clauseKey];
    if (!suggestion || !savedTextFilename) return;

    try {
      // Save the decision to backend
      await acceptSuggestion({
        filename: savedTextFilename,
        clause_key: clauseKey,
        suggestion_text: suggestion.suggestion,
        status: 'accepted',
        confidence: suggestion.confidence,
      });
      
      // NEW: Use position-based insertion from OpenAI
      const formattedText = formatClauseForInsertion(clauseKey, suggestion.clause_name, suggestion.suggestion);
      const insertPosition = findInsertionPositionFromAnchor(
        modifiedDocumentText, 
        suggestion.anchor_text || '', 
        suggestion.insertion_position || 'end'
      );
      const updatedDoc = modifiedDocumentText.substring(0, insertPosition) + formattedText + modifiedDocumentText.substring(insertPosition);
      setModifiedDocumentText(updatedDoc);
      
      // IMPORTANT: Save the modified text back to backend so it's in sync
      await saveTextFile(savedTextFilename, updatedDoc);
      
      // Update local state
      setSuggestionStatuses(prev => ({ ...prev, [clauseKey]: 'accepted' }));
    } catch (err: any) {
      console.error('Error accepting suggestion:', err);
      alert('Failed to accept suggestion: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRejectSuggestion = async (clauseKey: string) => {
    const suggestion = predictions?.suggestions?.[clauseKey];
    if (!suggestion || !savedTextFilename) return;

    try {
      // Save the decision to backend
      await acceptSuggestion({
        filename: savedTextFilename,
        clause_key: clauseKey,
        suggestion_text: suggestion.suggestion,
        status: 'rejected',
        confidence: suggestion.confidence,
      });
      
      // Update local state
      setSuggestionStatuses(prev => ({ ...prev, [clauseKey]: 'rejected' }));
    } catch (err: any) {
      console.error('Error rejecting suggestion:', err);
      alert('Failed to reject suggestion: ' + (err.message || 'Unknown error'));
    }
  };

  const handleEditSuggestion = (clauseKey: string) => {
    const suggestion = predictions?.suggestions?.[clauseKey];
    if (suggestion) {
      setEditingSuggestionKey(clauseKey);
      setEditedSuggestionText(suggestion.suggestion);
    }
  };

  const handleSaveSuggestionEdit = async (clauseKey: string) => {
    const suggestion = predictions?.suggestions?.[clauseKey];
    if (!suggestion || !savedTextFilename) return;

    try {
      // Save the edited version to backend
      await acceptSuggestion({
        filename: savedTextFilename,
        clause_key: clauseKey,
        suggestion_text: suggestion.suggestion,
        status: 'edited',
        confidence: suggestion.confidence,
        edited_text: editedSuggestionText,
      });

      // NEW: Use position-based insertion from OpenAI
      const formattedText = formatClauseForInsertion(clauseKey, suggestion.clause_name, editedSuggestionText);
      const insertPosition = findInsertionPositionFromAnchor(
        modifiedDocumentText, 
        suggestion.anchor_text || '', 
        suggestion.insertion_position || 'end'
      );
      const updatedDoc = modifiedDocumentText.substring(0, insertPosition) + formattedText + modifiedDocumentText.substring(insertPosition);
      setModifiedDocumentText(updatedDoc);

      // IMPORTANT: Save the modified text back to backend so it's in sync
      await saveTextFile(savedTextFilename, updatedDoc);

      // Update the suggestion text in predictions
      setPredictions(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          suggestions: {
            ...prev.suggestions,
            [clauseKey]: {
              ...prev.suggestions[clauseKey],
              suggestion: editedSuggestionText,
            }
          }
        };
      });
      setSuggestionStatuses(prev => ({ ...prev, [clauseKey]: 'edited' }));
      setEditingSuggestionKey(null);
      setEditedSuggestionText('');
    } catch (err: any) {
      console.error('Error saving edited suggestion:', err);
      alert('Failed to save edited suggestion: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCancelSuggestionEdit = () => {
    setEditingSuggestionKey(null);
    setEditedSuggestionText('');
  };

  const getPredictionStats = () => {
    const total = Object.keys(suggestionStatuses).length;
    const accepted = Object.values(suggestionStatuses).filter(s => s === 'accepted').length;
    const rejected = Object.values(suggestionStatuses).filter(s => s === 'rejected').length;
    const edited = Object.values(suggestionStatuses).filter(s => s === 'edited').length;
    const pending = Object.values(suggestionStatuses).filter(s => s === 'pending').length;
    return { total, accepted, rejected, edited, pending };
  };

  // Helper function to wrap text after 10-11 words per line
  const wrapTextForInsertion = (text: string, wordsPerLine: number = 10): string => {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerLine) {
      const lineWords = words.slice(i, i + wordsPerLine);
      lines.push(lineWords.join(' '));
    }
    
    return lines.join('\n');
  };

  // Helper function to format clause text for insertion
  const formatClauseForInsertion = (clauseKey: string, clauseName: string, text: string): string => {
    // Wrap the text to multiple lines (10-11 words per line)
    const wrappedText = wrapTextForInsertion(text, 10);
    
    // Insert with proper spacing, NO labels or headings
    return `\n\n${wrappedText}\n\n`;
  };

  // NEW: Helper function to find insertion position based on anchor text from OpenAI
  const findInsertionPositionFromAnchor = (
    documentText: string, 
    anchorText: string, 
    position: "before" | "after" | "end"
  ): number => {
    console.log('🔍 findInsertionPositionFromAnchor called');
    console.log('  - Anchor text:', anchorText?.substring(0, 100));
    console.log('  - Position:', position);
    console.log('  - Document length:', documentText.length);
    
    // If no anchor text provided, use fallback position
    if (!anchorText || anchorText.trim().length === 0) {
      console.warn('⚠️ No anchor text provided, using fallback');
      if (position === "end") {
        return documentText.length;
      }
      return 0;
    }

    // Strip formatting markers from document (same as backend does)
    const stripFormatting = (text: string) => {
      return text
        .replace(/<<F:[^>]+>>/g, '')
        .replace(/<<\/F>>/g, '')
        .replace(/<<BOLD>>/g, '')
        .replace(/<<\/BOLD>>/g, '');
    };

    const cleanDoc = stripFormatting(documentText);

    // Try multiple search strategies
    
    // Strategy 1: Exact match (case-sensitive) on clean doc
    let anchorIndex = cleanDoc.indexOf(anchorText);
    if (anchorIndex !== -1) {
      console.log('✅ Found EXACT match at position:', anchorIndex);
      // Map back to original doc position (account for stripped markers)
      return position === "before" ? 
        findOriginalPosition(documentText, cleanDoc, anchorIndex) : 
        findOriginalPosition(documentText, cleanDoc, anchorIndex + anchorText.length);
    }

    // Strategy 2: Case-insensitive match
    const lowerDoc = cleanDoc.toLowerCase();
    const lowerAnchor = anchorText.toLowerCase();
    anchorIndex = lowerDoc.indexOf(lowerAnchor);
    if (anchorIndex !== -1) {
      console.log('✅ Found case-insensitive match at position:', anchorIndex);
      return position === "before" ? 
        findOriginalPosition(documentText, cleanDoc, anchorIndex) : 
        findOriginalPosition(documentText, cleanDoc, anchorIndex + anchorText.length);
    }

    // Strategy 3: Trimmed and normalized whitespace match
    const normalizeWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();
    const normalizedDoc = normalizeWhitespace(cleanDoc);
    const normalizedAnchor = normalizeWhitespace(anchorText);
    
    const normalizedIndex = normalizeWhitespace(cleanDoc.toLowerCase()).indexOf(normalizedAnchor.toLowerCase());
    if (normalizedIndex !== -1) {
      console.log('✅ Found normalized match at approximate position:', normalizedIndex);
      // Approximate position
      return position === "before" ? normalizedIndex : normalizedIndex + normalizedAnchor.length;
    }

    // Strategy 4: Partial match - first 30 characters
    if (anchorText.length > 30) {
      const partialAnchor = anchorText.substring(0, 30);
      anchorIndex = lowerDoc.indexOf(partialAnchor.toLowerCase());
      if (anchorIndex !== -1) {
        console.warn('⚠️ Found PARTIAL match (first 30 chars) at position:', anchorIndex);
        return position === "before" ? 
          findOriginalPosition(documentText, cleanDoc, anchorIndex) : 
          findOriginalPosition(documentText, cleanDoc, anchorIndex + partialAnchor.length);
      }
    }

    // Strategy 5: Search for key words from anchor
    const words = anchorText.split(/\s+/).filter(w => w.length > 4);
    if (words.length >= 3) {
      const firstThreeWords = words.slice(0, 3).join('.*');
      const regex = new RegExp(firstThreeWords, 'i');
      const match = cleanDoc.match(regex);
      if (match && match.index !== undefined) {
        console.warn('⚠️ Found keyword match at position:', match.index);
        return position === "before" ? 
          findOriginalPosition(documentText, cleanDoc, match.index) : 
          findOriginalPosition(documentText, cleanDoc, match.index + match[0].length);
      }
    }
    
    // All strategies failed - use intelligent fallback
    console.error('❌ Anchor text not found in document with any strategy!');
    console.error('   Searched for:', anchorText.substring(0, 100));
    console.error('   Falling back based on position hint...');
    
    // Smart fallback based on position hint
    if (position === "end" || position === "after") {
      console.error('   → Using END of document');
      return documentText.length;
    } else {
      console.error('   → Using START of document');
      return 0;
    }
  };

  // Helper to map clean doc position back to original doc position (with formatting markers)
  const findOriginalPosition = (originalDoc: string, cleanDoc: string, cleanPos: number): number => {
    let originalPos = 0;
    let cleanIndex = 0;
    
    while (cleanIndex < cleanPos && originalPos < originalDoc.length) {
      // Skip formatting markers in original
      if (originalDoc.substring(originalPos).startsWith('<<F:')) {
        const endMarker = originalDoc.indexOf('>>', originalPos);
        if (endMarker !== -1) {
          originalPos = endMarker + 2;
          continue;
        }
      }
      if (originalDoc.substring(originalPos).startsWith('<</F>>')) {
        originalPos += 6;
        continue;
      }
      if (originalDoc.substring(originalPos).startsWith('<<BOLD>>')) {
        originalPos += 8;
        continue;
      }
      if (originalDoc.substring(originalPos).startsWith('<</BOLD>>')) {
        originalPos += 9;
        continue;
      }
      
      // Regular character - advance both
      originalPos++;
      cleanIndex++;
    }
    
    return originalPos;
  };

  // OLD: Helper function to find insertion position for a clause (DEPRECATED - kept for fallback)
  const findClauseInsertionPosition = (text: string, clauseKey: string): number => {
    // Judge concurrence block goes at the very end of the document (last 5-15 lines)
    if (clauseKey === 'judge_concurrence') {
      return text.length;
    }
    
    // Conclusion section and disposition formula go near the end (80-95% through document)
    if (['conclusion_section', 'disposition_formula'].includes(clauseKey)) {
      return Math.floor(text.length * 0.9);
    }
    
    // Header clauses go at the very beginning
    if (['case_number', 'case_title', 'court_name', 'judge_names', 'judge_bench'].includes(clauseKey)) {
      return 0;
    }
    
    // Dates go near the beginning, after case info
    if (['date_of_order', 'hearing_dates'].includes(clauseKey)) {
      const caseMatch = text.search(/Case\s+(?:No\.|Number)|Criminal\s+Appeal|Civil\s+Appeal|Writ\s+Petition/i);
      if (caseMatch !== -1) {
        const lineEnd = text.indexOf('\n', caseMatch);
        return lineEnd !== -1 ? lineEnd + 1 : caseMatch;
      }
      return 0;
    }
    
    // Petitioner name - look for PETITIONER section or insert after case header
    if (clauseKey === 'petitioner_name') {
      const petitionerMatch = text.search(/\n\s*PETITIONER[S]?\s*[:|\n]/i);
      if (petitionerMatch !== -1) {
        const lineEnd = text.indexOf('\n', petitionerMatch + 1);
        return lineEnd !== -1 ? lineEnd + 1 : petitionerMatch;
      }
      // Insert after first major header or dates
      const headerEnd = text.search(/={10,}\n/);
      if (headerEnd !== -1) {
        const nextLinebreak = text.indexOf('\n', headerEnd + 1);
        return nextLinebreak !== -1 ? nextLinebreak + 1 : headerEnd;
      }
      return Math.min(300, text.length); // Early in document
    }
    
    // Respondent name - look for RESPONDENT section or insert after petitioner
    if (clauseKey === 'respondent_name') {
      const respondentMatch = text.search(/\n\s*RESPONDENT[S]?\s*[:|\n]/i);
      if (respondentMatch !== -1) {
        const lineEnd = text.indexOf('\n', respondentMatch + 1);
        return lineEnd !== -1 ? lineEnd + 1 : respondentMatch;
      }
      // Look for petitioner section to insert after it
      const petitionerMatch = text.search(/\n\s*PETITIONER[S]?\s*[:|\n]/i);
      if (petitionerMatch !== -1) {
        // Find end of petitioner section (next empty line or next section)
        let searchPos = petitionerMatch + 10;
        const nextSection = text.substring(searchPos).search(/\n\s*[A-Z]{4,}/);
        if (nextSection !== -1) {
          return searchPos + nextSection;
        }
      }
      return Math.min(400, text.length); // After petitioner area
    }
    
    // Legal representatives - insert after parties section
    if (clauseKey === 'legal_representatives') {
      // Look for existing counsel/advocate section
      const counselMatch = text.search(/\n\s*(Counsel|Advocate|Attorney|For\s+the\s+Petitioner)/i);
      if (counselMatch !== -1) {
        return counselMatch;
      }
      // Look for respondent section to insert after
      const respondentMatch = text.search(/\n\s*RESPONDENT[S]?\s*[:|\n]/i);
      if (respondentMatch !== -1) {
        // Find 5 lines after respondent
        let pos = respondentMatch;
        for (let i = 0; i < 5; i++) {
          const nextLine = text.indexOf('\n', pos + 1);
          if (nextLine === -1) break;
          pos = nextLine;
        }
        return pos;
      }
      return Math.min(500, text.length); // After parties
    }
    
    // Subject matter - insert before main judgment/order text
    if (clauseKey === 'subject_matter') {
      // Look for ORDER or JUDGMENT keyword
      const judgmentMatch = text.search(/\n\s*(ORDER|JUDGMENT|DECISION)\s*[:|\n]/i);
      if (judgmentMatch !== -1) {
        return judgmentMatch;
      }
      // Otherwise insert around 20% into document
      return Math.floor(text.length * 0.2);
    }
    
    // Referred cases - insert in legal analysis section (middle of document)
    if (clauseKey === 'referred_cases') {
      // Look for existing citations
      const citationMatch = text.search(/(AIR|SCC|\d{4}\s+\(\d+\)|referred to|relied upon|cited)/i);
      if (citationMatch !== -1) {
        // Find start of that paragraph
        const paragraphStart = text.lastIndexOf('\n\n', citationMatch);
        return paragraphStart !== -1 ? paragraphStart + 2 : citationMatch;
      }
      // Insert in middle of document
      return Math.floor(text.length * 0.5);
    }
    
    // Default: insert early in document but after header
    return Math.min(200, text.length);
  };

  const generateReport = () => {
    if (!results) return '';
    
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
${c.name}
Status: ${c.status || 'Pending'}
Severity: ${c.severity}
Description: ${c.description}
${c.status === 'accepted' ? `Accepted Text: ${c.userInputValue || c.predictedText}` : ''}`).join('\n')}

CORRUPTED CLAUSES
-----------------
${results.corruptedClauses.map(c => `
${c.name}
Status: ${c.status || 'Pending'}
Issue: ${c.issue}
${c.status === 'accepted' ? `Corrected Text: ${c.userInputValue || c.predictedText}` : ''}`).join('\n')}

--- END OF REPORT ---`;
  };

  const handleAcceptClause = (type: 'missing' | 'corrupted', id: number) => {
    if (!results) return;
    const key = type === 'missing' ? 'missingClauses' : 'corruptedClauses';
    const clause = results[key].find((c: any) => c.id === id);
    
    if (clause) {
      let updatedDoc = modifiedDocumentText;
      
      if (type === 'corrupted') {
        // Replace corrupted text with user input or predicted text
        const corruptedClause = clause as CorruptedClause;
        const valueToUse = corruptedClause.userInputValue || corruptedClause.predictedText;
        updatedDoc = updatedDoc.replace(
          /\[CORRUPTED: [^\]]+\]/,
          valueToUse
        );
      } else {
        // Insert missing clause at the marker
        const missingClause = clause as MissingClause;
        const marker = `[MISSING: ${missingClause.name}`;
        const markerIndex = updatedDoc.indexOf(marker);
        if (markerIndex !== -1) {
          const lineStart = updatedDoc.lastIndexOf('\n', markerIndex) + 1;
          const lineEnd = updatedDoc.indexOf('\n', markerIndex);
          
          // Use userInputValue for non-predictable, predictedText for predictable
          const valueToUse = missingClause.userInputValue || missingClause.predictedText;
          
          let replacement;
          if (missingClause.isPredictable) {
            // Full clause with heading
            const indentation = '    ';
            replacement = `\n${indentation}${missingClause.name.toUpperCase()}\n${indentation}${valueToUse}\n`;
          } else {
            // Just replace the placeholder inline
            replacement = valueToUse;
          }
          
          updatedDoc = updatedDoc.substring(0, lineStart) + replacement + updatedDoc.substring(lineEnd + 1);
        }
      }
      
      setModifiedDocumentText(updatedDoc);
    }
    
    setResults({
      ...results,
      [key]: results[key].map((c: any) => c.id === id ? { ...c, status: 'accepted' } : c)
    });
    setActivePopover(null);
  };

  const handleRejectClause = (type: 'missing' | 'corrupted', id: number) => {
    if (!results) return;
    const key = type === 'missing' ? 'missingClauses' : 'corruptedClauses';
    setResults({
      ...results,
      [key]: results[key].map((c: any) => c.id === id ? { ...c, status: 'rejected' } : c)
    });
    setActivePopover(null);
  };

  const handleSaveEdit = (type: 'missing' | 'corrupted', id: number) => {
    if (!results) return;
    const key = type === 'missing' ? 'missingClauses' : 'corruptedClauses';
    const clause = results[key].find((c: any) => c.id === id);
    
    if (clause) {
      let updatedDoc = modifiedDocumentText;
      
      if (type === 'corrupted') {
        // Replace corrupted text with edited text
        updatedDoc = updatedDoc.replace(
          /\[CORRUPTED: [^\]]+\]/,
          editedText
        );
      } else {
        // Insert missing clause with edited text
        const missingClause = clause as MissingClause;
        const marker = `[MISSING: ${missingClause.name}`;
        const markerIndex = updatedDoc.indexOf(marker);
        if (markerIndex !== -1) {
          const lineStart = updatedDoc.lastIndexOf('\n', markerIndex) + 1;
          const lineEnd = updatedDoc.indexOf('\n', markerIndex);
          
          let replacement;
          if (missingClause.isPredictable) {
            // Full clause with heading
            const indentation = '    ';
            replacement = `\n${indentation}${missingClause.name.toUpperCase()}\n${indentation}${editedText}\n`;
          } else {
            // Just replace the placeholder inline
            replacement = editedText;
          }
          
          updatedDoc = updatedDoc.substring(0, lineStart) + replacement + updatedDoc.substring(lineEnd + 1);
        }
      }
      
      setModifiedDocumentText(updatedDoc);
    }
    
    setResults({
      ...results,
      [key]: results[key].map((c: any) => 
        c.id === id ? { ...c, predictedText: editedText, userInputValue: editedText, status: 'edited' } : c
      )
    });
    setEditingClauseId(null);
    setEditedText('');
    setActivePopover(null);
  };

  const handleStartDocumentEdit = () => {
    setIsEditingDocument(true);
    setActivePopover(null);
  };

  const handleCancelDocumentEdit = () => {
    setIsEditingDocument(false);
    setModifiedDocumentText(documentText);
  };

  const handleDoneDocumentEdit = async () => {
    if (!savedTextFilename) {
      console.error('No saved filename available to update on server');
      setIsEditingDocument(false);
      return;
    }

    try {
      setAnalyzing(true);
      setProgress(75);
      const resp = await api.saveTextFile(savedTextFilename, modifiedDocumentText);
      if (resp && resp.success) {
        setDocumentText(modifiedDocumentText);
        setIsEditingDocument(false);
        setProgress(100);
      } else {
        console.error('saveTextFile failed', resp);
      }
    } catch (err) {
      console.error('save text error', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUseAlternative = (clauseId: number, altText: string) => {
    setEditingClauseId(clauseId);
    setEditedText(altText);
  };

  const handleManualInputSave = (type: 'missing' | 'corrupted', id: number) => {
    if (!results) return;
    const key = type === 'missing' ? 'missingClauses' : 'corruptedClauses';
    const inputValue = manualInputValues[id];
    if (!inputValue) return;

    setResults({
      ...results,
      [key]: results[key].map((c: any) =>
        c.id === id ? { ...c, userInputValue: inputValue, predictedText: inputValue, status: 'accepted' } : c
      )
    });

    // Update document
    const clause = results[key].find((c: any) => c.id === id);
    if (clause) {
      let updatedDoc = modifiedDocumentText;
      
      if (type === 'corrupted') {
        updatedDoc = updatedDoc.replace(/\[CORRUPTED: [^\]]+\]/, inputValue);
      } else {
        const marker = `[MISSING: ${clause.name}`;
        const markerIndex = updatedDoc.indexOf(marker);
        if (markerIndex !== -1) {
          const lineStart = updatedDoc.lastIndexOf('\n', markerIndex) + 1;
          const lineEnd = updatedDoc.indexOf('\n', markerIndex);
          updatedDoc = updatedDoc.substring(0, lineStart) + inputValue + updatedDoc.substring(lineEnd + 1);
        }
      }
      setModifiedDocumentText(updatedDoc);
    }

    setActivePopover(null);
  };

  const renderDocumentWithHighlights = () => {
    // Strip formatting markers for display (but keep them in the actual data)
    const displayText = stripFormattingMarkers(modifiedDocumentText);
    const lines = displayText.trim().split('\n');
    let charOffset = 0;

    return lines.map((line, idx) => {
      const lineStart = charOffset;
      const lineEnd = charOffset + line.length;
      charOffset = lineEnd + 1; // +1 for newline

      const isCorrupted = line.includes('[CORRUPTED:');
      const isMissing = line.includes('[MISSING:');

      // Check if any corrupted region from backend falls within this line
      const lineCorruptedRegions = corruptedRegions.filter(region => 
        (region.start >= lineStart && region.start < lineEnd) ||
        (region.end > lineStart && region.end <= lineEnd) ||
        (region.start < lineStart && region.end > lineEnd)
      );

      // If backend detected corruption matches (heuristics), check those too (legacy)
      // Only highlight if the match actually contains special characters (excluding dashes)
      const heuristicMatch = corruptedMatches.find(m => m && line.includes(m) && /[^\w\s-]/.test(m));

      if (isCorrupted) {
        const match = line.match(/\[CORRUPTED: ([^\]]+)\]/);
        const corruptedText = match ? match[1] : '###';
        const beforeText = line.substring(0, line.indexOf('[CORRUPTED:'));
        const afterText = line.substring(line.indexOf(']') + 1);
        // Find matching corrupted clause based on section/context
        const clause = results?.corruptedClauses.find(c => 
          line.toLowerCase().includes(c.section.toLowerCase()) ||
          corruptedText.includes('SC/') && c.name.includes('Case Number') ||
          corruptedText.includes('.03.2023') && c.name.includes('Date')
        ) || results?.corruptedClauses[0];

        return (
          <div key={idx} className="hover:bg-warning/5 transition-colors">
            {beforeText}
            <Popover open={activePopover === `corrupted-${clause?.id}`} onOpenChange={(open) => setActivePopover(open ? `corrupted-${clause?.id}` : null)}>
              <PopoverTrigger asChild>
                <span
                  className="relative inline-block bg-warning text-warning-foreground px-2 py-0.5 rounded cursor-pointer hover:bg-warning/80 transition-all duration-200"
                  title={`Corrupted: ${corruptedText}`}
                >
                  {corruptedText}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="start">
                {clause && renderClausePopover(clause, 'corrupted')}
              </PopoverContent>
            </Popover>
            {afterText}
          </div>
        );
      }

      if (isMissing) {
        const match = line.match(/\[MISSING: ([^\]]+)\]/);
        const missingClause = match ? match[1] : 'Missing Clause';
        // Extract the clause name from the marker text (e.g., "Argument Date - Enter date" -> "Argument Date")
        const clauseName = missingClause.split(' - ')[0].trim();
        const clause = results?.missingClauses.find(c => 
          c.name.toLowerCase() === clauseName.toLowerCase() ||
          clauseName.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(clauseName.toLowerCase())
        );

        return (
          <div key={idx} className="my-4">
            <Popover open={activePopover === `missing-${clause?.id}`} onOpenChange={(open) => setActivePopover(open ? `missing-${clause?.id}` : null)}>
              <PopoverTrigger asChild>
                <div
                  className="relative bg-destructive/5 border-l-4 border-destructive p-4 rounded-r-lg cursor-pointer hover:bg-destructive/10 transition-all duration-200 group"
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
              </PopoverTrigger>
              <PopoverContent className="w-[500px]" align="start" side="right">
                {clause && renderClausePopover(clause, 'missing')}
              </PopoverContent>
            </Popover>
          </div>
        );
      }

      // Highlight corrupted regions detected by backend regex patterns
      if (lineCorruptedRegions.length > 0) {
        const sortedRegions = [...lineCorruptedRegions].sort((a, b) => b.start - a.start);
        
        for (const region of sortedRegions) {
          const relativeStart = Math.max(0, region.start - lineStart);
          const relativeEnd = Math.min(line.length, region.end - lineStart);
          
          if (relativeStart < relativeEnd && relativeStart >= 0 && relativeEnd <= line.length) {
            const beforeSection = line.substring(0, relativeStart);
            const corruptedSection = line.substring(relativeStart, relativeEnd);
            const afterSection = line.substring(relativeEnd);
            
            // Find only the actual corrupted characters within this section
            // Look for sequences of special corruption characters
            const corruptionPattern = /([#*%€@£¥§¶†‡°•■□▪▫◊○●◘◙☺☻♀♂♠♣♥♦]{1,}|[^\w\s\-.,/:()'"&]{3,})/g;
            
            // Split the section into parts: before corruption, corruption, after corruption
            let parts: Array<{text: string, isCorrupted: boolean}> = [];
            let lastIndex = 0;
            let match;
            
            while ((match = corruptionPattern.exec(corruptedSection)) !== null) {
              // Add text before the corruption
              if (match.index > lastIndex) {
                parts.push({text: corruptedSection.substring(lastIndex, match.index), isCorrupted: false});
              }
              // Add the corrupted text
              parts.push({text: match[0], isCorrupted: true});
              lastIndex = match.index + match[0].length;
            }
            
            // Add remaining text after last corruption
            if (lastIndex < corruptedSection.length) {
              parts.push({text: corruptedSection.substring(lastIndex), isCorrupted: false});
            }
            
            // Only render highlighting if we actually found corruption
            if (parts.some(p => p.isCorrupted)) {
              return (
                <div key={idx} className="hover:bg-warning/5 transition-colors">
                  {beforeSection}
                  {parts.map((part, partIdx) => 
                    part.isCorrupted ? (
                      <span 
                        key={partIdx}
                        className="relative inline-block bg-warning/70 text-warning-foreground px-1 py-0.5 rounded cursor-help border border-warning"
                        title={`Corrupted: ${region.clause_name}`}
                      >
                        {part.text}
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                      </span>
                    ) : (
                      <span key={partIdx}>{part.text}</span>
                    )
                  )}
                  {afterSection}
                </div>
              );
            }
          }
        }
      }

      // Highlight heuristic-detected corrupted fragment (legacy support)
      if (heuristicMatch) {
        const beforeText = line.substring(0, line.indexOf(heuristicMatch));
        const afterText = line.substring(line.indexOf(heuristicMatch) + heuristicMatch.length);
        return (
          <div key={idx} className="hover:bg-warning/5 transition-colors">
            {beforeText}
            <span className="relative inline-block bg-warning/60 text-warning-foreground px-2 py-0.5 rounded cursor-help border border-warning/50" title="Corruption detected by heuristics">
              {heuristicMatch}
            </span>
            {afterText}
          </div>
        );
      }

      return <div key={idx} style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}>{line || '\u00A0'}</div>;
    });
  };

  const renderClausePopover = (clause: any, type: 'missing' | 'corrupted') => {
    const isEditing = editingClauseId === clause.id;
    
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-foreground">{clause.name}</h4>
            {type === 'missing' && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={
                  clause.severity === 'high' ? 'destructive' : 
                  clause.severity === 'medium' ? 'default' : 
                  'secondary'
                }>
                  {clause.severity.toUpperCase()}
                </Badge>
                {clause.confidence && (
                  <Badge variant="outline">{Math.round(clause.confidence * 100)}%</Badge>
                )}
              </div>
            )}
          </div>
          {clause.status && (
            <Badge 
              variant={
                clause.status === 'accepted' ? 'default' : 
                clause.status === 'rejected' ? 'destructive' : 
                'secondary'
              }
              className={clause.status === 'accepted' ? 'bg-success' : ''}
            >
              {clause.status}
            </Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleSaveEdit(type, clause.id)} className="bg-success">
                <Check className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingClauseId(null);
                setEditedText('');
              }}>
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : clause.isPredictable === false ? (
          // NON-PREDICTABLE - Show input field
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Manual Input Required
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    AI cannot predict this value. Please enter manually.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground">
              💡 {clause.suggestion}
            </div>

            {!clause.status && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`input-${clause.id}`} className="text-sm font-medium">
                    {clause.inputType === 'signature' ? 'Your Signature' : 'Enter Value'}
                  </Label>
                  {clause.inputType === 'signature' ? (
                    <Textarea
                      id={`input-${clause.id}`}
                      placeholder={clause.placeholderText || 'Type your signature'}
                      value={manualInputValues[clause.id] || ''}
                      onChange={(e) => setManualInputValues(prev => ({ ...prev, [clause.id]: e.target.value }))}
                      rows={2}
                      className="font-cursive text-lg"
                    />
                  ) : (
                    <Input
                      id={`input-${clause.id}`}
                      type={clause.inputType === 'date' ? 'date' : clause.inputType === 'number' ? 'number' : 'text'}
                      placeholder={clause.placeholderText || 'Enter value'}
                      value={manualInputValues[clause.id] || ''}
                      onChange={(e) => setManualInputValues(prev => ({ ...prev, [clause.id]: e.target.value }))}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleManualInputSave(type, clause.id)}
                    className="flex-1 bg-success hover:bg-success/90"
                    disabled={!manualInputValues[clause.id]}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectClause(type, clause.id)}
                    className="flex-1"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            )}

            {clause.status === 'accepted' && clause.userInputValue && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-600 mb-1">Saved Value:</p>
                <p className="text-sm text-foreground font-medium">{clause.userInputValue}</p>
              </div>
            )}
          </div>
        ) : (
          // PREDICTABLE - Show AI prediction
          <>
            <Tabs defaultValue="prediction" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prediction">Prediction</TabsTrigger>
                <TabsTrigger value="alternatives">
                  Alt {clause.alternatives?.length ? `(${clause.alternatives.length})` : ''}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prediction" className="space-y-3 mt-3">
                <div className="bg-muted/50 p-3 rounded text-sm">
                  {clause.predictedText}
                </div>
                {type === 'missing' && clause.suggestion && (
                  <div className="bg-accent/10 border-l-2 border-accent p-2 rounded-r text-xs">
                    <div className="flex gap-2">
                      <Lightbulb className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">{clause.suggestion}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-2 mt-3">
                {clause.alternatives?.map((alt: string, idx: number) => (
                  <div key={idx} className="bg-muted p-2 rounded text-xs">
                    <p className="mb-2">{alt}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => handleUseAlternative(clause.id, alt)}
                    >
                      Use This
                    </Button>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {!clause.status && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAcceptClause(type, clause.id)}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setEditingClauseId(clause.id);
                    setEditedText(clause.predictedText);
                  }}
                  className="flex-1"
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRejectClause(type, clause.id)}
                  className="flex-1"
                >
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
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

  const handleDownloadDocument = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      
      if (!savedTextFilename) {
        alert('No file available for download. Please upload a document first.');
        return;
      }
      
      // Use the finalize-and-download-pdf endpoint which:
      // 1. Merges any edits from clean version into tagged version
      // 2. Generates PDF from tagged version (preserves formatting)
      const formData = new FormData();
      formData.append('filename', savedTextFilename);
      
      const response = await fetch(`${API_BASE}/finalize-and-download-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_completed.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      if (!savedTextFilename) {
        alert('No file available to save. Please upload a document first.');
        return;
      }

      // Derive the finalized filename from the current filename
      // e.g., "document.pdf.clean.txt" -> "document.pdf_finalized.clean.txt"
      const finalizedFilename = savedTextFilename.replace('.clean.txt', '_finalized.clean.txt');
      console.log('Saving finalized document to MongoDB:', finalizedFilename);

      // Prepare metadata to store with the finalized document
      const analysisData = {
        timestamp: new Date().toISOString(),
        totalClauses: results?.totalClauses || 0,
        validClauses: results?.validClauses || 0,
        missingClauses: results?.missingClauses || [],
        corruptedClauses: results?.corruptedClauses || [],
        originalFilename: file.name,
      };

      // Save the finalized text file to MongoDB GridFS
      const response = await saveToDatabase(finalizedFilename, analysisData);

      if (response.success) {
        setIsSavedToDb(true);
        console.log('Finalized document saved to database:', response);
        alert('Successfully saved finalized document to database!');
        // Optionally close dialog after a brief delay
        setTimeout(() => setShowCompleteDialog(false), 1500);
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      alert(`Failed to save to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to get organized clause lists from backend response
  const getOrganizedClauses = () => {
    if (!results) return { present: [], missing: [], corrupted: [] };
    
    // Get clauses from the actual analysis response if available
    const resp = (results as any).__raw_response__;
    if (resp && resp.clause_analysis && Array.isArray(resp.clause_analysis.clauses)) {
      const clauses = resp.clause_analysis.clauses;
      return {
        present: clauses.filter((c: any) => c.status === 'Present').map((c: any) => c.clause_name),
        missing: clauses.filter((c: any) => c.status === 'Missing').map((c: any) => c.clause_name),
        corrupted: clauses.filter((c: any) => c.status === 'Corrupted').map((c: any) => c.clause_name)
      };
    }
    
    // Fallback: use the processed missing/corrupted arrays
    return {
      present: [], // Can be calculated: total - missing - corrupted
      missing: results.missingClauses.map((c: any) => c.name),
      corrupted: results.corruptedClauses.map((c: any) => c.name)
    };
  };

  const renderClauseDetailsDialog = () => {
    const organized = getOrganizedClauses();
    const presentCount = results?.statistics?.present || results?.presentClauses || 0;
    const missingCount = results?.statistics?.missing || results?.missingClauses.length || 0;
    const corruptedCount = results?.statistics?.corrupted || results?.corruptedClauses.length || 0;
    
    return (
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <div className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold">Clause Detection Details</DialogTitle>
          <DialogDescription>
            Complete breakdown of all {results?.statistics?.total_clauses || results?.totalClauses || 0} clauses analyzed in this document
          </DialogDescription>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-6 py-4">
          <Tabs defaultValue="present" className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
              <TabsTrigger value="present" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Present ({presentCount})
              </TabsTrigger>
              <TabsTrigger value="missing" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Missing ({missingCount})
              </TabsTrigger>
              <TabsTrigger value="corrupted" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Corrupted ({corruptedCount})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="present" className="space-y-2 m-0">
              {organized.present.length > 0 ? (
                organized.present.map((clauseName, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm font-medium">{clauseName}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No present clauses to display</p>
                </div>
              )}
            </TabsContent>

              <TabsContent value="missing" className="space-y-2 m-0">
              {organized.missing.length > 0 ? (
                organized.missing.map((clauseName, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-sm font-medium">{clauseName}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No missing clauses - document is complete!</p>
                </div>
              )}
            </TabsContent>

              <TabsContent value="corrupted" className="space-y-2 m-0">
              {organized.corrupted.length > 0 ? (
                organized.corrupted.map((clauseName, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    <span className="text-sm font-medium">{clauseName}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No corrupted clauses detected</p>
                </div>
              )}
            </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    );
  };

  const renderComparisonView = () => {
    // Strip formatting markers for display
    const originalLines = stripFormattingMarkers(documentText).trim().split('\n');
    const modifiedLines = stripFormattingMarkers(modifiedDocumentText).trim().split('\n');
    
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Original Document
          </h3>
          <div className="font-mono text-xs text-foreground bg-muted/30 p-2 rounded-lg border border-border h-[600px] overflow-y-auto" style={{ lineHeight: '1.2' }}>
            {originalLines.map((line, idx) => (
              <div 
                key={idx} 
                className={`${
                  line.includes('[CORRUPTED:') ? 'bg-warning/20 px-1' : 
                  line.includes('[MISSING:') ? 'bg-destructive/10 border-l-2 border-destructive px-2' : ''
                }`}
                style={{ whiteSpace: 'pre' }}
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-success mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Modified Document
          </h3>
          <div className="font-mono text-xs text-foreground bg-success/5 p-2 rounded-lg border border-success h-[600px] overflow-y-auto" style={{ lineHeight: '1.2' }}>
            {modifiedLines.map((line, idx) => {
              const isNew = !originalLines.includes(line) && !line.includes('[CORRUPTED:') && !line.includes('[MISSING:');
              return (
                <div 
                  key={idx} 
                  className={`${isNew ? 'bg-success/20 px-1 font-semibold' : ''}`}
                  style={{ whiteSpace: 'pre' }}
                >
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            Document Analysis
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">How it works</h4>
                  <p className="text-xs text-muted-foreground">
                    Our AI analyzes your legal document to identify clauses, detect issues, and automatically suggest fixes for missing or corrupted content.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            <FileText className="w-4 h-4 inline mr-1" />
            {file.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!analysisComplete && !analysisRunning && (
            <Button onClick={startAnalysis} size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
              <Play className="w-4 h-4 mr-2" />
              Start AI Analysis
            </Button>
          )}
          {analysisComplete && results && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadDocument}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
                onClick={() => setViewMode(viewMode === 'review' ? 'comparison' : 'review')}
              >
                <Eye className="w-4 h-4 mr-2" />
                {viewMode === 'review' ? 'Show Comparison' : 'Back to Review'}
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCompleteDialog(true)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Analysis
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analysis Progress - shown only when analyzing */}
      {!analyzing && !analysisComplete && (
        <Card className="w-full border-dashed border-2">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900 dark:to-violet-900 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Click "Start AI Analysis" to begin. The AI will extract text, identify clauses, validate structure, and automatically suggest fixes for any issues.
                </p>
              </div>
              <div className="flex justify-center gap-6 pt-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-xs font-medium">Validate Clauses</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium">AI Suggestions</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-2">
                    <Download className="w-6 h-6 text-violet-600" />
                  </div>
                  <p className="text-xs font-medium">Generate Report</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analyzing && (
        <Card className="w-full border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="animate-spin text-blue-600" />
              Analysis in Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Please wait while the AI processes your document...</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="flex gap-3 py-2 flex-nowrap">
              {processSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border flex items-center gap-3 box-border"
                  style={{ flex: `1 1 ${100 / processSteps.length}%`, minWidth: 0 }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
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
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${step.status === 'complete' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.status === 'complete' ? 'Completed' : step.status === 'processing' ? 'In progress' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Summary - Horizontal Layout */}
      {analysisComplete && results && predictions && (
        <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Analysis Complete
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review the findings below and accept or edit AI suggestions</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                <CheckCheck className="w-3 h-3 mr-1" />
                Analysis Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                <span className="text-3xl font-bold text-foreground">{results.statistics?.total_clauses || results.totalClauses}</span>
                <span className="text-sm font-semibold text-muted-foreground mt-1">Total Clauses</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-success/10 rounded-lg">
                <span className="text-3xl font-bold text-success">{results.statistics?.present || results.presentClauses}</span>
                <span className="text-sm font-semibold text-success mt-1">Present</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg">
                <span className="text-3xl font-bold text-destructive">{results.statistics?.missing || results.missingClauses.length}</span>
                <span className="text-sm font-semibold text-destructive mt-1">Missing</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-warning/10 rounded-lg">
                <span className="text-3xl font-bold text-warning">{results.statistics?.corrupted || results.corruptedClauses.length}</span>
                <span className="text-sm font-semibold text-warning mt-1">Corrupted</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Completion Percentage */}
              {results.statistics?.completion_percentage !== undefined && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">Completion</span>
                    <span className="text-sm font-bold text-accent">{results.statistics.completion_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={results.statistics.completion_percentage} className="h-2" />
                </div>
              )}

              {/* Real-time Decision Tracking */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Accepted</span>
                    <Badge variant="default" className="bg-success text-success-foreground">
                      {[...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'accepted').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Rejected</span>
                    <Badge variant="default" className="bg-destructive text-destructive-foreground">
                      {[...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'rejected').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Edited</span>
                    <Badge variant="default" className="bg-accent text-accent-foreground">
                      {[...results.missingClauses, ...results.corruptedClauses].filter(c => c.status === 'edited').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <Badge variant="outline">
                      {[...results.missingClauses, ...results.corruptedClauses].filter(c => !c.status).length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Dialog open={showClauseDetailsDialog} onOpenChange={setShowClauseDetailsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    <List className="w-5 h-5 mr-2" />
                    View Detailed Clause Breakdown
                  </Button>
                </DialogTrigger>
                {renderClauseDetailsDialog()}
              </Dialog>
              <p className="text-xs text-muted-foreground text-center mt-2">
                <Info className="w-3 h-3 inline mr-1" />
                Click to see a detailed breakdown of all present, missing, and corrupted clauses
              </p>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* ─── Complete Analysis Dialog ─────────────────────────────────────── */}
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
              onClick={() => {
                handleDownloadDocument();
              }}
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
              onClick={onCancel}
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

      {/* ─── AI Suggestions Panel ─────────────────────────────────────────── */}
      {analysisComplete && predictions && predictions.total_missing > 0 && (
        <Card className="border-violet-200 dark:border-violet-800 shadow-md">
          <CardHeader className="pb-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-violet-600" />
                  AI Clause Predictions
                  <Badge variant="outline" className="ml-2 text-violet-600 border-violet-300">
                    {predictions.total_missing} suggestions
                  </Badge>
                  {predictions.source && (
                    <Badge variant="secondary" className="text-xs">
                      {predictions.source === 'cache' ? '⚡ cached' : predictions.source === 'llm' ? '🤖 AI Predicted' : predictions.source}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Review each suggestion and choose to accept, edit, or reject
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGetAISuggestions(true)}
                  disabled={predictionsLoading}
                  title="Refresh AI suggestions to get new recommendations"
                  className="hover:bg-violet-100 dark:hover:bg-violet-900/30"
                >
                  <RefreshCw className={`w-4 h-4 ${predictionsLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPredictionsPanel(!showPredictionsPanel)}
                  title={showPredictionsPanel ? 'Collapse suggestions panel' : 'Expand suggestions panel'}
                  className="hover:bg-violet-100 dark:hover:bg-violet-900/30"
                >
                  {showPredictionsPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {/* Stats bar */}
            {(() => {
              const stats = getPredictionStats();
              return stats.total > 0 ? (
                <div className="flex flex-wrap gap-4 mt-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border">
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> {stats.pending} Pending Review</span>
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> {stats.accepted} Accepted</span>
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> {stats.edited} Edited</span>
                  <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {stats.rejected} Rejected</span>
                </div>
              ) : null;
            })()}
          </CardHeader>
          {showPredictionsPanel && (
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(predictions.suggestions).map(([clauseKey, suggestion]) => {
                  const status = suggestionStatuses[clauseKey] || 'pending';
                  const isEditing = editingSuggestionKey === clauseKey;
                  const confidenceColor = suggestion.confidence >= 80 ? 'text-green-600' : suggestion.confidence >= 50 ? 'text-amber-600' : 'text-red-500';
                  const confidenceBg = suggestion.confidence >= 80 ? 'bg-green-100 dark:bg-green-900/30' : suggestion.confidence >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30';

                  return (
                    <div
                      key={clauseKey}
                      className={`border rounded-lg p-4 transition-all ${
                        status === 'accepted' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' :
                        status === 'rejected' ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10 opacity-60' :
                        status === 'edited' ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' :
                        'border-violet-200 dark:border-violet-800'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{suggestion.clause_name}</h4>
                            <Badge
                              variant={suggestion.predictability === 'FULL' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {suggestion.predictability === 'FULL' ? '✓ Full Prediction' : 'Partial'}
                            </Badge>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className={`text-xs font-semibold px-2 py-0.5 rounded-full ${confidenceBg} ${confidenceColor} hover:opacity-80 transition-opacity cursor-help`}>
                                  {suggestion.confidence}% confidence
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">Confidence Score</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {suggestion.confidence >= 80 ? 'High confidence - This suggestion is highly reliable based on similar documents.' : 
                                     suggestion.confidence >= 50 ? 'Medium confidence - Review this suggestion carefully before accepting.' :
                                     'Low confidence - Please verify this suggestion thoroughly.'}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Freq: {suggestion.frequency} | Position: {suggestion.position}
                          </p>
                        </div>
                        {status !== 'pending' && (
                          <Badge
                            variant={status === 'accepted' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}
                            className={status === 'accepted' ? 'bg-green-600' : status === 'edited' ? 'bg-blue-600 text-white' : ''}
                          >
                            {status}
                          </Badge>
                        )}
                      </div>

                      {/* Suggestion Text / Edit Mode */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedSuggestionText}
                            onChange={(e) => setEditedSuggestionText(e.target.value)}
                            rows={4}
                            className="text-sm font-mono"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveSuggestionEdit(clauseKey)} className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Check className="w-3 h-3 mr-1" /> Save Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelSuggestionEdit}>
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap border border-muted mb-2">
                            {suggestion.suggestion}
                          </div>
                          {suggestion.reasoning && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                              <Lightbulb className="w-3 h-3" /> {suggestion.reasoning}
                            </p>
                          )}
                          {/* anchor-text card removed per request */}
                        </>
                      )}

                      {/* Action buttons */}
                      {status === 'pending' && !isEditing && (
                        <div className="space-y-2 pt-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptSuggestion(clauseKey)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              title="Accept this suggestion as-is"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleEditSuggestion(clauseKey)}
                              className="flex-1 shadow-sm"
                              title="Modify this suggestion before accepting"
                            >
                              <Edit3 className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectSuggestion(clauseKey)}
                              className="flex-1 shadow-sm"
                              title="Reject this suggestion"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            💡 Tip: Edit if you want to customize the suggestion
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                            ⚠ Sometimes the suggested insertion position may be inaccurate — please verify the document after accepting.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}



      {/* AI Suggestions Error */}
      {predictionsError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">AI Suggestion Error</p>
                <p className="text-xs text-muted-foreground">{predictionsError}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGetAISuggestions(true)}
                className="ml-auto"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Missing Predictable Clauses */}
      {predictions && predictions.total_missing === 0 && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4 text-green-600">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-base">🎉 All clauses are present!</p>
                <p className="text-sm text-muted-foreground mt-1">Your document contains all the required predictable clauses. No AI suggestions needed.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions Loading */}
      {predictionsLoading && !predictions && (
        <Card className="border-violet-200 dark:border-violet-800">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-violet-600 animate-pulse" />
                </div>
                <Sparkles className="w-5 h-5 text-violet-600 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-base text-violet-600">AI is Generating Suggestions...</p>
                <p className="text-sm text-muted-foreground max-w-md">Analyzing document context and generating intelligent clause suggestions based on legal precedents</p>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Viewer - Full Width */}
      <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {viewMode === 'review' ? 'Document Preview' : 'Document Comparison'}
              </CardTitle>
              {analysisComplete && (
                <div className="flex items-center gap-2">
                  {viewMode === 'review' && !isEditingDocument && (
                    <>
                      <Button size="icon" variant="outline" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-semibold min-w-12 text-center">{zoom}%</span>
                      <Button size="icon" variant="outline" onClick={() => setZoom(Math.min(150, zoom + 10))}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {/* Edit controls for the document preview */}
                  {!isEditingDocument ? (
                    <Button size="sm" onClick={handleStartDocumentEdit}>Edit</Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={handleDoneDocumentEdit} className="bg-success">Done</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelDocumentEdit}>Cancel</Button>
                    </>
                  )}

                  <Button 
                    variant={viewMode === 'comparison' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'review' ? 'comparison' : 'review')}
                    className="ml-2"
                  >
                    {viewMode === 'review' ? 'Show Comparison' : 'Back to Review'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto bg-muted/30 rounded-lg" style={{ maxHeight: '600px', position: 'relative' }}>
                {/* Non-blocking analysis overlay: shows while analyzing but allows preview scrolling */}
                {analyzing && (
                  <div className="absolute inset-0 bg-white/70 z-20 flex flex-col items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-accent mb-4" />
                    <p className="text-lg font-bold text-foreground">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground mt-2">AI is scanning for issues</p>
                  </div>
                )}

                {viewMode === 'review' && (
                  isEditingDocument ? (
                    <div className="font-mono text-sm text-foreground bg-card p-2 rounded-lg shadow-sm">
                      <Textarea
                        value={modifiedDocumentText}
                        onChange={(e) => setModifiedDocumentText(e.target.value)}
                        rows={24}
                        className="w-full font-mono text-sm"
                      />
                    </div>
                  ) : analysisRunning ? (
                    // While analysis is running, do NOT render the document preview content
                    // Render an empty placeholder box so the overlay fully hides the document
                    <div
                      className="font-mono text-sm text-foreground bg-card rounded-lg shadow-sm"
                      style={{ fontSize: `${zoom}%`, minHeight: '400px', whiteSpace: 'pre', padding: '0.5rem' }}
                    />
                  ) : (
                    <div
                      className="font-mono text-sm text-foreground bg-card rounded-lg shadow-sm"
                      style={{ fontSize: `${zoom}%`, whiteSpace: 'pre', padding: '0.5rem', lineHeight: '1.2' }}
                    >
                      {renderDocumentWithHighlights()}
                    </div>
                  )
                )}

                {viewMode === 'comparison' && renderComparisonView()}
              </div>

              {analysisComplete && viewMode === 'review' && (
                <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-warning rounded"></div>
                    <span className="font-semibold text-muted-foreground">Corrupted Text</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-destructive/10 border-l-4 border-destructive rounded"></div>
                    <span className="font-semibold text-muted-foreground">Missing Clause</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-success/20 rounded"></div>
                    <span className="font-semibold text-muted-foreground">Accepted Changes</span>
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
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText, ZoomIn, ZoomOut, Download, AlertTriangle, Eye, XCircle, Edit3, Check, X, Lightbulb, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supremeCourtMissingClauses } from './mock-clauses-data';

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
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedIssue, setSelectedIssue] = useState<{ type: string; data: any } | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [editingClauseId, setEditingClauseId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [modifiedDocumentText, setModifiedDocumentText] = useState(documentText);
  const [viewMode, setViewMode] = useState<'review' | 'comparison'>('review');
  const [manualInputValues, setManualInputValues] = useState<Record<number, string>>({});

  const steps: ProcessStep[] = [
    { id: 1, name: 'Extracting text', status: 'pending', icon: '📄' },
    { id: 2, name: 'Identifying clauses', status: 'pending', icon: '🔍' },
    { id: 3, name: 'Validating structure', status: 'pending', icon: '✓' },
    { id: 4, name: 'Checking completeness', status: 'pending', icon: '📋' },
    { id: 5, name: 'Generating report', status: 'pending', icon: '📊' }
  ];

  const [processSteps, setProcessSteps] = useState(steps);

  const mockResults: AnalysisResults = {
    totalClauses: 18,
    validClauses: 13,
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
    setResults(mockResults);
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
    const lines = documentText.trim().split('\n');

    return lines.map((line, idx) => {
      const isCorrupted = line.includes('[CORRUPTED:');
      const isMissing = line.includes('[MISSING:');

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
          <div key={idx} className="py-1 hover:bg-warning/5 transition-colors">
            {beforeText}
            <Popover open={activePopover === `corrupted-${clause?.id}`} onOpenChange={(open) => setActivePopover(open ? `corrupted-${clause?.id}` : null)}>
              <PopoverTrigger asChild>
                <span
                  className="relative inline-block bg-warning text-warning-foreground px-2 py-0.5 rounded cursor-pointer hover:bg-warning/80 transition-all duration-200"
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

      return <div key={idx} className="py-1">{line || '\u00A0'}</div>;
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

  const handleDownloadDocument = () => {
    const blob = new Blob([modifiedDocumentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_completed.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderComparisonView = () => {
    const originalLines = documentText.trim().split('\n');
    const modifiedLines = modifiedDocumentText.trim().split('\n');
    
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Original Document
          </h3>
          <div className="font-mono text-xs text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border h-[600px] overflow-y-auto">
            {originalLines.map((line, idx) => (
              <div 
                key={idx} 
                className={`py-0.5 ${
                  line.includes('[CORRUPTED:') ? 'bg-warning/20 px-1' : 
                  line.includes('[MISSING:') ? 'bg-destructive/10 border-l-2 border-destructive px-2' : ''
                }`}
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
          <div className="font-mono text-xs text-foreground leading-relaxed bg-success/5 p-4 rounded-lg border border-success h-[600px] overflow-y-auto">
            {modifiedLines.map((line, idx) => {
              const isNew = !originalLines.includes(line) && !line.includes('[CORRUPTED:') && !line.includes('[MISSING:');
              return (
                <div 
                  key={idx} 
                  className={`py-0.5 ${isNew ? 'bg-success/20 px-1 font-semibold' : ''}`}
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
                {viewMode === 'review' ? 'Document Preview' : 'Document Comparison'}
              </CardTitle>
              {analysisComplete && (
                <div className="flex items-center gap-2">
                  {viewMode === 'review' && (
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
              <div className="overflow-y-auto bg-muted/30 p-6 rounded-lg" style={{ maxHeight: '600px', position: 'relative' }}>
                {/* Non-blocking analysis overlay: shows while analyzing but allows preview scrolling */}
                {analyzing && (
                  <div className="absolute inset-0 bg-white/70 z-20 flex flex-col items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-accent mb-4" />
                    <p className="text-lg font-bold text-foreground">Analyzing document...</p>
                    <p className="text-sm text-muted-foreground mt-2">AI is scanning for issues</p>
                  </div>
                )}

                {viewMode === 'review' && (
                  <div
                    className="font-mono text-sm text-foreground leading-relaxed bg-card p-6 rounded-lg shadow-sm"
                    style={{ fontSize: `${zoom}%` }}
                  >
                    {renderDocumentWithHighlights()}
                  </div>
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

          {analysisComplete && results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-semibold text-muted-foreground">Total Clauses</span>
                  <span className="text-2xl font-bold text-foreground">{results.totalClauses}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                  <span className="text-sm font-semibold text-success">Valid</span>
                  <span className="text-2xl font-bold text-success">{results.validClauses}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg">
                  <span className="text-sm font-semibold text-warning">Corrupted</span>
                  <span className="text-2xl font-bold text-warning">{results.corruptedClauses.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                  <span className="text-sm font-semibold text-destructive">Missing</span>
                  <span className="text-2xl font-bold text-destructive">{results.missingClauses.length}</span>
                </div>

                {/* Real-time Decision Tracking */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
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
                    <span className="text-muted-foreground">Pending Review</span>
                    <Badge variant="outline">
                      {[...results.missingClauses, ...results.corruptedClauses].filter(c => !c.status).length}
                    </Badge>
                  </div>
                </div>

                <Button className="w-full mt-4" onClick={() => onComplete({
                  ...results,
                  originalDocument: documentText,
                  modifiedDocument: modifiedDocumentText
                })}>
                  <Download className="w-4 h-4 mr-2" />
                  Continue to Full Review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

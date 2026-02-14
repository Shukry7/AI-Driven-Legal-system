import { useState } from 'react';
import { Download, FileText, CheckCircle, Eye, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ClauseChange {
  id: number;
  name: string;
  type: 'added' | 'corrected';
  section: string;
  originalText?: string;
  newText: string;
}

interface ClauseComparisonViewProps {
  originalDocument: string;
  modifiedDocument: string;
  changes: ClauseChange[];
  fileName: string;
  onBack: () => void;
  onComplete: () => void;
}

export function ClauseComparisonView({
  originalDocument,
  modifiedDocument,
  changes,
  fileName,
  onBack,
  onComplete
}: ClauseComparisonViewProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showChangesList, setShowChangesList] = useState(true);

  const addedChanges = changes.filter(c => c.type === 'added');
  const correctedChanges = changes.filter(c => c.type === 'corrected');

  // Helper to highlight changes in text
  const highlightAdditions = (text: string) => {
    // Find lines that are new (contain added/corrected content)
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isNewContent = changes.some(change => 
        line.includes(change.newText.substring(0, 50)) || 
        line.includes(change.name.toUpperCase())
      );
      
      if (isNewContent) {
        return (
          <div 
            key={idx} 
            className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 px-2"
            style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}
          >
            <span className="text-green-800 dark:text-green-200">{line || '\u00A0'}</span>
          </div>
        );
      }
      return <div key={idx} className="px-2" style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}>{line || '\u00A0'}</div>;
    });
  };

  // Helper to highlight removed/corrupted content in original
  const highlightRemovals = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isCorrupted = line.includes('[CORRUPTED:');
      const isMissing = line.includes('[MISSING:');
      
      if (isCorrupted) {
        return (
          <div 
            key={idx} 
            className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 px-2"
            style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}
          >
            <span className="text-yellow-800 dark:text-yellow-200">{line}</span>
          </div>
        );
      }
      if (isMissing) {
        return (
          <div 
            key={idx} 
            className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 px-2"
            style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}
          >
            <span className="text-red-800 dark:text-red-200">{line}</span>
          </div>
        );
      }
      return <div key={idx} className="px-2" style={{ whiteSpace: 'pre', wordWrap: 'break-word' }}>{line || '\u00A0'}</div>;
    });
  };

  const handleDownloadOriginal = () => {
    const blob = new Blob([originalDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_original.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCompleted = () => {
    const blob = new Blob([modifiedDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_completed.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadComparison = () => {
    // Create a comparison document with change markers
    let comparisonDoc = `DOCUMENT COMPARISON REPORT
========================
Original File: ${fileName}
Generated: ${new Date().toLocaleString()}

SUMMARY OF CHANGES
------------------
• Added Clauses: ${addedChanges.length}
• Corrected Clauses: ${correctedChanges.length}
• Total Changes: ${changes.length}

DETAILED CHANGES
----------------

`;

    changes.forEach((change, idx) => {
      comparisonDoc += `${idx + 1}. ${change.name} (${change.type.toUpperCase()})
   Section: ${change.section}
   ${change.originalText ? `Original: ${change.originalText}\n   ` : ''}New Text: ${change.newText}

`;
    });

    comparisonDoc += `
COMPLETED DOCUMENT
==================

${modifiedDocument}
`;

    const blob = new Blob([comparisonDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_comparison_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Eye className="w-6 h-6 text-accent" />
            Document Comparison
          </h2>
          <p className="text-muted-foreground mt-1">
            Review changes and download completed document
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back to Review
          </Button>
          <Button onClick={onComplete}>
            Complete & Finish
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{changes.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Changes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{addedChanges.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Added Clauses</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{correctedChanges.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Corrected Values</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={handleDownloadOriginal}>
                <Download className="w-4 h-4 mr-1" />
                Original
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleDownloadCompleted}>
                <Download className="w-4 h-4 mr-1" />
                Completed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Changes List (Collapsible) */}
      <Collapsible open={showChangesList} onOpenChange={setShowChangesList}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Changes Applied ({changes.length})
                </CardTitle>
                {showChangesList ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {changes.map((change) => (
                  <div 
                    key={change.id} 
                    className={`p-3 rounded-lg border-l-4 ${
                      change.type === 'added' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{change.name}</span>
                      <Badge variant={change.type === 'added' ? 'default' : 'secondary'} 
                             className={change.type === 'added' ? 'bg-green-600' : 'bg-blue-600'}>
                        {change.type === 'added' ? '+ Added' : '✓ Corrected'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{change.section}</p>
                    <p className="text-sm text-foreground mt-2 line-clamp-2">{change.newText}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'side-by-side' | 'unified')}>
          <TabsList>
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="unified">Unified View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Document Comparison */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Original Document */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Original Document
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={handleDownloadOriginal}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs bg-muted/30 rounded-lg max-h-[600px] overflow-y-auto border p-2" style={{ lineHeight: '1.2' }}>
                {highlightRemovals(originalDocument)}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Corrupted</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Missing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Document */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Completed Document
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={handleDownloadCompleted} className="text-green-600">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs bg-green-50/50 dark:bg-green-900/10 rounded-lg max-h-[600px] overflow-y-auto border border-green-200 dark:border-green-800 p-2" style={{ lineHeight: '1.2' }}>
                {highlightAdditions(modifiedDocument)}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Added/Corrected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Unified View */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Unified Comparison View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs bg-muted/30 rounded-lg max-h-[700px] overflow-y-auto border p-2" style={{ lineHeight: '1.2' }}>
              {highlightAdditions(modifiedDocument)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="outline" onClick={handleDownloadOriginal} className="w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />
              Download Original
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={handleDownloadCompleted}>
              <Download className="w-4 h-4 mr-2" />
              Download Completed Document
            </Button>
            <Button variant="outline" onClick={handleDownloadComparison} className="w-full sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              Download Comparison Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

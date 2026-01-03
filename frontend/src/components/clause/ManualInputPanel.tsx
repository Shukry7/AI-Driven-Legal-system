import { useState } from 'react';
import { AlertTriangle, Calendar, DollarSign, Pen, Hash, Type, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NonPredictableClause {
  id: number;
  name: string;
  description: string;
  expectedLocation: string;
  suggestion: string;
  inputType: 'text' | 'date' | 'currency' | 'signature' | 'number';
  placeholderText?: string;
  severity: 'high' | 'medium' | 'low';
  userInputValue?: string;
  status?: 'pending' | 'completed' | 'skipped';
}

interface ManualInputPanelProps {
  clauses: NonPredictableClause[];
  onUpdateClause: (id: number, value: string) => void;
  onSkipClause: (id: number) => void;
  onCompleteAll: () => void;
}

export function ManualInputPanel({ 
  clauses, 
  onUpdateClause, 
  onSkipClause,
  onCompleteAll 
}: ManualInputPanelProps) {
  const [inputValues, setInputValues] = useState<Record<number, string>>({});

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'currency': return <DollarSign className="w-4 h-4" />;
      case 'signature': return <Pen className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const getInputPlaceholder = (clause: NonPredictableClause) => {
    switch (clause.inputType) {
      case 'date': return 'YYYY-MM-DD';
      case 'currency': return '$0.00';
      case 'signature': return 'Type your signature or leave for manual signing';
      case 'number': return 'Enter number';
      default: return clause.placeholderText || 'Enter value';
    }
  };

  const handleInputChange = (id: number, value: string) => {
    setInputValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (clause: NonPredictableClause) => {
    const value = inputValues[clause.id] || '';
    onUpdateClause(clause.id, value);
  };

  const pendingCount = clauses.filter(c => c.status === 'pending' || !c.status).length;
  const completedCount = clauses.filter(c => c.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Manual Input Required
            </CardTitle>
            <CardDescription className="mt-1">
              These items cannot be auto-predicted. Please provide the correct values.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {completedCount}/{clauses.length} completed
            </Badge>
            {pendingCount === 0 && (
              <Button size="sm" onClick={onCompleteAll} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" />
                Apply All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Why can't AI predict these?</strong> Values like signatures, specific dates, 
              monetary amounts, and other unique identifiers must be verified by the user to ensure accuracy.
            </p>
          </div>
        </div>

        {/* Clause Input Cards */}
        {clauses.map((clause) => (
          <Card 
            key={clause.id} 
            className={`transition-all ${
              clause.status === 'completed' 
                ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' 
                : clause.status === 'skipped'
                ? 'border-gray-300 bg-gray-50/50 dark:bg-gray-900/10 opacity-60'
                : 'border-amber-200 dark:border-amber-800'
            }`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    clause.status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-amber-100 dark:bg-amber-900'
                  }`}>
                    {getInputIcon(clause.inputType)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{clause.name}</h4>
                    <p className="text-xs text-muted-foreground">{clause.expectedLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    clause.severity === 'high' ? 'destructive' : 
                    clause.severity === 'medium' ? 'default' : 
                    'secondary'
                  }>
                    {clause.severity}
                  </Badge>
                  {clause.status === 'completed' && (
                    <Badge className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {clause.status === 'skipped' && (
                    <Badge variant="outline">Skipped</Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{clause.description}</p>

              {/* Suggestion */}
              <div className="bg-muted/50 p-2 rounded mb-3 text-xs text-muted-foreground">
                💡 {clause.suggestion}
              </div>

              {/* Input Field */}
              {clause.status !== 'completed' && clause.status !== 'skipped' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`input-${clause.id}`} className="text-sm font-medium">
                      Enter Value
                    </Label>
                    {clause.inputType === 'signature' ? (
                      <Textarea
                        id={`input-${clause.id}`}
                        placeholder={getInputPlaceholder(clause)}
                        value={inputValues[clause.id] || ''}
                        onChange={(e) => handleInputChange(clause.id, e.target.value)}
                        className="font-cursive text-lg"
                        rows={2}
                      />
                    ) : (
                      <Input
                        id={`input-${clause.id}`}
                        type={clause.inputType === 'date' ? 'date' : clause.inputType === 'number' ? 'number' : 'text'}
                        placeholder={getInputPlaceholder(clause)}
                        value={inputValues[clause.id] || ''}
                        onChange={(e) => handleInputChange(clause.id, e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(clause)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!inputValues[clause.id]}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onSkipClause(clause.id)}
                      className="flex-1"
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Show saved value */}
              {clause.status === 'completed' && clause.userInputValue && (
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-green-600 mb-1">Saved Value:</p>
                  <p className="text-sm text-foreground font-medium">{clause.userInputValue}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

// Component for corrupted clause manual input
interface CorruptedClauseInputProps {
  clause: {
    id: number;
    name: string;
    issue: string;
    section: string;
    suggestion: string;
    inputType?: string;
    userInputValue?: string;
    status?: string;
  };
  onSave: (id: number, value: string) => void;
  onSkip: (id: number) => void;
}

export function CorruptedClauseInput({ clause, onSave, onSkip }: CorruptedClauseInputProps) {
  const [inputValue, setInputValue] = useState(clause.userInputValue || '');

  return (
    <div className="space-y-3">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <div className="flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Original value corrupted or unreadable
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              {clause.issue}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground">
        💡 {clause.suggestion}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`corrupted-${clause.id}`} className="text-sm font-medium">
          Enter Correct Value
        </Label>
        <Input
          id={`corrupted-${clause.id}`}
          type={clause.inputType === 'currency' ? 'text' : clause.inputType === 'number' ? 'number' : 'text'}
          placeholder={clause.inputType === 'currency' ? '$0.00' : 'Enter value'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={() => onSave(clause.id, inputValue)}
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={!inputValue}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Save Value
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onSkip(clause.id)}
          className="flex-1"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

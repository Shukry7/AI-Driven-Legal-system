import { useState } from 'react';
import { ArrowLeftRight, Eye, EyeOff, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const comparisonData = [
  {
    id: 1,
    source: 'The Plaintiff is a company duly incorporated under the Companies Act No. 07 of 2007.',
    translated: 'පැමිණිලිකරු 2007 අංක 07 දරන සමාගම් පනත යටතේ නිසි පරිදි සංස්ථාපිත සමාගමක් වේ.',
    hasChanges: true,
    terms: ['Plaintiff', 'incorporated', 'Companies Act']
  },
  {
    id: 2,
    source: 'The Defendant is a corporation registered under the said Act.',
    translated: 'විත්තිකරු එම පනත යටතේ ලියාපදිංචි සංස්ථාවක් වේ.',
    hasChanges: true,
    terms: ['Defendant', 'corporation', 'registered']
  },
  {
    id: 3,
    source: 'The parties entered into a written agreement on March 15, 2023.',
    translated: 'පාර්ශවයන් 2023 මාර්තු 15 වන දින ලිඛිත ගිවිසුමකට එළඹියහ.',
    hasChanges: true,
    terms: ['parties', 'agreement']
  },
  {
    id: 4,
    source: 'The agreement was for the supply of goods and services.',
    translated: 'ගිවිසුම භාණ්ඩ හා සේවා සැපයීම සඳහා විය.',
    hasChanges: false,
    terms: ['agreement', 'goods', 'services']
  },
  {
    id: 5,
    source: 'The Defendant has failed to fulfill the contractual obligations.',
    translated: 'විත්තිකරු ගිවිසුම්ගත වගකීම් ඉටු කිරීමට අපොහොසත් වී ඇත.',
    hasChanges: true,
    terms: ['Defendant', 'contractual obligations']
  }
];

interface ComparisonViewProps {
  onBack: () => void;
}

export function ComparisonView({ onBack }: ComparisonViewProps) {
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [showGlossary, setShowGlossary] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const filteredData = showOnlyChanged 
    ? comparisonData.filter(item => item.hasChanges)
    : comparisonData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Parallel Comparison</h2>
          <p className="text-muted-foreground mt-1">
            Side-by-side view of source and translated text with line-by-line mapping
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Workspace
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={showOnlyChanged} 
                  onCheckedChange={setShowOnlyChanged}
                  id="changed-toggle"
                />
                <label htmlFor="changed-toggle" className="text-sm cursor-pointer">
                  Show Only Changed Clauses
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={showGlossary} 
                  onCheckedChange={setShowGlossary}
                  id="glossary-toggle"
                />
                <label htmlFor="glossary-toggle" className="text-sm cursor-pointer flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  Show Legal Glossary Overlay
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredData.length} clauses</span>
              <span>•</span>
              <span>{comparisonData.filter(c => c.hasChanges).length} with significant changes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Source Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Source Text
              <Badge variant="outline">English</Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Translated Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Translated Text
              <Badge variant="outline">Sinhala</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Line by Line Comparison */}
      <div className="space-y-2">
        {filteredData.map((item, index) => (
          <div 
            key={item.id}
            className={cn(
              "grid grid-cols-2 gap-4 group cursor-pointer",
              selectedLine === item.id && "ring-2 ring-accent ring-offset-2 rounded-lg"
            )}
            onClick={() => setSelectedLine(selectedLine === item.id ? null : item.id)}
          >
            {/* Source */}
            <Card className={cn(
              "transition-colors",
              item.hasChanges && "border-l-4 border-l-accent"
            )}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm legal-text text-foreground">
                      {showGlossary ? (
                        highlightTerms(item.source, item.terms)
                      ) : (
                        item.source
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translated */}
            <Card className={cn(
              "transition-colors",
              item.hasChanges && "border-r-4 border-r-success"
            )}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm legal-text text-foreground">{item.translated}</p>
                    {showGlossary && item.terms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.terms.map((term, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-xs bg-accent/10 text-accent border-0"
                          >
                            {term}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-accent rounded-sm" />
              <span className="text-muted-foreground">Source clause with changes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-r-4 border-r-success rounded-sm" />
              <span className="text-muted-foreground">Translated clause</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-0">
                term
              </Badge>
              <span className="text-muted-foreground">Legal glossary term</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function highlightTerms(text: string, terms: string[]) {
  let result = text;
  terms.forEach(term => {
    result = result.replace(
      new RegExp(`(${term})`, 'gi'),
      '⟨$1⟩'
    );
  });
  
  return result.split(/⟨|⟩/).map((part, index) => {
    if (terms.some(term => term.toLowerCase() === part.toLowerCase())) {
      return (
        <span key={index} className="bg-accent/20 text-accent px-1 rounded font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

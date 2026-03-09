import { useState, useEffect } from 'react';
import { ArrowLeftRight, Eye, EyeOff, BookOpen, Loader2, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { normalizeSinhalaUnicode } from '@/lib/sinhalaUnicode';
import { getTranslationHistory, getTranslationJob, getGlossary } from '@/config/api';
import type { TranslationJobResult, GlossaryTerm } from '@/config/api';

interface ComparisonItem {
  id: number;
  source: string;
  translated: string;
  confidence: number;
  hasChanges: boolean;
  terms: string[];
}

interface ComparisonViewProps {
  onBack: () => void;
}

export function ComparisonView({ onBack }: ComparisonViewProps) {
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [showGlossary, setShowGlossary] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Sinhala');
  const [targetLangCode, setTargetLangCode] = useState<'si' | 'ta'>('si');
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);

  useEffect(() => {
    loadLatestComparison();
  }, []);

  useEffect(() => {
    getGlossary(undefined, undefined)
      .then((g) => setGlossaryTerms(g.terms || []))
      .catch(() => {});
  }, []);

  const loadLatestComparison = async () => {
    setLoading(true);
    try {
      // Get lastly completed job from history
      const history = await getTranslationHistory();
      const completedJobs = (history.jobs || []).filter((j: any) => j.status === 'completed');
      
      if (completedJobs.length === 0) {
        setComparisonData([]);
        setLoading(false);
        return;
      }

      const latest = completedJobs[0];
      const job: TranslationJobResult = await getTranslationJob(latest.job_id);

      const langLabels: Record<string, string> = { en: 'English', si: 'Sinhala', ta: 'Tamil' };
      setSourceLang(langLabels[job.source_language] || job.source_language);
      setTargetLang(langLabels[job.target_language] || job.target_language);
      if (job.target_language === 'si' || job.target_language === 'ta') {
        setTargetLangCode(job.target_language);
      }

      // Build comparison items from source + translated sections
      const items: ComparisonItem[] = (job.source_sections || []).map((src, i) => {
        const trans = job.translated_sections?.[i];
        return {
          id: i + 1,
          source: src.content,
          translated: trans?.translated_content || '',
          confidence: trans?.confidence ?? 0,
          hasChanges: (trans?.confidence ?? 1) < 0.95,
          terms: [...(src.keywords || []), ...(trans?.keywords || [])].filter(
            (v, idx, arr) => arr.indexOf(v) === idx
          ),
        };
      });

      setComparisonData(items);
    } catch (err) {
      setComparisonData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = showOnlyChanged 
    ? comparisonData.filter(item => item.hasChanges)
    : comparisonData;

  // ── Highlight glossary terms in text ───────────────────────────────────
  const isWordChar = (char: string, lang: "en" | "si" | "ta") => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    if (code === 0x200d || code === 0x200c) return true;
    if (lang === "en") return /[a-zA-Z]/.test(char);
    if (lang === "si") return code >= 0x0d80 && code <= 0x0dff;
    if (lang === "ta") return code >= 0x0b80 && code <= 0x0bff;
    return false;
  };

  const highlightGlossary = (text: string, lang: "en" | "si" | "ta") => {
    if (!glossaryTerms.length || !text) return text;

    let normalizedText = text.normalize("NFC");
    if (lang === "si") {
      normalizedText = normalizeSinhalaUnicode(normalizedText);
    }

    const termEntries: { text: string; term: GlossaryTerm }[] = [];
    for (const t of glossaryTerms) {
      const rawTerm = t[lang];
      if (!rawTerm) continue;
      const variations = rawTerm.split(/[;]/).map((v) => v.trim()).filter((v) => v.length >= 2);
      for (const variation of variations) {
        termEntries.push({ text: variation.normalize("NFC"), term: t });
      }
    }
    termEntries.sort((a, b) => b.text.length - a.text.length);
    if (!termEntries.length) return normalizedText;

    const matches: { start: number; end: number; term: GlossaryTerm }[] = [];
    const textLower = normalizedText.toLowerCase();

    for (const entry of termEntries) {
      const termLower = entry.text.toLowerCase();
      if (entry.text.length < 3) continue;

      let searchFrom = 0;
      while (searchFrom < textLower.length) {
        const idx = textLower.indexOf(termLower, searchFrom);
        if (idx === -1) break;

        const end = idx + entry.text.length;
        const charBefore = idx > 0 ? normalizedText[idx - 1] : "";
        const charAfter = end < normalizedText.length ? normalizedText[end] : "";

        const isValidBoundary =
          (!charBefore || !isWordChar(charBefore, lang)) &&
          (!charAfter || !isWordChar(charAfter, lang));

        if (!isValidBoundary) {
          searchFrom = idx + 1;
          continue;
        }

        const overlaps = matches.some((m) => idx < m.end && end > m.start);
        if (!overlaps) {
          matches.push({ start: idx, end, term: entry.term });
        }
        searchFrom = idx + 1;
      }
    }

    if (matches.length === 0) return normalizedText;

    matches.sort((a, b) => a.start - b.start);

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.start > cursor) {
        parts.push(normalizedText.slice(cursor, m.start));
      }
      parts.push(
        <span
          key={i}
          className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-0.5 rounded cursor-help"
          title={`EN: ${m.term.en}\nSI: ${m.term.si}\nTA: ${m.term.ta}`}
        >
          {normalizedText.slice(m.start, m.end)}
        </span>,
      );
      cursor = m.end;
    });
    if (cursor < normalizedText.length) parts.push(normalizedText.slice(cursor));
    return <>{parts}</>;
  };

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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading comparison data...</span>
        </div>
      ) : comparisonData.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No completed translations yet</p>
          <p className="text-xs mt-1">Complete a translation to see the side-by-side comparison here</p>
        </div>
      ) : (
      <>
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
              <Badge variant="outline">{sourceLang}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Translated Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Translated Text
              <Badge variant="outline">{targetLang}</Badge>
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
                        highlightGlossary(item.source, 'en')
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
                    <p className="text-sm legal-text text-foreground">
                      {showGlossary ? (
                        highlightGlossary(normalizeSinhalaUnicode(item.translated), targetLangCode)
                      ) : (
                        normalizeSinhalaUnicode(item.translated)
                      )}
                    </p>
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
      </>
      )}
    </div>
  );
}

/**
 * TranslationWorkspace
 * ────────────────────
 * Shows source text alongside translated output.
 * • For fresh translations: fires off a job via context, then polls until done.
 * • For existing results: displays immediately.
 * Sections are rendered side-by-side with confidence badges and glossary
 * keyword highlights.
 */
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  BookOpen,
  BarChart3,
  AlertCircle,
  Home,
  StopCircle,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "./TranslationContext";
import { exportTranslation, getGlossary } from "@/config/api";
import type {
  TranslationJobResult,
  SourceSection,
  TranslationSection,
  GlossaryTerm,
} from "@/config/api";
import type { UploadData } from "./TranslationModule";

interface TranslationWorkspaceProps {
  uploadData: UploadData;
  existingResult: TranslationJobResult | null;
  onBack: () => void;
  onComplete: () => void;
  onTranslationComplete: (result: TranslationJobResult) => void;
}

const langLabel: Record<string, string> = {
  en: "English",
  si: "Sinhala (සිංහල)",
  ta: "Tamil (தமிழ்)",
};

function confidenceColor(c: number) {
  if (c >= 0.85) return "text-green-500";
  if (c >= 0.6) return "text-yellow-500";
  return "text-red-500";
}
function confidenceBadge(c: number) {
  if (c >= 0.85)
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (c >= 0.6)
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function TranslationWorkspace({
  uploadData,
  existingResult,
  onBack,
  onComplete,
  onTranslationComplete,
}: TranslationWorkspaceProps) {
  const { startDocumentJob, startTextJob, jobs, cancelJob } = useTranslation();

  const [result, setResult] = useState<TranslationJobResult | null>(
    existingResult,
  );
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [viewMode, setViewMode] = useState<
    "side-by-side" | "source" | "translated"
  >("side-by-side");
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  // On mount, kick off translation (or show existing result)
  useEffect(() => {
    if (existingResult) {
      setResult(existingResult);
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;
    (async () => {
      try {
        let tracked;
        if (uploadData.mode === "document" && uploadData.file) {
          tracked = await startDocumentJob(
            uploadData.file,
            uploadData.sourceLanguage,
            uploadData.targetLanguage,
          );
        } else {
          tracked = await startTextJob(
            uploadData.extractedText,
            uploadData.sourceLanguage,
            uploadData.targetLanguage,
          );
        }
        setActiveJobId(tracked.jobId);
        toast.info("Translation started — running in background");
      } catch (err: unknown) {
        setError((err as Error)?.message || "Failed to start translation");
        toast.error("Failed to start translation");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadData, existingResult]);

  // Watch the context for completion
  useEffect(() => {
    if (!activeJobId) return;
    const tracked = jobs.find((j) => j.jobId === activeJobId);
    if (!tracked) return;
    if (tracked.status === "completed" && tracked.result) {
      setResult(tracked.result);
      onTranslationComplete(tracked.result);
      toast.success("Translation completed!");
    }
    if (tracked.status === "failed") {
      setError(tracked.error || "Translation failed");
      toast.error("Translation failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, activeJobId]);

  // Load glossary terms once
  useEffect(() => {
    getGlossary(undefined, undefined)
      .then((g) => setGlossaryTerms(g.terms?.slice(0, 200) || []))
      .catch(() => {});
  }, []);

  // ── Active job info ────────────────────────────────────────────────────
  const activeJob = activeJobId
    ? jobs.find((j) => j.jobId === activeJobId)
    : null;
  const isTranslating =
    activeJob &&
    (activeJob.status === "processing" || activeJob.status === "uploading");

  const sourceSections = result?.source_sections || [];
  const translatedSections = result?.translated_sections || [];

  // Progressive sections while translating
  const progressiveSourceSections = activeJob?.sourceSections || [];
  const progressiveTranslatedSections = activeJob?.partialSections || [];

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async (format: string) => {
    if (!result) return;
    try {
      const blob = await exportTranslation(result.job_id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.filename || "translation"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Highlight glossary terms in text ───────────────────────────────────
  const highlightGlossary = (text: string, lang: "en" | "si" | "ta") => {
    if (!glossaryTerms.length) return text;
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    for (const term of glossaryTerms) {
      const termText = term[lang];
      if (!termText || termText.length < 2) continue;
      const idx = remaining.toLowerCase().indexOf(termText.toLowerCase());
      if (idx !== -1) {
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(
          <span
            key={key++}
            className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-0.5 rounded cursor-help"
            title={`EN: ${term.en}\nSI: ${term.si}\nTA: ${term.ta}`}
          >
            {remaining.slice(idx, idx + termText.length)}
          </span>,
        );
        remaining = remaining.slice(idx + termText.length);
      }
    }
    if (remaining) parts.push(remaining);
    return parts.length > 1 ? <>{parts}</> : text;
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onBack} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" />
          Translations
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">Translation Workspace</span>
      </nav>

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Translation Workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              {langLabel[uploadData.sourceLanguage] ||
                uploadData.sourceLanguage}
              {" → "}
              {langLabel[uploadData.targetLanguage] ||
                uploadData.targetLanguage}
              {uploadData.mode === "text" && " • Text input"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                className="gap-1"
              >
                <FileDown className="w-3 h-3" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("txt")}
                className="gap-1"
              >
                <Download className="w-3 h-3" /> TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
                className="gap-1"
              >
                <Download className="w-3 h-3" /> JSON
              </Button>
              <Button size="sm" onClick={onComplete} className="gap-1">
                View Summary <ArrowRight className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="ml-auto"
          >
            Go back
          </Button>
        </div>
      )}

      {/* In-progress indicator */}
      {isTranslating && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    Translating section {(activeJob.completedSections || 0) + 1} of {activeJob.totalSections}…
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {activeJob.completedSections}/{activeJob.totalSections}{" "}
                    sections • {activeJob.progress}%
                  </span>
                </div>
                <Progress value={activeJob.progress} className="h-2" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (activeJobId) {
                    cancelJob(activeJobId);
                    toast.info("Translation stopped");
                  }
                }}
              >
                <StopCircle className="w-3.5 h-3.5" /> Stop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You can navigate away — translation continues in the background.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats row (completed) */}
      {result && (
        <div className="grid grid-cols-5 gap-3">
          <StatCard
            icon={<FileText className="w-4 h-4" />}
            label="Sections"
            value={result.total_sections}
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            label="Confidence"
            value={`${Math.round(result.overall_confidence * 100)}%`}
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="BLEU"
            value={result.bleu_score?.toFixed(2) || "—"}
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Time"
            value={`${result.processing_time?.toFixed(1) || "—"}s`}
          />
          <StatCard
            icon={<BookOpen className="w-4 h-4" />}
            label="Legal Terms"
            value={result.statistics?.legal_terms_found || 0}
          />
        </div>
      )}

      {/* View toggle */}
      {result && (
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) =>
              setViewMode(v as "side-by-side" | "source" | "translated")
            }
          >
            <TabsList>
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="source">Source Only</TabsTrigger>
              <TabsTrigger value="translated">Translated Only</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main content area */}
      {result ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "side-by-side" ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {/* Source pane */}
          {viewMode !== "translated" && (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Source (
                  {langLabel[result.source_language] || result.source_language})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  {sourceSections.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {sourceSections.map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedSection === idx
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted",
                          )}
                          onClick={() => setSelectedSection(idx)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {sec.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              §{idx + 1}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {highlightGlossary(sec.content, "en")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.raw_source_text}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Translated pane */}
          {viewMode !== "source" && (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Translated (
                  {langLabel[result.target_language] || result.target_language})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  {translatedSections.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {translatedSections.map((sec, idx) => (
                        <div
                          key={sec.id || idx}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            selectedSection === idx
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted",
                          )}
                          onClick={() => setSelectedSection(idx)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {sec.type}
                            </Badge>
                            <Badge
                              className={cn(
                                "text-xs",
                                confidenceBadge(sec.confidence),
                              )}
                            >
                              {Math.round(sec.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {highlightGlossary(
                              sec.translated_content,
                              result.target_language as "si" | "ta",
                            )}
                          </p>
                          {sec.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sec.keywords.map((kw) => (
                                <Badge
                                  key={kw}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.raw_translated_text}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : !isTranslating && !error ? (
        <Card className="py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Preparing translation…</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Progressive section display while translating */}
      {isTranslating && !result && progressiveSourceSections.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Source pane */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Source ({langLabel[uploadData.sourceLanguage] || uploadData.sourceLanguage})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {progressiveSourceSections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedSection === idx
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted",
                      )}
                      onClick={() => setSelectedSection(idx)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {sec.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">§{idx + 1}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {highlightGlossary(sec.content, "en")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Translated pane — progressive */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Translated ({langLabel[uploadData.targetLanguage] || uploadData.targetLanguage})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {progressiveSourceSections.map((_, idx) => {
                    const translated = progressiveTranslatedSections[idx];
                    const isCurrentlyTranslating =
                      idx === (activeJob?.completedSections || 0) &&
                      idx < (activeJob?.totalSections || 0);

                    if (translated) {
                      return (
                        <div
                          key={translated.id || idx}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            selectedSection === idx
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted",
                          )}
                          onClick={() => setSelectedSection(idx)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {translated.type}
                            </Badge>
                            <Badge className={cn("text-xs", confidenceBadge(translated.confidence))}>
                              {Math.round(translated.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {highlightGlossary(
                              translated.translated_content,
                              uploadData.targetLanguage as "si" | "ta",
                            )}
                          </p>
                          {translated.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {translated.keywords.map((kw) => (
                                <Badge key={kw} variant="secondary" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (isCurrentlyTranslating) {
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-primary/30 bg-primary/5 animate-pulse"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="text-xs font-medium text-primary">
                              Translating section {idx + 1}…
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded w-full" />
                            <div className="h-3 bg-muted rounded w-4/5" />
                            <div className="h-3 bg-muted rounded w-3/5" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-dashed border-muted-foreground/20"
                      >
                        <span className="text-xs text-muted-foreground">
                          §{idx + 1} — Pending
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source text preview fallback (when translating, no source sections available) */}
      {isTranslating && !result && progressiveSourceSections.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Text</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-body">
                {uploadData.extractedText.slice(0, 3000)}
                {uploadData.extractedText.length > 3000 &&
                  "\n\n[… document continues]"}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

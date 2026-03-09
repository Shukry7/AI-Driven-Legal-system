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
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { normalizeSinhalaUnicode } from "@/lib/sinhalaUnicode";
import {
  downloadTranslationPdf,
  downloadTranslationTxt,
  downloadTranslationJson,
} from "@/lib/translationPdfService";
import { toast } from "sonner";
import { useTranslation } from "./TranslationContext";
import { getGlossary } from "@/config/api";
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

  // Scroll both panes to the selected section whenever it changes
  useEffect(() => {
    const prefixes = ["src-sec-", "trans-sec-", "prog-src-sec-", "prog-trans-sec-"];
    prefixes.forEach((prefix) => {
      const el = document.getElementById(`${prefix}${selectedSection}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [selectedSection]);
  const [viewMode, setViewMode] = useState<
    "side-by-side" | "source" | "translated"
  >("side-by-side");
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  // On mount, kick off translation (or show existing result, or resume in-progress job)
  useEffect(() => {
    if (existingResult) {
      setResult(existingResult);
      return;
    }
    
    // If resuming an in-progress job, just set the activeJobId - don't start a new translation
    if (uploadData.resumingJobId) {
      setActiveJobId(uploadData.resumingJobId);
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
    // Handle both 'failed' and 'stopped' status
    if (tracked.status === "failed" || tracked.status === "stopped") {
      // If we have partial sections, build a partial result instead of just showing error
      const partialSections = tracked.partialSections || [];
      if (partialSections.length > 0) {
        const partialResult: TranslationJobResult = {
          job_id: tracked.jobId,
          filename: tracked.filename,
          source_language: tracked.sourceLang,
          target_language: tracked.targetLang,
          mode: tracked.mode,
          status: tracked.status === "stopped" ? "stopped" : "partial",
          progress: tracked.progress,
          total_sections: tracked.totalSections,
          completed_sections: partialSections.length,
          created_at: new Date(tracked.startedAt).toISOString(),
          source_sections: tracked.sourceSections || [],
          translated_sections: partialSections,
          raw_source_text: tracked.sourceSections?.map(s => s.content).join("\n\n") || "",
          raw_translated_text: partialSections
            .map((s) => s.translated_content)
            .join("\n\n"),
          overall_confidence:
            partialSections.reduce((sum, s) => sum + (s.confidence || 0), 0) /
            Math.max(partialSections.length, 1),
          bleu_score: 0,
          processing_time: 0,
          model_used: "",
          statistics: {
            sections_translated: partialSections.length,
            total_words: 0,
            legal_terms_found: 0,
          },
        };
        setResult(partialResult);
        if (tracked.status === "stopped") {
          toast.info(
            `Translation stopped — showing ${partialSections.length} completed sections`,
          );
        } else {
          toast.warning(
            `Translation had issues — showing ${partialSections.length} completed sections`,
          );
        }
      } else if (tracked.status === "failed") {
        setError(tracked.error || "Translation failed");
        toast.error("Translation failed");
      } else {
        // Stopped with no sections
        toast.info("Translation stopped — no sections were completed");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, activeJobId]);

  // Load all glossary terms once
  useEffect(() => {
    getGlossary(undefined, undefined)
      .then((g) => setGlossaryTerms(g.terms || []))
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
  // Fall back to uploadData.sourceSections for resumed jobs
  const progressiveSourceSections = activeJob?.sourceSections || uploadData.sourceSections || [];
  const progressiveTranslatedSections = activeJob?.partialSections || [];

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async (format: string) => {
    if (!result) return;
    try {
      // Use client-side PDF generation for proper Sinhala/Tamil Unicode support
      if (format === "pdf") {
        await downloadTranslationPdf(result, true);
        toast.success("Exported as PDF");
      } else if (format === "txt") {
        downloadTranslationTxt(result, true);
        toast.success("Exported as TXT");
      } else if (format === "json") {
        downloadTranslationJson(result);
        toast.success("Exported as JSON");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed");
    }
  };

  // ── Highlight glossary terms in text ───────────────────────────────────
  // Helper: Check if character is a Sinhala script character (U+0D80–U+0DFF)
  // Also includes Zero-Width Joiner/Non-Joiner used in conjuncts
  const isSinhalaChar = (char: string) => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    // Sinhala range (U+0D80–U+0DFF) OR Zero-Width Joiner/Non-Joiner (used in conjuncts)
    return (code >= 0x0d80 && code <= 0x0dff) || code === 0x200d || code === 0x200c;
  };

  // Helper: Check if character is a Tamil script character (U+0B80–U+0BFF)
  // Also includes Zero-Width Joiner/Non-Joiner
  const isTamilChar = (char: string) => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    // Tamil range (U+0B80–U+0BFF) OR Zero-Width Joiner/Non-Joiner
    return (code >= 0x0b80 && code <= 0x0bff) || code === 0x200d || code === 0x200c;
  };

  // Helper: Check if character is part of a word in the given language
  const isWordChar = (char: string, lang: "en" | "si" | "ta") => {
    if (!char) return false;
    const code = char.charCodeAt(0);
    
    // Common combining marks and joiners that are part of words
    if (code === 0x200d || code === 0x200c) return true; // ZWJ, ZWNJ
    
    if (lang === "en") {
      return /[a-zA-Z]/.test(char);
    } else if (lang === "si") {
      return code >= 0x0d80 && code <= 0x0dff;
    } else if (lang === "ta") {
      return code >= 0x0b80 && code <= 0x0bff;
    }
    return false;
  };

  const highlightGlossary = (text: string, lang: "en" | "si" | "ta") => {
    if (!glossaryTerms.length || !text) return text;

    // Normalize Unicode to NFC form for consistent matching
    // Also apply Sinhala ZWJ normalization for proper conjunct display
    let normalizedText = text.normalize("NFC");
    if (lang === "si") {
      normalizedText = normalizeSinhalaUnicode(normalizedText);
    }

    // Collect all terms for this language, splitting semicolon-separated alternatives
    // and sorting longest-first to avoid partial matches
    const termEntries: { text: string; term: GlossaryTerm }[] = [];

    for (const t of glossaryTerms) {
      const rawTerm = t[lang];
      if (!rawTerm) continue;

      // Split by semicolon to handle alternative translations (e.g., "term1; term2")
      const variations = rawTerm
        .split(/[;]/)
        .map((v) => v.trim())
        .filter((v) => v.length >= 2);

      for (const variation of variations) {
        termEntries.push({ text: variation.normalize("NFC"), term: t });
      }
    }

    // Sort by length (longest first) to prioritize longer matches
    termEntries.sort((a, b) => b.text.length - a.text.length);

    if (!termEntries.length) return normalizedText;

    // Find all match positions (non-overlapping, longest-first)
    const matches: { start: number; end: number; term: GlossaryTerm }[] = [];
    
    // For case-insensitive matching (primarily for English)
    const textLower = normalizedText.toLowerCase();

    for (const entry of termEntries) {
      const termNormalized = entry.text;
      const termLower = termNormalized.toLowerCase();

      // Skip very short terms that might cause too many false positives
      if (termNormalized.length < 3) continue;

      let searchFrom = 0;
      while (searchFrom < textLower.length) {
        // Case-insensitive search
        const idx = textLower.indexOf(termLower, searchFrom);
        if (idx === -1) break;

        const end = idx + termNormalized.length;
        const charBefore = idx > 0 ? normalizedText[idx - 1] : "";
        const charAfter = end < normalizedText.length ? normalizedText[end] : "";

        let isValidBoundary = true;

        // Check word boundaries - term must be surrounded by non-word characters for that language
        const isWordBoundaryBefore = !charBefore || !isWordChar(charBefore, lang);
        const isWordBoundaryAfter = !charAfter || !isWordChar(charAfter, lang);
        isValidBoundary = isWordBoundaryBefore && isWordBoundaryAfter;

        if (!isValidBoundary) {
          searchFrom = idx + 1;
          continue;
        }

        // Check no overlap with existing matches
        const overlaps = matches.some((m) => idx < m.end && end > m.start);
        if (!overlaps) {
          matches.push({ start: idx, end, term: entry.term });
        }
        searchFrom = idx + 1;
      }
    }

    if (matches.length === 0) return normalizedText;

    // Sort by position
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
    if (cursor < normalizedText.length)
      parts.push(normalizedText.slice(cursor));
    return <>{parts}</>;
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={onBack}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Translations
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          Translation Workspace
        </span>
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
                    Translating section {(activeJob.completedSections || 0) + 1}{" "}
                    of {activeJob.totalSections}…
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
            tooltip="Model confidence: the average probability the model assigned to each output token during beam search. Higher means the model was more certain about its word choices. ≥85% = high, 60–84% = moderate, <60% = low."
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="BLEU"
            value={result.bleu_score?.toFixed(2) || "—"}
            tooltip="BLEU (Bilingual Evaluation Understudy): a standard MT quality metric that measures n-gram overlap between the translation and reference text. Derived from confidence here since no reference is available. 0–1 scale; scores above 0.6 are considered good for legal text."
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
                          id={`src-sec-${idx}`}
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
                          id={`trans-sec-${idx}`}
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
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className={cn(
                                      "text-xs cursor-help",
                                      confidenceBadge(sec.confidence),
                                    )}
                                  >
                                    {Math.round(sec.confidence * 100)}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
                                  Model confidence for this section — average token probability during beam search.
                                  {sec.confidence >= 0.85 ? " High quality output expected." : sec.confidence >= 0.6 ? " Review recommended for critical text." : " Low confidence — manual review advised."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {highlightGlossary(
                              sec.translated_content,
                              result.target_language as "si" | "ta",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.target_language === "si"
                          ? normalizeSinhalaUnicode(result.raw_translated_text || "")
                          : result.raw_translated_text}
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
                Source (
                {langLabel[uploadData.sourceLanguage] ||
                  uploadData.sourceLanguage}
                )
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {progressiveSourceSections.map((sec, idx) => (
                    <div
                      id={`prog-src-sec-${idx}`}
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
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Translated pane — progressive */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Translated (
                {langLabel[uploadData.targetLanguage] ||
                  uploadData.targetLanguage}
                )
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
                          id={`prog-trans-sec-${idx}`}
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
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {translated.type}
                            </Badge>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className={cn(
                                      "text-xs cursor-help",
                                      confidenceBadge(translated.confidence),
                                    )}
                                  >
                                    {Math.round(translated.confidence * 100)}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
                                  Model confidence for this section — average token probability during beam search.
                                  {translated.confidence >= 0.85 ? " High quality output expected." : translated.confidence >= 0.6 ? " Review recommended for critical text." : " Low confidence — manual review advised."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {highlightGlossary(
                              translated.translated_content,
                              uploadData.targetLanguage as "si" | "ta",
                            )}
                          </p>
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
                        className="p-3 rounded-lg border border-dashed border-muted-foreground/20 flex items-center justify-between"
                      >
                        <span className="text-xs text-muted-foreground">
                          §{idx + 1} — Pending
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            if (!activeJobId) return;
                            try {
                              const fd = new FormData();
                              fd.append("section_index", String(idx));
                              await fetch(
                                `${import.meta.env.VITE_API_BASE_URL || ""}/api/translate/skip-section/${activeJobId}`,
                                { method: "POST", body: fd },
                              );
                              toast.info(`Section ${idx + 1} will be skipped`);
                            } catch {
                              toast.error("Failed to skip section");
                            }
                          }}
                        >
                          <SkipForward className="w-3 h-3" /> Skip
                        </Button>
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
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip?: string;
}) {
  const content = (
    <Card className={tooltip ? "cursor-help" : ""}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-72 text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { useState, useEffect } from "react";
import { TranslationEntry } from "./TranslationEntry";
import { DocumentUpload } from "./DocumentUpload";
import { TranslationWorkspace } from "./TranslationWorkspace";
import { ComparisonView } from "./ComparisonView";
import { GlossaryPanel } from "./GlossaryPanel";
import { TranslationSummary } from "./TranslationSummary";
import { ModelInsights } from "./ModelInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, GitCompare, BookOpen, BarChart3 } from "lucide-react";
import { useTranslation } from "./TranslationContext";
import type { TranslationJobResult } from "@/config/api";

type View = "entry" | "upload" | "workspace" | "summary";

export interface UploadData {
  file?: File;
  text?: string;
  sourceLanguage: string;
  targetLanguage: string;
  extractedText: string;
  mode: "document" | "text";
  /** If provided, we're resuming an in-progress job, not starting a new one */
  resumingJobId?: string;
  /** Source sections from an in-progress job */
  sourceSections?: Array<{ id?: string; type: string; content: string }>;
}

export function TranslationModule() {
  const [currentView, setCurrentView] = useState<View>("entry");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [translationResult, setTranslationResult] =
    useState<TranslationJobResult | null>(null);
  const [activeTab, setActiveTab] = useState("translate");
  const { viewingJobId, setViewingJobId, getResult, resumeJob, jobs } = useTranslation();

  // When the floating widget triggers viewing a job (completed or in-progress)
  useEffect(() => {
    if (!viewingJobId) return;
    (async () => {
      // First check if this is an in-progress job we already track
      const tracked = jobs.find((j) => j.jobId === viewingJobId);

      if (tracked && (tracked.status === "processing" || tracked.status === "uploading")) {
        // In-progress job: navigate to workspace with the job's source data
        // Pass resumingJobId so TranslationWorkspace knows NOT to start a new translation
        const extractedText = tracked.sourceSections?.map((s) => s.content).join("\n\n") || "";
        setTranslationResult(null);
        setUploadData({
          sourceLanguage: tracked.sourceLang,
          targetLanguage: tracked.targetLang,
          extractedText,
          mode: tracked.mode,
          resumingJobId: tracked.jobId,
          sourceSections: tracked.sourceSections,
        });
        setCurrentView("workspace");
        setViewingJobId(null);
        return;
      }

      // Handle stopped jobs with partial results
      if (tracked && tracked.status === "stopped") {
        const partialSections = tracked.partialSections || [];
        if (partialSections.length > 0) {
          // Build partial result from tracked data
          const partialResult: TranslationJobResult = {
            job_id: tracked.jobId,
            filename: tracked.filename,
            source_language: tracked.sourceLang,
            target_language: tracked.targetLang,
            mode: tracked.mode,
            status: "stopped",
            progress: tracked.progress,
            total_sections: tracked.totalSections,
            completed_sections: partialSections.length,
            created_at: new Date(tracked.startedAt).toISOString(),
            source_sections: tracked.sourceSections || [],
            translated_sections: partialSections,
            raw_source_text: tracked.sourceSections?.map(s => s.content).join("\n\n") || "",
            raw_translated_text: partialSections.map(s => s.translated_content).join("\n\n"),
            overall_confidence: partialSections.reduce((sum, s) => sum + (s.confidence || 0), 0) / Math.max(partialSections.length, 1),
            bleu_score: 0,
            processing_time: 0,
            model_used: "",
            statistics: {
              sections_translated: partialSections.length,
              total_words: 0,
              legal_terms_found: 0,
            },
          };
          setTranslationResult(partialResult);
          setUploadData({
            sourceLanguage: tracked.sourceLang,
            targetLanguage: tracked.targetLang,
            extractedText: tracked.sourceSections?.map(s => s.content).join("\n\n") || "",
            mode: tracked.mode,
            sourceSections: tracked.sourceSections,
          });
          setCurrentView("workspace");
        }
        setViewingJobId(null);
        return;
      }

      // Completed job: fetch full result
      const result = await getResult(viewingJobId);
      if (result) {
        // If job is still processing, treat as resume
        if (result.status === "processing" || result.status === "pending") {
          const resumed = await resumeJob(viewingJobId);
          setTranslationResult(null);
          setUploadData({
            sourceLanguage: result.source_language,
            targetLanguage: result.target_language,
            extractedText: result.raw_source_text || result.source_sections?.map((s) => s.content).join("\n\n") || "",
            mode: result.mode as "document" | "text",
            resumingJobId: viewingJobId,
            sourceSections: (resumed?.sourceSections || result.source_sections || []) as Array<{ id?: string; type: string; content: string }>,
          });
        } else {
          setTranslationResult(result);
          setUploadData({
            sourceLanguage: result.source_language,
            targetLanguage: result.target_language,
            extractedText:
              result.raw_source_text ||
              result.source_sections?.map((s) => s.content).join("\n\n") ||
              "",
            mode: result.mode as "document" | "text",
          });
        }
        setCurrentView("workspace");
      }
      setViewingJobId(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingJobId]);

  const handleStartNew = () => setCurrentView("upload");

  const handleProceed = (data: UploadData) => {
    setUploadData(data);
    setTranslationResult(null);
    setCurrentView("workspace");
  };

  const handleTranslationComplete = (result: TranslationJobResult) => {
    setTranslationResult(result);
  };

  const handleComplete = () => setCurrentView("summary");

  const handleFinish = () => {
    setCurrentView("entry");
    setUploadData(null);
    setTranslationResult(null);
  };

  // ── Entry view with tabs
  if (currentView === "entry") {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="translate" className="gap-2">
              <FileText className="w-4 h-4" />
              Translations
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="glossary" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Glossary
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Model Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translate" className="mt-6">
            <TranslationEntry
              onStartNew={handleStartNew}
              onSelectJob={async (id) => {
                // Check if already tracked in context (current session)
                const contextJob = jobs.find((j) => j.jobId === id);
                if (contextJob && (contextJob.status === "processing" || contextJob.status === "uploading")) {
                  setViewingJobId(id);
                  return;
                }

                const r = await getResult(id);
                if (!r) return;

                // Processing/pending: adopt into context and resume
                if (r.status === "processing" || r.status === "pending") {
                  const resumed = await resumeJob(id);
                  setTranslationResult(null);
                  setUploadData({
                    sourceLanguage: r.source_language,
                    targetLanguage: r.target_language,
                    extractedText: r.raw_source_text || r.source_sections?.map((s) => s.content).join("\n\n") || "",
                    mode: r.mode as "document" | "text",
                    resumingJobId: id,
                    sourceSections: (resumed?.sourceSections || r.source_sections || []) as Array<{ id?: string; type: string; content: string }>,
                  });
                  setCurrentView("workspace");
                  return;
                }

                // Completed / stopped / failed: show result
                setTranslationResult(r);
                setUploadData({
                  sourceLanguage: r.source_language,
                  targetLanguage: r.target_language,
                  extractedText: r.raw_source_text || r.source_sections?.map((s) => s.content).join("\n\n") || "",
                  mode: r.mode as "document" | "text",
                  sourceSections: r.source_sections as Array<{ id?: string; type: string; content: string }> | undefined,
                });
                setCurrentView("workspace");
              }}
            />
          </TabsContent>
          <TabsContent value="compare" className="mt-6">
            <ComparisonView onBack={() => setActiveTab("translate")} />
          </TabsContent>
          <TabsContent value="glossary" className="mt-6">
            <GlossaryPanel onBack={() => setActiveTab("translate")} />
          </TabsContent>
          <TabsContent value="insights" className="mt-6">
            <ModelInsights onBack={() => setActiveTab("translate")} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (currentView === "upload") {
    return (
      <DocumentUpload
        onProceed={handleProceed}
        onCancel={() => setCurrentView("entry")}
      />
    );
  }

  if (currentView === "workspace" && uploadData) {
    return (
      <TranslationWorkspace
        uploadData={uploadData}
        existingResult={translationResult}
        onBack={() => setCurrentView("entry")}
        onComplete={handleComplete}
        onTranslationComplete={handleTranslationComplete}
      />
    );
  }

  if (currentView === "summary") {
    return (
      <TranslationSummary
        translationResult={translationResult}
        onComplete={handleFinish}
        onBack={() => setCurrentView("workspace")}
      />
    );
  }

  return null;
}

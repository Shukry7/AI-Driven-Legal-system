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
}

export function TranslationModule() {
  const [currentView, setCurrentView] = useState<View>("entry");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [translationResult, setTranslationResult] =
    useState<TranslationJobResult | null>(null);
  const [activeTab, setActiveTab] = useState("translate");
  const { viewingJobId, setViewingJobId, getResult, jobs } = useTranslation();

  // When the floating widget triggers viewing a job (completed or in-progress)
  useEffect(() => {
    if (!viewingJobId) return;
    (async () => {
      // First check if this is an in-progress job we already track
      const tracked = jobs.find((j) => j.jobId === viewingJobId);

      if (tracked && (tracked.status === "processing" || tracked.status === "uploading")) {
        // In-progress job: navigate to workspace with the job's source data
        const extractedText = tracked.sourceSections?.map((s) => s.content).join("\n\n") || "";
        setTranslationResult(null);
        setUploadData({
          sourceLanguage: tracked.sourceLang,
          targetLanguage: tracked.targetLang,
          extractedText,
          mode: tracked.mode,
        });
        setCurrentView("workspace");
        setViewingJobId(null);
        return;
      }

      // Completed job: fetch full result
      const result = await getResult(viewingJobId);
      if (result) {
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
                const r = await getResult(id);
                if (r) {
                  setTranslationResult(r);
                  setUploadData({
                    sourceLanguage: r.source_language,
                    targetLanguage: r.target_language,
                    extractedText: r.raw_source_text || "",
                    mode: r.mode as "document" | "text",
                  });
                  setCurrentView("workspace");
                }
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

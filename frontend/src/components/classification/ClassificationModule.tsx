import { useState } from "react";
import { ClassificationEntry } from "./ClassificationEntry";
import { ClassificationDocumentUpload } from "./ClassificationDocumentUpload";
import { ClassificationWorkspace } from "./ClassificationWorkspace";
import { ClassificationSummary } from "./ClassificationSummary";
import { ClassificationModelInsights } from "./ClassificationModelInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, History, BarChart3 } from "lucide-react";
import { useClassification } from "./ClassificationContext";
import type { ClassificationResult } from "@/config/api";

type View = "entry" | "upload" | "workspace" | "summary";

export interface UploadData {
  file?: File;
  text?: string;
  mode: "document" | "text";
}

export function ClassificationModule() {
  const [currentView, setCurrentView] = useState<View>("entry");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [classificationResult, setClassificationResult] =
    useState<ClassificationResult | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [activeTab, setActiveTab] = useState("classify");
  const { loadClassification, recentClassifications } = useClassification();

  const handleStartNew = () => setCurrentView("upload");

  const handleSelectRecent = async (id: string) => {
    const result = await loadClassification(id);
    if (result) {
      setClassificationResult(result);
      const recent = recentClassifications.find((r) => r.id === id);
      setFilename(recent?.filename || "Unknown");
      setCurrentView("workspace");
    }
  };

  const handleProceed = (data: UploadData) => {
    setUploadData(data);
    setFilename(data.file?.name || "Manual Text Input");
    setClassificationResult(null);
    setCurrentView("workspace");
  };

  const handleClassificationComplete = (result: ClassificationResult) => {
    setClassificationResult(result);
  };

  const handleViewSummary = () => setCurrentView("summary");

  const handleFinish = () => {
    setCurrentView("entry");
    setUploadData(null);
    setClassificationResult(null);
    setFilename("");
  };

  const handleCancel = () => {
    setCurrentView("entry");
    setUploadData(null);
    setClassificationResult(null);
    setFilename("");
  };

  // ── Entry view with tabs
  if (currentView === "entry") {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="classify" className="gap-2">
              <FileText className="w-4 h-4" />
              <span>New Classification</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <History className="w-4 h-4" />
              <span>Recent Results</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Model Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classify" className="mt-6">
            <ClassificationEntry
              onStartNew={handleStartNew}
              onSelectRecent={handleSelectRecent}
              showRecentSection={false}
            />
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <ClassificationEntry
              onStartNew={handleStartNew}
              onSelectRecent={handleSelectRecent}
              showRecentSection={true}
            />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <ClassificationModelInsights
              onBack={() => setActiveTab("classify")}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (currentView === "upload") {
    return (
      <ClassificationDocumentUpload
        onProceed={handleProceed}
        onCancel={handleCancel}
      />
    );
  }

  if (currentView === "workspace") {
    return (
      <ClassificationWorkspace
        file={uploadData?.file}
        text={uploadData?.text}
        mode={uploadData?.mode}
        existingResult={classificationResult}
        filename={filename}
        onComplete={handleClassificationComplete}
        onViewSummary={handleViewSummary}
        onCancel={handleCancel}
      />
    );
  }

  if (currentView === "summary" && classificationResult) {
    return (
      <ClassificationSummary
        classificationResult={classificationResult}
        filename={filename}
        onComplete={handleFinish}
        onBack={() => setCurrentView("workspace")}
      />
    );
  }

  return null;
}

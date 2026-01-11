import { useState } from "react";
import { ClassificationEntry } from "./ClassificationEntry";
import { ClassificationDocumentUpload } from "./ClassificationDocumentUpload";
import { ClassificationWorkspace } from "./ClassificationWorkspace";

type View = "entry" | "upload" | "workspace";

interface UploadData {
  file: File;
}

// Mock data for saved analyses
const savedAnalyses: Record<string, UploadData> = {
  "1": {
    file: new File([""], "Supreme Court Judgment - Civil Appeal 2023-45.pdf", {
      type: "application/pdf",
    }),
  },
  "2": {
    file: new File([""], "District Court - Contract Dispute Case.pdf", {
      type: "application/pdf",
    }),
  },
  "3": {
    file: new File([""], "High Court - Property Rights Matter.pdf", {
      type: "application/pdf",
    }),
  },
};

export function ClassificationModule() {
  const [currentView, setCurrentView] = useState<View>("entry");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);

  const handleStartNew = () => setCurrentView("upload");

  const handleSelectJob = (id: string) => {
    // Load the saved analysis data
    const savedData = savedAnalyses[id];
    if (savedData) {
      setUploadData(savedData);
      setCurrentView("workspace");
    }
  };

  const handleProceed = (data: UploadData) => {
    setUploadData(data);
    setCurrentView("workspace");
  };

  const handleComplete = () => {
    // In production, this would save the analysis results
    setCurrentView("entry");
    setUploadData(null);
  };

  const handleCancel = () => {
    setCurrentView("entry");
    setUploadData(null);
  };

  if (currentView === "entry") {
    return (
      <ClassificationEntry
        onStartNew={handleStartNew}
        onSelectJob={handleSelectJob}
      />
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

  if (currentView === "workspace" && uploadData) {
    return (
      <ClassificationWorkspace
        file={uploadData.file}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  return null;
}

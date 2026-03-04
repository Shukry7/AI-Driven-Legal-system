import { useState } from "react";
import { ClassificationEntry } from "./ClassificationEntry";
import { ClassificationDocumentUpload } from "./ClassificationDocumentUpload";
import { ClassificationWorkspace } from "./ClassificationWorkspace";

type View = "entry" | "upload" | "workspace";

interface UploadData {
  file: File;
}

interface FileData {
  id: string;
  filename: string;
  uploadDate: string;
  pages: number;
  extractedText: string;
}

// Mock OCR-processed files data
const ocrFiles: Record<string, FileData> = {
  "1": {
    id: "1",
    filename: "Supreme Court Judgment - Civil Appeal 2023-45.pdf",
    uploadDate: "2024-01-15",
    pages: 12,
    extractedText: `IN THE SUPREME COURT OF THE DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA

SC APPEAL NO. 15/2023

In the matter of an Appeal from the Judgment of the Court of Appeal

BETWEEN:
JOHN PERERA
Plaintiff-Appellant

AND:
SILVA ENTERPRISES (PRIVATE) LIMITED
Defendant-Respondent

JUDGMENT

This Appeal arises from a commercial dispute concerning breach of contract and damages claimed by the Plaintiff-Appellant against the Defendant-Respondent. The Plaintiff entered into a contract with the Defendant on 15th January 2021 for the supply of construction materials. The Defendant failed to deliver the materials within the agreed timeframe, causing significant financial losses to the Plaintiff. The Plaintiff claims damages amounting to Rs. 5,000,000 for breach of contract. The Defendant admits the delay but disputes the quantum of damages.`,
  },
  "2": {
    id: "2",
    filename: "District Court - Contract Dispute Case.pdf",
    uploadDate: "2024-01-14",
    pages: 8,
    extractedText:
      "Sample judgment text for District Court contract dispute case...",
  },
  "3": {
    id: "3",
    filename: "High Court - Property Rights Matter.pdf",
    uploadDate: "2024-01-12",
    pages: 15,
    extractedText:
      "Sample judgment text for High Court property rights matter...",
  },
  "4": {
    id: "4",
    filename: "Commercial Arbitration Award 2024.pdf",
    uploadDate: "2024-01-10",
    pages: 20,
    extractedText: "Sample arbitration award text...",
  },
  "5": {
    id: "5",
    filename: "Land Dispute Settlement Order.pdf",
    uploadDate: "2024-01-08",
    pages: 6,
    extractedText: "Sample land dispute settlement order text...",
  },
};

export function ClassificationModule() {
  const [currentView, setCurrentView] = useState<View>("entry");
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(
    null,
  );

  const handleStartNew = () => setCurrentView("upload");

  const handleSelectFile = (id: string) => {
    // Load the OCR-processed file data
    const fileData = ocrFiles[id];
    if (fileData) {
      setSelectedFileData(fileData);
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
    setSelectedFileData(null);
  };

  const handleCancel = () => {
    setCurrentView("entry");
    setUploadData(null);
    setSelectedFileData(null);
  };

  if (currentView === "entry") {
    return (
      <ClassificationEntry
        onStartNew={handleStartNew}
        onSelectFile={handleSelectFile}
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

  if (currentView === "workspace") {
    // Handle both uploaded files and selected OCR files
    if (uploadData) {
      return (
        <ClassificationWorkspace
          file={uploadData.file}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );
    }

    if (selectedFileData) {
      return (
        <ClassificationWorkspace
          fileData={selectedFileData}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );
    }
  }

  return null;
}

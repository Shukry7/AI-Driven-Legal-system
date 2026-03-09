import { useState } from "react";
import {
  AlertCircle,
  Upload,
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  AlertOctagon,
  Trash2,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useClassification } from "./ClassificationContext";
import { UploadedFilesDialog } from "./UploadedFilesDialog";

interface ClassificationEntryProps {
  onStartNew: () => void;
  onSelectRecent: (id: string) => void;
  onProcessUploaded?: (filename: string) => void;
  showRecentSection: boolean;
}

export function ClassificationEntry({
  onStartNew,
  onSelectRecent,
  onProcessUploaded,
  showRecentSection,
}: ClassificationEntryProps) {
  const { recentClassifications, deleteClassification } = useClassification();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadedFilesDialogOpen, setUploadedFilesDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    filename: string;
  } | null>(null);

  const handleDeleteClick = (
    e: React.MouseEvent,
    id: string,
    filename: string,
  ) => {
    e.stopPropagation(); // Prevent card click
    setItemToDelete({ id, filename });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteClassification(itemToDelete.id);
      toast({
        title: "Classification deleted",
        description: `"${itemToDelete.filename}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete classification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "high":
        return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Shield className="w-4 h-4 text-green-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="w-6 h-6 text-accent" />
            Legal Risk Classification
          </CardTitle>
          <CardDescription>
            AI-powered clause segmentation and risk assessment for Sri Lankan
            civil court judgments using fine-tuned Legal-BERT models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onStartNew} size="lg" className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Upload & Classify New Document
            </Button>
            {onProcessUploaded && (
              <Button
                onClick={() => setUploadedFilesDialogOpen(true)}
                size="lg"
                variant="outline"
                className="flex-1"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Process Uploaded Files
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Classifications or OCR Files */}
      {showRecentSection ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Classifications
            </CardTitle>
            <CardDescription>
              View and analyze your previously classified documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentClassifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No classifications yet</p>
                <p className="text-sm mt-1">Upload a document to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClassifications.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors group"
                  >
                    <div
                      onClick={() => onSelectRecent(item.id)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {item.filename}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()} •{" "}
                          {item.totalClauses} clauses
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {item.riskSummary.high > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor("high")}`}
                          >
                            {getRiskIcon("high")}
                            {item.riskSummary.high}
                          </div>
                        )}
                        {item.riskSummary.medium > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor("medium")}`}
                          >
                            {getRiskIcon("medium")}
                            {item.riskSummary.medium}
                          </div>
                        )}
                        {item.riskSummary.low > 0 && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor("low")}`}
                          >
                            {getRiskIcon("low")}
                            {item.riskSummary.low}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) =>
                          handleDeleteClick(e, item.id, item.filename)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              Quick Start Options
            </CardTitle>
            <CardDescription>
              Choose how you want to begin your analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="p-4 border rounded-lg bg-accent/5">
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-1">Upload New Document</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a PDF or TXT file for immediate classification
                    </p>
                    <Button onClick={onStartNew} size="sm">
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-1">Recent Classifications</h3>
                    <p className="text-sm text-muted-foreground">
                      View and analyze your previously classified documents
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Stage 1: Clause Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Token-level classification using BIO tagging to split complex
              legal sentences into meaningful clause units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Stage 2: Risk Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Semantic analysis to categorize each clause as High, Medium, or
              Low risk based on legal implications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classification?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.filename}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Uploaded Files Dialog */}
      {onProcessUploaded && (
        <UploadedFilesDialog
          open={uploadedFilesDialogOpen}
          onOpenChange={setUploadedFilesDialogOpen}
          onSelectFile={(filename) => {
            onProcessUploaded(filename);
            setUploadedFilesDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

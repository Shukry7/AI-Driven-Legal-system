import { useState, useEffect } from "react";
import { FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUploadedPdfs } from "@/config/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadedFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (filename: string) => void;
}

interface UploadedFile {
  filename: string;
  size: number;
  modified: number;
  path: string;
}

export function UploadedFilesDialog({
  open,
  onOpenChange,
  onSelectFile,
}: UploadedFilesDialogProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listUploadedPdfs();
      setFiles(response.files);
    } catch (err: any) {
      console.error("Error loading uploaded files:", err);
      setError(err.message || "Failed to load uploaded files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const handleFileClick = (filename: string) => {
    onSelectFile(filename);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Uploaded PDF Files</DialogTitle>
          <DialogDescription>
            Select a PDF file from the uploads directory to classify
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                Loading files...
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={loadFiles}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No PDF files found in uploads directory
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload files first to see them here
              </p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <Card
                  key={file.filename}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleFileClick(file.filename)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {file.filename}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{formatDate(file.modified)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(file.filename);
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

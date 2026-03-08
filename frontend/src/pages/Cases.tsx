import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { listDatabaseDocuments, getDatabaseDocument } from "@/config/api";
import { FileText, Download, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CaseFile {
  file_id: string;
  filename: string;
  upload_date: string;
  length?: number;
}

export default function CasesPage() {
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCaseFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listDatabaseDocuments(50, 0);
        setCaseFiles(response.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load case files");
        console.error("Error fetching case files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseFiles();
  }, []);

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      setDownloading(fileId);
      const blob = await getDatabaseDocument(fileId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading document:", err);
      alert("Failed to download document");
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule="cases" onModuleChange={() => {}} />

      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Case Files
            </h1>
            <p className="text-muted-foreground mt-1">
              View and download all documents stored in the database
            </p>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading case files...</p>
              </div>
            </div>
          ) : caseFiles.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    No case files found
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Save documents from the Clause Detection module to view them here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                Found {caseFiles.length} case file{caseFiles.length !== 1 ? "s" : ""}
              </div>
              {caseFiles.map((file) => (
                <Card key={file.file_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg break-words">
                            {file.filename}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {formatDate(file.upload_date)}
                            {file.length && (
                              <>
                                {" • "}
                                {formatFileSize(file.length)}
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        Stored
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleDownload(file.file_id, file.filename)}
                      disabled={downloading === file.file_id}
                      className="gap-2"
                    >
                      {downloading === file.file_id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

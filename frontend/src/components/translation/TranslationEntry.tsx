/**
 * TranslationEntry
 * ────────────────
 * Dashboard landing for the translation tab.
 * Shows stats, recent translation history with pagination/filters/delete, and a prominent "Start New Translation" CTA.
 */
import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  Download,
  Eye,
  AlertCircle,
  Languages,
  XCircle,
  Search,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { getTranslationHistory, exportTranslation, deleteTranslationJob } from "@/config/api";
import type { TranslationJobSummary } from "@/config/api";
import { toast } from "sonner";

interface TranslationEntryProps {
  onStartNew: () => void;
  onSelectJob: (jobId: string) => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  completed: {
    label: "Completed",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  pending: {
    label: "Pending",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <Clock className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const langLabel: Record<string, string> = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
};

export function TranslationEntry({
  onStartNew,
  onSelectJob,
}: TranslationEntryProps) {
  const [jobs, setJobs] = useState<TranslationJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [langFilter, setLangFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, langFilter, pageSize]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getTranslationHistory();
      setJobs(data.jobs || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = !searchQuery.trim() ||
      job.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesLang = langFilter === "all" || job.target_language === langFilter;
    return matchesSearch && matchesStatus && matchesLang;
  });

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const completedJobs = jobs.filter((j) => j.status === "completed");
  const activeJobs = jobs.filter(
    (j) => j.status === "processing" || j.status === "pending",
  );
  const failedJobs = jobs.filter((j) => j.status === "failed");

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setDeleteJobId(jobId);
  };

  const confirmDelete = async () => {
    if (!deleteJobId) return;
    try {
      await deleteTranslationJob(deleteJobId);
      setJobs((prev) => prev.filter((j) => j.job_id !== deleteJobId));
      toast.success("Translation deleted");
    } catch {
      toast.error("Failed to delete translation");
    } finally {
      setDeleteJobId(null);
    }
  };

  const handleDownload = async (
    e: React.MouseEvent,
    jobId: string,
    filename: string,
  ) => {
    e.stopPropagation();
    try {
      const blob = await exportTranslation(jobId, "txt");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename || "translation"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4 px-5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{jobs.length}</p>
              <p className="text-xs text-muted-foreground">
                Total Translations
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4 px-5">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedJobs.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4 px-5">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeJobs.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4 px-5">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failedJobs.length}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-5 px-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Start a New Translation
              </p>
              <p className="text-sm text-muted-foreground">
                Upload a document or paste text for EN → Sinhala / Tamil
                translation
              </p>
            </div>
          </div>
          <Button onClick={onStartNew} className="gap-2">
            <Plus className="w-4 h-4" /> New Translation
          </Button>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Translation History</CardTitle>
            <CardDescription>All translation jobs</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadHistory}
            className="gap-1"
          >
            <Loader2 className={cn("w-3 h-3", loading && "animate-spin")} />{" "}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9">
                <Filter className="w-3.5 h-3.5 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={langFilter} onValueChange={setLangFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="si">Sinhala</SelectItem>
                <SelectItem value="ta">Tamil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium mb-1">
                No translations yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first translation
              </p>
              <Button onClick={onStartNew} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> New Translation
              </Button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No translations match your filters</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setLangFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
            <div className="divide-y">
              {paginatedJobs.map((job) => {
                const s = statusConfig[job.status] || statusConfig.pending;
                return (
                  <div
                    key={job.job_id}
                    className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => onSelectJob(job.job_id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {job.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {langLabel[job.source_language] ||
                            job.source_language}{" "}
                          →{" "}
                          {langLabel[job.target_language] ||
                            job.target_language}
                          {" • "}
                          {job.mode === "text" ? "Text" : "Document"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge className={cn("text-xs gap-1", s.color)}>
                        {s.icon} {s.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-36 text-right">
                        {formatDate(job.created_at)}
                      </span>
                      {job.processing_time > 0 && (
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {job.processing_time.toFixed(1)}s
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectJob(job.job_id);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {job.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) =>
                              handleDownload(e, job.job_id, job.filename)
                            }
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDelete(e, job.job_id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredJobs.length)} of {filteredJobs.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteJobId !== null} onOpenChange={(open) => !open && setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Translation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this translation? This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

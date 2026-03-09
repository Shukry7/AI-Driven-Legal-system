/**
 * TranslationFloatingWidget
 * ─────────────────────────
 * A persistent floating panel fixed in the bottom-right corner.
 * Shows every in-flight and recently completed translation job
 * with a live progress bar.  Clicking a completed job navigates
 * the user to the translation workspace / result view.
 *
 * Renders on top of *any* page — completely decoupled from route.
 */
import { useState } from "react";
import {
  Languages,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation, type TrackedJob } from "./TranslationContext";

export function TranslationFloatingWidget() {
  const { jobs, activeCount, dismissJob, setViewingJobId } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [minimised, setMinimised] = useState(false);

  // Show only non-dismissed + recently completed (last 10 min) + active
  const visible = jobs.filter((j) => {
    if (j.dismissed) return false;
    if (j.status === "processing" || j.status === "uploading") return true;
    if (j.status === "completed" || j.status === "failed" || j.status === "stopped") {
      return Date.now() - j.startedAt < 10 * 60 * 1000;
    }
    return false;
  });

  if (visible.length === 0) return null;

  if (minimised) {
    return (
      <button
        onClick={() => setMinimised(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium">
          {activeCount > 0 ? `Translating (${activeCount})` : "Translations"}
        </span>
        {activeCount > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Translation Jobs</span>
          {activeCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setMinimised(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Job list */}
      {expanded && (
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {visible.map((job) => (
            <JobRow
              key={job.jobId}
              job={job}
              onDismiss={dismissJob}
              onView={setViewingJobId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual job row ───────────────────────────────────────────────────

function JobRow({
  job,
  onDismiss,
  onView,
}: {
  job: TrackedJob;
  onDismiss: (id: string) => void;
  onView: (id: string | null) => void;
}) {
  const langLabel: Record<string, string> = { en: "EN", si: "SI", ta: "TA" };
  const isActive = job.status === "processing" || job.status === "uploading";

  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {job.mode === "document" ? (
            <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <Type className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{job.filename}</p>
            <p className="text-xs text-muted-foreground">
              {langLabel[job.sourceLang] || job.sourceLang} →{" "}
              {langLabel[job.targetLang] || job.targetLang}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(job.status === "completed" || job.status === "stopped" || isActive) && (
            <button
              onClick={() => onView(job.jobId)}
              className="p-1 rounded hover:bg-accent/20 transition-colors"
              title={isActive ? "View progress" : "View result"}
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
            </button>
          )}
          {!isActive && (
            <button
              onClick={() => onDismiss(job.jobId)}
              className="p-1 rounded hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {job.status === "uploading" ? "Uploading…" : `Translating…`}
            </span>
            <span>
              {job.completedSections}/{job.totalSections || "?"} sections •{" "}
              {job.progress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed */}
      {job.status === "completed" && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed — click to view</span>
        </div>
      )}

      {/* Failed */}
      {job.status === "failed" && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="truncate">{job.error || "Translation failed"}</span>
        </div>
      )}

      {/* Stopped */}
      {job.status === "stopped" && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Stopped — {(job.partialSections?.length || 0) > 0 ? "click to view partial result" : "no sections completed"}</span>
        </div>
      )}
    </div>
  );
}

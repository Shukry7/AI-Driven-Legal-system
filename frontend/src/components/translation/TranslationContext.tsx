/**
 * TranslationContext
 * ─────────────────
 * Global state that tracks every in-flight (and recently finished) translation
 * job.  Any component can call `startDocumentJob` / `startTextJob`; the context
 * polls `/api/translate/progress/:id` every 2 s and notifies subscribers.
 *
 * The <TranslationFloatingWidget /> reads this context to render the corner
 * popup so the user can roam freely across pages while translations run.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getTranslationProgress,
  getTranslationJob,
  translateDocument,
  translateText,
} from "@/config/api";
import type {
  TranslationStartResult,
  TranslationJobResult,
  TranslationProgress,
  TranslationSection,
  SourceSection,
} from "@/config/api";

// ── Types ────────────────────────────────────────────────────────────────

export interface TrackedJob {
  jobId: string;
  filename: string;
  sourceLang: string;
  targetLang: string;
  mode: "document" | "text";
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  completedSections: number;
  totalSections: number;
  startedAt: number; // Date.now()
  result?: TranslationJobResult;
  error?: string;
  /** whether the user has dismissed/acknowledged this job */
  dismissed: boolean;
  /** partial translated sections available during translation */
  partialSections?: TranslationSection[];
  /** source sections available from the start */
  sourceSections?: SourceSection[];
}

interface TranslationContextValue {
  jobs: TrackedJob[];
  activeCount: number;
  /** submit a PDF file for translation */
  startDocumentJob: (
    file: File,
    sourceLang: string,
    targetLang: string,
  ) => Promise<TrackedJob>;
  /** submit raw text for translation */
  startTextJob: (
    text: string,
    sourceLang: string,
    targetLang: string,
  ) => Promise<TrackedJob>;
  /** dismiss a finished/failed job from the widget */
  dismissJob: (jobId: string) => void;
  /** cancel a running job */
  cancelJob: (jobId: string) => void;
  /** get full result (lazy-loads if needed) */
  getResult: (jobId: string) => Promise<TranslationJobResult | null>;
  /** currently selected job id for viewing */
  viewingJobId: string | null;
  setViewingJobId: (id: string | null) => void;
}

const Ctx = createContext<TranslationContextValue | null>(null);

export function useTranslation() {
  const c = useContext(Ctx);
  if (!c)
    throw new Error("useTranslation must be inside <TranslationProvider>");
  return c;
}

// ── Provider ─────────────────────────────────────────────────────────────

export function TranslationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── polling active jobs ────────────────────────────────────────────────
  useEffect(() => {
    const active = jobs.filter(
      (j) => j.status === "processing" || j.status === "uploading",
    );
    if (active.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) return; // already ticking

    pollRef.current = setInterval(async () => {
      setJobs((prev) => {
        // We can't do async inside setState, but we can trigger side effects
        return prev;
      });

      // poll each active job
      for (const j of active) {
        if (j.status !== "processing") continue;
        try {
          const p: TranslationProgress = await getTranslationProgress(j.jobId);
          setJobs((prev) =>
            prev.map((x) => {
              if (x.jobId !== j.jobId) return x;
              if (p.status === "completed") {
                // fetch full result
                getTranslationJob(j.jobId).then((full) => {
                  setJobs((pp) =>
                    pp.map((y) =>
                      y.jobId === j.jobId
                        ? {
                            ...y,
                            status: "completed",
                            progress: 100,
                            result: full,
                          }
                        : y,
                    ),
                  );
                });
                return { ...x, status: "completed" as const, progress: 100 };
              }
              if (p.status === "failed") {
                return {
                  ...x,
                  status: "failed" as const,
                  error: p.error || "Unknown error",
                };
              }
              return {
                ...x,
                progress: p.progress,
                completedSections: p.completed_sections,
                totalSections: p.total_sections,
                partialSections: p.partial_translated_sections || x.partialSections,
              };
            }),
          );
        } catch {
          // transient failure, skip
        }
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs]);

  // ── actions ────────────────────────────────────────────────────────────

  const startDocumentJob = useCallback(
    async (
      file: File,
      sourceLang: string,
      targetLang: string,
    ): Promise<TrackedJob> => {
      const tracked: TrackedJob = {
        jobId: "",
        filename: file.name,
        sourceLang,
        targetLang,
        mode: "document",
        status: "uploading",
        progress: 0,
        completedSections: 0,
        totalSections: 0,
        startedAt: Date.now(),
        dismissed: false,
      };
      // Optimistically add to list
      const tempId = `temp-${Date.now()}`;
      tracked.jobId = tempId;
      setJobs((prev) => [tracked, ...prev]);

      try {
        const res: TranslationStartResult = await translateDocument(
          file,
          sourceLang,
          targetLang,
          (pct) => {
            setJobs((prev) =>
              prev.map((j) =>
                j.jobId === tempId ? { ...j, progress: Math.min(pct, 95) } : j,
              ),
            );
          },
        );
        const realJob: TrackedJob = {
          ...tracked,
          jobId: res.job_id,
          filename: res.filename,
          status: "processing",
          progress: 5,
          totalSections: res.total_sections,
          sourceSections: res.source_sections || [],
        };
        setJobs((prev) => prev.map((j) => (j.jobId === tempId ? realJob : j)));
        return realJob;
      } catch (err: any) {
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? {
                  ...j,
                  status: "failed" as const,
                  error: err?.error || err?.message || "Upload failed",
                }
              : j,
          ),
        );
        throw err;
      }
    },
    [],
  );

  const startTextJob = useCallback(
    async (
      text: string,
      sourceLang: string,
      targetLang: string,
    ): Promise<TrackedJob> => {
      const tempId = `temp-${Date.now()}`;
      const tracked: TrackedJob = {
        jobId: tempId,
        filename: "Text Input",
        sourceLang,
        targetLang,
        mode: "text",
        status: "uploading",
        progress: 0,
        completedSections: 0,
        totalSections: 0,
        startedAt: Date.now(),
        dismissed: false,
      };
      setJobs((prev) => [tracked, ...prev]);

      try {
        const res = await translateText(text, sourceLang, targetLang);
        const realJob: TrackedJob = {
          ...tracked,
          jobId: res.job_id,
          status: "processing",
          progress: 5,
          totalSections: res.total_sections,
          sourceSections: res.source_sections || [],
        };
        setJobs((prev) => prev.map((j) => (j.jobId === tempId ? realJob : j)));
        return realJob;
      } catch (err: any) {
        setJobs((prev) =>
          prev.map((j) =>
            j.jobId === tempId
              ? {
                  ...j,
                  status: "failed" as const,
                  error: err?.error || err?.message || "Failed",
                }
              : j,
          ),
        );
        throw err;
      }
    },
    [],
  );

  const dismissJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.jobId === jobId ? { ...j, dismissed: true } : j)),
    );
  }, []);

  const cancelJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.jobId === jobId
          ? { ...j, status: "failed" as const, error: "Cancelled by user" }
          : j,
      ),
    );
    // Also try to cancel on backend (fire-and-forget)
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/translate/cancel/${jobId}`, {
      method: "POST",
    }).catch(() => {});
  }, []);

  const getResult = useCallback(
    async (jobId: string): Promise<TranslationJobResult | null> => {
      const existing = jobs.find((j) => j.jobId === jobId);
      if (existing?.result) return existing.result;
      try {
        const full = await getTranslationJob(jobId);
        setJobs((prev) =>
          prev.map((j) => (j.jobId === jobId ? { ...j, result: full } : j)),
        );
        return full;
      } catch {
        return null;
      }
    },
    [jobs],
  );

  const activeCount = jobs.filter(
    (j) => j.status === "processing" || j.status === "uploading",
  ).length;

  return (
    <Ctx.Provider
      value={{
        jobs,
        activeCount,
        startDocumentJob,
        startTextJob,
        dismissJob,
        cancelJob,
        getResult,
        viewingJobId,
        setViewingJobId,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

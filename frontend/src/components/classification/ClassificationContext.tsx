/**
 * Context provider for Classification module
 * Manages recent classifications, export, and state persistence
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  classifyFile,
  classifyText,
  deleteClassificationResult,
  exportClassificationResult,
  getClassificationResult,
  getRecentClassifications,
  saveClassificationResult,
} from "@/config/api";
import type { ClassificationResult, ClauseResult } from "@/config/api";

// ── Types ────────────────────────────────────────────────────────────────

export interface SavedClassification {
  id: string;
  filename: string;
  timestamp: string;
  totalClauses: number;
  riskSummary: {
    high: number;
    medium: number;
    low: number;
  };
  result?: ClassificationResult;
}

interface ClassificationContextValue {
  recentClassifications: SavedClassification[];
  loadingRecent: boolean;
  saveClassification: (
    filename: string,
    result: ClassificationResult,
  ) => Promise<void>;
  loadClassification: (id: string) => Promise<ClassificationResult | null>;
  deleteClassification: (id: string) => Promise<void>;
  refreshRecent: () => Promise<void>;
  exportClassification: (
    id: string,
    format: "pdf" | "json" | "txt",
  ) => Promise<void>;
}

const Ctx = createContext<ClassificationContextValue | null>(null);

export function useClassification() {
  const c = useContext(Ctx);
  if (!c)
    throw new Error(
      "useClassification must be inside <ClassificationProvider>",
    );
  return c;
}

// ── Provider ─────────────────────────────────────────────────────────────

export function ClassificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recentClassifications, setRecentClassifications] = useState<
    SavedClassification[]
  >([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Load recent classifications on mount
  useEffect(() => {
    refreshRecent();
  }, []);

  const refreshRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const classifications = await getRecentClassifications();
      setRecentClassifications(classifications);
    } catch (error) {
      console.error("Failed to load recent classifications:", error);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const saveClassification = useCallback(
    async (filename: string, result: ClassificationResult) => {
      try {
        await saveClassificationResult(filename, result);
        await refreshRecent();
      } catch (error) {
        console.error("Failed to save classification:", error);
        throw error;
      }
    },
    [refreshRecent],
  );

  const loadClassification = useCallback(
    async (id: string): Promise<ClassificationResult | null> => {
      try {
        return await getClassificationResult(id);
      } catch (error) {
        console.error("Failed to load classification:", error);
        return null;
      }
    },
    [],
  );

  const deleteClassification = useCallback(
    async (id: string) => {
      try {
        await deleteClassificationResult(id);
        await refreshRecent();
      } catch (error) {
        console.error("Failed to delete classification:", error);
        throw error;
      }
    },
    [refreshRecent],
  );

  const exportClassification = useCallback(
    async (id: string, format: "pdf" | "json" | "txt") => {
      try {
        const blob = await exportClassificationResult(id, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `classification_${id}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to export classification:", error);
        throw error;
      }
    },
    [],
  );

  return (
    <Ctx.Provider
      value={{
        recentClassifications,
        loadingRecent,
        saveClassification,
        loadClassification,
        deleteClassification,
        refreshRecent,
        exportClassification,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

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
import { classifyFile, classifyText } from "@/config/api";
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
      const response = await fetch("http://localhost:8000/api/recent");
      const data = await response.json();
      if (data.success) {
        setRecentClassifications(data.classifications || []);
      }
    } catch (error) {
      console.error("Failed to load recent classifications:", error);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const saveClassification = useCallback(
    async (filename: string, result: ClassificationResult) => {
      try {
        const response = await fetch("http://localhost:8000/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            result,
          }),
        });
        const data = await response.json();
        if (data.success) {
          await refreshRecent();
        }
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
        const response = await fetch(`http://localhost:8000/api/result/${id}`);
        const data = await response.json();
        return data.result || null;
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
        const response = await fetch(`http://localhost:8000/api/delete/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await refreshRecent();
        }
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
        const response = await fetch(
          `http://localhost:8000/api/export/${id}/${format}`,
        );
        if (!response.ok) throw new Error("Export failed");

        const blob = await response.blob();
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

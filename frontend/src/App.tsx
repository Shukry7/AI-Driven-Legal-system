import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import ClauseEntryPage from "./pages/clause/Entry";
import ClauseUploadPage from "./pages/clause/Upload";
import ClauseWorkspacePage from "./pages/clause/Workspace";
import ClauseSuggestionsPage from "./pages/clause/Suggestions";
import CasesPage from "./pages/Cases";
import { ClauseProvider } from "./components/clause/ClauseContext";
import { TranslationProvider } from "./components/translation/TranslationContext";
import { TranslationFloatingWidget } from "./components/translation/TranslationFloatingWidget";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <TranslationProvider>
          <ClauseProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                {/* Clause Detection pages */}
                <Route
                  path="/clause"
                  element={
                    <ProtectedRoute>
                      <ClauseEntryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clause/upload"
                  element={
                    <ProtectedRoute>
                      <ClauseUploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clause/workspace"
                  element={
                    <ProtectedRoute>
                      <ClauseWorkspacePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clause/suggestions"
                  element={
                    <ProtectedRoute>
                      <ClauseSuggestionsPage />
                    </ProtectedRoute>
                  }
                />
                {/* Cases pages */}
                <Route
                  path="/cases"
                  element={
                    <ProtectedRoute>
                      <CasesPage />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ClauseProvider>
          <TranslationFloatingWidget />
        </TranslationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

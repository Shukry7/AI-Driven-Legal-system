import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/login/index";
import RegisterPage from "./pages/register/index";
import ProfilePage from "./pages/profile/index";
import SettingsPage from "./pages/settings/index";
import MembershipPage from "./pages/membership/index";
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
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
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
                <Route path="/register" element={<RegisterPage />} />
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
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/membership"
                  element={
                    <ProtectedRoute>
                      <MembershipPage />
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

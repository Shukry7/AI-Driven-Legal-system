import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClauseEntryPage from "./pages/clause/Entry";
import ClauseUploadPage from "./pages/clause/Upload";
import ClauseWorkspacePage from "./pages/clause/Workspace";
import ClauseSuggestionsPage from "./pages/clause/Suggestions";
import CasesPage from "./pages/Cases";
import { ClauseProvider } from "./components/clause/ClauseContext";
import { TranslationProvider } from "./components/translation/TranslationContext";
import { TranslationFloatingWidget } from "./components/translation/TranslationFloatingWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TranslationProvider>
        <ClauseProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* Clause Detection pages */}
              <Route path="/clause" element={<ClauseEntryPage />} />
              <Route path="/clause/upload" element={<ClauseUploadPage />} />
              <Route
                path="/clause/workspace"
                element={<ClauseWorkspacePage />}
              />
              <Route
                path="/clause/suggestions"
                element={<ClauseSuggestionsPage />}
              />
              {/* Cases pages */}
              <Route path="/cases" element={<CasesPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ClauseProvider>
        <TranslationFloatingWidget />
      </TranslationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

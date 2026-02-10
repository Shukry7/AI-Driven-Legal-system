import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TranslationModule } from "@/components/translation/TranslationModule";
import { ClauseModule } from "@/components/clause/ClauseModule";
import { ClassificationModule } from "@/components/classification/ClassificationModule";
import { Toaster } from "@/components/ui/sonner";
import LegalLineageModule from "@/components/legalLineage/LegalLineageModule";

export default function Index() {
  const [activeModule, setActiveModule] = useState("translation");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {activeModule === "translation" && <TranslationModule />}
          {activeModule === "clause" && <ClauseModule />}
          {activeModule === "classification" && <ClassificationModule />}
          {activeModule === "legalLineage" && <LegalLineageModule />}

          {activeModule !== "translation" &&
            activeModule !== "clause" &&
            activeModule !== "classification" && 
            activeModule !== "legalLineage" && (
              <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                    {activeModule.charAt(0).toUpperCase() +
                      activeModule.slice(1)}{" "}
                    Module
                  </h2>
                  <p className="text-muted-foreground">
                    This module is under development
                  </p>
                </div>
              </div>
            )}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

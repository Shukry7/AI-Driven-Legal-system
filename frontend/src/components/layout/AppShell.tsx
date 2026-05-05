import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  activeModule: string;
  children: ReactNode;
}

export function AppShell({ activeModule, children }: AppShellProps) {
  const navigate = useNavigate();

  const handleModuleChange = (module: string) => {
    if (module === "clause") navigate("/clause");
    else if (module === "cases") navigate("/cases");
    else if (module === "profile") navigate("/profile");
    else if (module === "settings") navigate("/settings");
    else if (module === "membership") navigate("/membership");
    else if (module === "admin") navigate("/admin");
    else if (module === "requests") navigate("/admin/requests");
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

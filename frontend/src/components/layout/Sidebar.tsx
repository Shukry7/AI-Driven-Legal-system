import { useState } from "react";
import {
  Scale,
  FileText,
  Languages,
  FolderOpen,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Users,
  BookOpen,
  Search,
  Bell,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
  CheckCircle,
  GitGraph
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-accent rounded flex items-center justify-center">
            <Scale className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg">LegalAI</h1>
            <p className="text-xs text-sidebar-foreground/60">
              Case Management
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="flex items-center gap-2 bg-sidebar-accent rounded px-3 py-2">
          <Search className="w-4 h-4 text-sidebar-foreground/50" />
          <input
            type="text"
            placeholder="Search cases..."
            className="bg-transparent text-sm w-full outline-none placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeModule === "dashboard"}
            onClick={() => onModuleChange("dashboard")}
          />
          <NavItem
            icon={FolderOpen}
            label="Cases"
            active={activeModule === "cases"}
            onClick={() => onModuleChange("cases")}
          />
          <NavItem
            icon={FileText}
            label="Documents"
            active={activeModule === "documents"}
            onClick={() => onModuleChange("documents")}
          />
          <NavItem
            icon={Users}
            label="Clients"
            active={activeModule === "clients"}
            onClick={() => onModuleChange("clients")}
          />
        </div>

        {/* AI Tools Section */}
        <div className="mt-6">
          <button
            onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            <span>AI Tools</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                aiToolsExpanded && "rotate-180"
              )}
            />
          </button>

          {aiToolsExpanded && (
            <div className="mt-1 space-y-1 ml-2 border-l border-sidebar-border pl-2">
              <NavItem
                icon={Languages}
                label="Multilingual Translation"
                active={activeModule === "translation"}
                onClick={() => onModuleChange("translation")}
                highlight
              />
              <NavItem
                icon={CheckCircle}
                label="Clause Detection"
                active={activeModule === "clause"}
                onClick={() => onModuleChange("clause")}
                highlight
              />
              <NavItem
                icon={AlertCircle}
                label="Risk Classification"
                active={activeModule === "classification"}
                onClick={() => onModuleChange("classification")}
                highlight
              />
              <NavItem
                icon={BookOpen}
                label="Document Analysis"
                active={activeModule === "analysis"}
                onClick={() => onModuleChange("analysis")}
              />
              <NavItem 
                icon={GitGraph} 
                label="Legal Lineage"
                active={activeModule === 'legalLineage'}
                onClick={() => onModuleChange('legalLineage')}
              />
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border">
        <NavItem
          icon={Settings}
          label="Settings"
          active={activeModule === "settings"}
          onClick={() => onModuleChange("settings")}
        />
        <div className="mt-4 flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium">
            AK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Amal Kumara</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Senior Associate
            </p>
          </div>
          <Bell className="w-4 h-4 text-sidebar-foreground/50" />
        </div>
      </div>
    </aside>
  );
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}

function NavItem({
  icon: Icon,
  label,
  active,
  highlight,
  onClick,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        highlight && !active && "text-sidebar-primary"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

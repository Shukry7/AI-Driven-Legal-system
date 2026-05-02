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
  GitGraph,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);
  const {
    logout,
    user,
    tokensRemaining,
    monthlyLimit,
    tokensUsed,
    plan,
  } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isUnlimited = monthlyLimit === Number.POSITIVE_INFINITY;
  const progressValue = isUnlimited
    ? 100
    : Math.min((tokensUsed / Math.max(monthlyLimit, 1)) * 100, 100);

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
              Your Legal AI Assistent
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto">
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
            icon={CheckCircle}
            label="Document Analysis"
            active={activeModule === "clause"}
            onClick={() => onModuleChange("clause")}
            highlight
          />

          <NavItem
            icon={Languages}
            label="Multilingual Translation"
            active={activeModule === "translation"}
            onClick={() => onModuleChange("translation")}
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
            icon={GitGraph}
            label="Legal Lineage"
            active={activeModule === "legalLineage"}
            onClick={() => onModuleChange("legalLineage")}
            highlight
          />
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <NavItem
          icon={Settings}
          label="Settings"
          active={activeModule === "settings"}
          onClick={() => onModuleChange("settings")}
        />
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
          <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
            <span className="uppercase tracking-wide">{plan} plan</span>
            <span>
              {isUnlimited ? "Unlimited" : `${tokensRemaining} tokens left`}
            </span>
          </div>
          <div className="mt-2">
            <Progress value={progressValue} className="h-2" />
          </div>
          <div className="mt-2 text-xs text-sidebar-foreground/60">
            {isUnlimited
              ? "No monthly limit"
              : `${tokensUsed}/${monthlyLimit} used this month`}
          </div>
        </div>
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Authenticated User
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-sidebar-foreground/50 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
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

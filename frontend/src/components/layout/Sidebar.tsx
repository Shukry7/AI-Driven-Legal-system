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
  CreditCard,
  User,
  HelpCircle,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserCog } from "lucide-react";

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }
  
  /* Hide scrollbar when not hovering for cleaner look */
  .custom-scrollbar:not(:hover)::-webkit-scrollbar-thumb {
    background: transparent;
  }
  
  .custom-scrollbar:hover::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .custom-scrollbar:hover::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.35);
  }
`;

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  lockedModules?: string[];
  onLockedModule?: (module: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  activeModule,
  onModuleChange,
  lockedModules = [],
  onLockedModule,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [hoverUserCard, setHoverUserCard] = useState(false);
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);
  const {
    logout,
    user,
    tokensRemaining,
    monthlyLimit,
    tokensUsed,
    plan,
    isAdmin,
  } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => {
    onCollapsedChange?.(!collapsed);
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "User";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
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
    <>
      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      <aside 
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 shadow-2xl transition-all duration-300 z-50",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "border-b border-sidebar-border bg-sidebar-accent/20 transition-all duration-300",
          collapsed ? "p-4" : "p-6"
        )}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-10 h-10 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0">
              <Scale className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-heading font-bold text-lg tracking-tight">LegalAI</h1>
                <p className="text-xs text-sidebar-foreground/60">Your Legal AI Assistant</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section with Custom Scrollbar */}
        <nav className="flex-1 min-h-0 px-3 py-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <NavItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={activeModule === "dashboard"}
              onClick={() => onModuleChange("dashboard")}
              collapsed={collapsed}
            />
            <NavItem
              icon={FolderOpen}
              label="Cases"
              active={activeModule === "cases"}
              onClick={() => onModuleChange("cases")}
              collapsed={collapsed}
            />
            {isAdmin && (
              <NavItem
                icon={UserCog}
                label="User Management"
                active={activeModule === "admin"}
                onClick={() => navigate("/admin")}
                collapsed={collapsed}
              />
            )}
            {isAdmin && (
              <NavItem
                icon={Bell}
                label="Requests"
                active={activeModule === "requests"}
                onClick={() => navigate("/admin/requests")}
                collapsed={collapsed}
              />
            )}

            {/* AI Tools Section with Collapsible */}
            <div className="pt-2">
              {!collapsed ? (
                <button
                  onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 py-2 hover:text-sidebar-foreground/80 transition-colors duration-200"
                >
                  <span>AI Tools</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    aiToolsExpanded ? "rotate-0" : "-rotate-90"
                  )} />
                </button>
              ) : (
                <div className="text-center mb-2">
                  <div className="h-px bg-sidebar-border/50 my-2" />
                </div>
              )}
              
              {(aiToolsExpanded || collapsed) && (
                <div className="space-y-1">
                  <NavItem
                    icon={CheckCircle}
                    label="Document Analysis"
                    active={activeModule === "clause"}
                    onClick={() => onModuleChange("clause")}
                    highlight
                    collapsed={collapsed}
                  />
                  <NavItem
                    icon={Languages}
                    label="Multilingual Translation"
                    active={activeModule === "translation"}
                    locked={lockedModules.includes("translation")}
                    onClick={() =>
                      lockedModules.includes("translation")
                        ? onLockedModule?.("translation")
                        : onModuleChange("translation")
                    }
                    highlight
                    collapsed={collapsed}
                  />
                  <NavItem
                    icon={AlertCircle}
                    label="Risk Classification"
                    active={activeModule === "classification"}
                    locked={lockedModules.includes("classification")}
                    onClick={() =>
                      lockedModules.includes("classification")
                        ? onLockedModule?.("classification")
                        : onModuleChange("classification")
                    }
                    highlight
                    collapsed={collapsed}
                  />
                  <NavItem
                    icon={GitGraph}
                    label="Legal Lineage"
                    active={activeModule === "legalLineage"}
                    onClick={() => onModuleChange("legalLineage")}
                    highlight
                    collapsed={collapsed}
                  />
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className={cn(
          "px-3 py-4 border-t border-sidebar-border space-y-3 transition-all duration-300",
          collapsed && "px-2"
        )}>
          {/* Navigation items */}
          <div className="space-y-1">
            <NavItem
              icon={Settings}
              label="Settings"
              active={activeModule === "settings"}
              onClick={() => navigate("/settings")}
              collapsed={collapsed}
            />
            <NavItem
              icon={CreditCard}
              label="Membership"
              active={activeModule === "membership"}
              onClick={() => navigate("/membership")}
              collapsed={collapsed}
            />
          </div>

          {/* Token Usage Card - Hide when collapsed */}
          {!collapsed && !isAdmin && (
            <div className="rounded-lg border border-sidebar-border bg-gradient-to-br from-sidebar-accent/40 to-sidebar-accent/20 p-3 transition-all duration-300 hover:shadow-lg hover:border-sidebar-primary/30">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-wide font-semibold text-sidebar-primary">
                  {plan} plan
                </span>
                <span className="text-sidebar-foreground/70">
                  {isUnlimited ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Unlimited
                    </span>
                  ) : (
                    `${tokensRemaining} tokens left`
                  )}
                </span>
              </div>
              <div className="mt-2">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/85">
                  <div 
                    className="h-full transition-all duration-300 bg-purple-700"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-sidebar-foreground/60">
                {isUnlimited
                  ? "No monthly limit"
                  : `${tokensUsed}/${monthlyLimit} used this month`}
              </div>
            </div>
          )}

          {/* User Info Section - Simplified when collapsed */}
          <div 
            className={cn(
              "rounded-lg border border-sidebar-border transition-all duration-300",
              collapsed ? "p-2" : "p-3 bg-sidebar-accent/20",
              hoverUserCard && !collapsed && "shadow-lg border-sidebar-primary/30 bg-sidebar-accent/40"
            )}
            onMouseEnter={() => setHoverUserCard(true)}
            onMouseLeave={() => setHoverUserCard(false)}
          >
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center gap-0" : "gap-3"
            )}>
              {/* Popover for Profile/Settings */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "text-left",
                    collapsed ? "flex justify-center" : "flex-1"
                  )}>
                    <div className={cn(
                      "flex items-center group",
                      collapsed ? "justify-center" : "gap-3"
                    )}>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center text-sm font-medium shrink-0 overflow-hidden shadow-md transition-all duration-300 group-hover:scale-105">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials || <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                      </div>
                      
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate transition-colors duration-200 group-hover:text-sidebar-primary">
                            {displayName}
                          </p>
                          <p className="text-xs text-sidebar-foreground/60 truncate">
                            {user?.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end" side="top">
                  <div className="space-y-3">
                    <div className="pb-2 border-b">
                      <p className="text-sm font-semibold">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="grid gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/profile")}
                        className="w-full justify-start transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:translate-x-1"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/settings")}
                        className="w-full justify-start transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:translate-x-1"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Logout Icon Button - Show with tooltip when collapsed */}
              {!collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLogoutDialog(true)}
                  className="h-10 w-10 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group shrink-0"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                </Button>
              )}
            </div>
            
            {/* Logout button for collapsed mode */}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLogoutDialog(true)}
                className="mt-2 h-10 w-10 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group mx-auto"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle Button - Positioned on the border */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className={cn(
          "fixed top-20 -translate-y-1/2 z-50 h-8 w-8 rounded-md transition-all duration-300 bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary border-2",
          collapsed ? "left-20" : "left-64"
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" />
              Sign out
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel className="transition-all duration-200 hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 hover:scale-105"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  highlight?: boolean;
  locked?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function NavItem({
  icon: Icon,
  label,
  active,
  highlight,
  locked,
  onClick,
  collapsed = false,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      aria-disabled={locked}
      className={cn(
        "group relative flex items-center w-full rounded-lg text-sm transition-all duration-200",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        highlight && !active && "text-sidebar-primary font-medium",
        locked && !active && "opacity-50 cursor-not-allowed"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn(
        "w-4 h-4 transition-all duration-200 shrink-0",
        !active && "group-hover:scale-110"
      )} />
      {!collapsed && <span>{label}</span>}
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary-foreground rounded-r-full" />
      )}
    </button>
  );
}
import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Package,
  Grid3x3,
  Upload,
  Settings,
  LayoutDashboard,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/contexts/PlatformContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Grid3x3 },
  { to: "/bulk-upload", label: "Bulk Upload", icon: Upload },
  { to: "/activity-log", label: "Activity Log", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ConnectionStatus = ({ collapsed }: { collapsed: boolean }) => {
  const { isConnected, connectionStatus, credentials } = usePlatform();

  const label = isConnected
    ? `Connected: ${connectionStatus?.platformName || credentials?.name || "API"}`
    : "Not Connected";
  const sublabel = isConnected && connectionStatus?.version
    ? `v${connectionStatus.version}`
    : "Connect a platform in Settings";

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 border-t border-sidebar-border flex justify-center">
            <div className={cn("w-3 h-3 rounded-full", isConnected ? "bg-success" : "bg-warning")} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="p-4 border-t border-sidebar-border">
      <div className="px-4 py-3 bg-sidebar-accent/50 rounded-lg">
        <p className="text-xs text-sidebar-foreground/60">Status</p>
        <p className="text-sm font-medium text-sidebar-foreground mt-1">
          {isConnected ? "Connected" : "Not Connected"}
        </p>
        <p className="text-xs text-sidebar-foreground/60 mt-1 truncate">{sublabel}</p>
      </div>
    </div>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className={cn(
        "p-6 border-b border-sidebar-border flex items-center",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-sidebar-foreground truncate">diTech Solves</h1>
            <p className="text-sm text-sidebar-foreground/60 mt-1">Platform Manager</p>
          </div>
        )}
        {isMobile ? (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          const showLabel = !collapsed || isMobile;

          const linkEl = (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                !showLabel && "justify-center px-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span className="font-medium">{item.label}</span>}
            </Link>
          );

          if (!showLabel) {
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.to}>{linkEl}</div>;
        })}
      </nav>

      <div className="px-4 pb-2">
        <ThemeToggle collapsed={collapsed && !isMobile} />
      </div>
      <ConnectionStatus collapsed={collapsed && !isMobile} />
    </>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Mobile overlay */}
        {isMobile && mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "border-r border-border bg-sidebar flex flex-col transition-all duration-300 z-50",
            isMobile
              ? cn("fixed inset-y-0 left-0 w-72", mobileOpen ? "translate-x-0" : "-translate-x-full")
              : collapsed ? "w-16" : "w-64"
          )}
        >
          {sidebarContent}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          {isMobile && (
            <header className="h-14 border-b border-border flex items-center px-4 bg-background flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-3">
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground truncate">diTech Solves</h1>
            </header>
          )}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
};

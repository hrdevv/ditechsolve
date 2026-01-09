import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Package, 
  Grid3x3, 
  Upload, 
  Settings, 
  LayoutDashboard, 
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWooCommerce } from "@/contexts/WooCommerceContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { isConnected, systemStatus } = useWooCommerce();
  
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 border-t border-sidebar-border flex justify-center">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isConnected ? "bg-success" : "bg-warning"
            )} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{isConnected ? `Connected: WC ${systemStatus?.environment.version}` : "Mock Mode"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="p-4 border-t border-sidebar-border">
      <div className="px-4 py-3 bg-sidebar-accent/50 rounded-lg">
        <p className="text-xs text-sidebar-foreground/60">Status</p>
        <p className="text-sm font-medium text-sidebar-foreground mt-1">
          {isConnected ? "Connected" : "Mock Mode"}
        </p>
        <p className="text-xs text-sidebar-foreground/60 mt-1">
          {isConnected && systemStatus
            ? `WC ${systemStatus.environment.version}`
            : "Connect WordPress in Settings"}
        </p>
      </div>
    </div>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className={cn(
          "border-r border-border bg-sidebar flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className={cn(
            "p-6 border-b border-sidebar-border flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">diTech Solves</h1>
                <p className="text-sm text-sidebar-foreground/60 mt-1">WooCommerce Manager</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              const linkContent = (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          <ConnectionStatus collapsed={collapsed} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
};

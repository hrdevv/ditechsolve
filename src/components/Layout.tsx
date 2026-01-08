import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Package, Grid3x3, Upload, Settings, LayoutDashboard, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWooCommerce } from "@/contexts/WooCommerceContext";

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

const ConnectionStatus = () => {
  const { isConnected, systemStatus } = useWooCommerce();
  
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">diTech Solves</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">WooCommerce Manager</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <ConnectionStatus />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/Layout";
import { PlatformProvider } from "./contexts/PlatformContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import BulkUpload from "./pages/BulkUpload";
import Settings from "./pages/Settings";
import ActivityLog from "./pages/ActivityLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/bulk-upload" element={<BulkUpload />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/activity-log" element={<ActivityLog />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </PlatformProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

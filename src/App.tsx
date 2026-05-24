import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import { LoginPage } from "./pages/LoginPage";
import { BatchesPage } from "./pages/BatchesPage";
import { BatchDetailPage } from "./pages/BatchDetailPage";
import BatchEditPage from "./pages/BatchEditPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import PrizeUtilizationPage from "./pages/PrizeUtilizationPage";
import { DSRPreviewPage } from "./pages/preview/DSRPreviewPage";
import { SODPreviewPage } from "./pages/preview/SODPreviewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches"
              element={
                <ProtectedRoute>
                  <BatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch/:id"
              element={
                <ProtectedRoute>
                  <BatchDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch/:id/edit"
              element={
                <ProtectedRoute>
                  <BatchEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company-settings"
              element={
                <ProtectedRoute>
                  <CompanySettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prize-utilization"
              element={
                <ProtectedRoute>
                  <PrizeUtilizationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch/:id/preview/dsr"
              element={
                <ProtectedRoute>
                  <DSRPreviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch/:id/preview/sod"
              element={
                <ProtectedRoute>
                  <SODPreviewPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/LoginPage").then(module => ({ default: module.LoginPage })));
const BatchesPage = lazy(() => import("./pages/BatchesPage").then(module => ({ default: module.BatchesPage })));
const BatchDetailPage = lazy(() => import("./pages/BatchDetailPage").then(module => ({ default: module.BatchDetailPage })));
const BatchEditPage = lazy(() => import("./pages/BatchEditPage"));
const CompaniesPage = lazy(() => import("./pages/CompaniesPage"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const PrizeUtilizationPage = lazy(() => import("./pages/PrizeUtilizationPage"));
const DSRPreviewPage = lazy(() => import("./pages/preview/DSRPreviewPage").then(module => ({ default: module.DSRPreviewPage })));
const SODPreviewPage = lazy(() => import("./pages/preview/SODPreviewPage").then(module => ({ default: module.SODPreviewPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center bg-[#f7f8fa]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#f6b719] border-t-transparent" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading System...</span>
              </div>
            </div>
          }>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

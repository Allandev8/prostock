import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginForm } from "@/components/auth/LoginForm";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminProducts } from "@/pages/admin/Products";
import { Settings } from "@/pages/admin/Settings";
import { SetupMasterUsers } from "@/components/admin/SetupMasterUsers";
import { DebugRoles } from "@/components/admin/DebugRoles";
import { PointOfSale } from "@/pages/pdv/PointOfSale";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <InventoryProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/setup" element={<SetupMasterUsers />} />
              <Route path="/debug" element={<DebugRoles />} />
              <Route path="/pdv" element={
                <ProtectedRoute allowedRoles={['pdv', 'admin']}>
                  <PointOfSale />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="settings" element={<Settings />} />
                <Route path="inventory" element={<div>Estoque em desenvolvimento</div>} />
                <Route path="sales" element={<div>Vendas em desenvolvimento</div>} />
                <Route path="users" element={<div>Usuários em desenvolvimento</div>} />
              </Route>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </InventoryProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

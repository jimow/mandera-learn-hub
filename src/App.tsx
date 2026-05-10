import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Centers from "./pages/Centers";
import UsersManagement from "./pages/UsersManagement";
import RolesManagement from "./pages/RolesManagement";
import StudentApprovals from "./pages/StudentApprovals";
import AdministrativeAreas from "./pages/AdministrativeAreas";
import InitialSetup from "./pages/InitialSetup";
import ApiDocumentation from "./pages/ApiDocumentation";
import MapView from "./pages/MapView";
import CenterDetails from "./pages/CenterDetails";
import Inventory from "./pages/Inventory";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { session, signOut } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <InitialSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Students />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Teachers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Centers />
            </DashboardLayout>
          </ProtectedRoute>
        }
        />
      <Route
        path="/administrative-areas"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <AdministrativeAreas />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <UsersManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <RolesManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <StudentApprovals />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-docs"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <ApiDocumentation />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/centers/:id"
        element={
          <ProtectedRoute>
            <CenterDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Attendance />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Inventory />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Reports />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout onLogout={signOut}>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

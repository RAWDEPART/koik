import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import AttendanceManagement from './pages/AttendanceManagement';
import LeaveManagement from './pages/LeaveManagement';
import EmployeeLeaves from './pages/EmployeeLeaves';
import MyAttendance from './pages/MyAttendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Payslips from './pages/Payslips';
import NotificationsPage from './pages/Notifications';
import DocumentsPage from './pages/Documents';
import ShiftsPage from './pages/Shifts';
import RegularizationsPage from './pages/Regularizations';
import ExpensesPage from './pages/Expenses';
import HelpDeskPage from './pages/HelpDesk';
import GoalsPage from './pages/Goals';
import RealtimeOps from './pages/RealtimeOps';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Admin Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/directory"
        element={
          <ProtectedRoute adminOnly>
            <EmployeeDirectory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute adminOnly>
            <AttendanceManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedRoute adminOnly>
            <LeaveManagement />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/my-leaves"
        element={
          <ProtectedRoute>
            <EmployeeLeaves />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-attendance"
        element={
          <ProtectedRoute>
            <MyAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute adminOnly>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payslips"
        element={
          <ProtectedRoute>
            <Payslips />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shifts"
        element={
          <ProtectedRoute>
            <ShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/regularizations"
        element={
          <ProtectedRoute>
            <RegularizationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/helpdesk"
        element={
          <ProtectedRoute>
            <HelpDeskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <GoalsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/realtime"
        element={
          <ProtectedRoute adminOnly>
            <RealtimeOps />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

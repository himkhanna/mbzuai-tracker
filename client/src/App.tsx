import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import CreateOrder from './pages/CreateOrder';
import OrderDetail from './pages/OrderDetail';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import AuditLog from './pages/AuditLog';
import TestTools from './pages/TestTools';
import Settings from './pages/Settings';
import type { Role } from './types';

function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const { isRTL } = useLanguage();
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0f4f8' }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0"
        style={isRTL ? { marginRight: '256px' } : { marginLeft: '256px' }}
      >
        <Navbar title={title} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
  title,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
  title: string;
}) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout title={title}>{children}</Layout>;
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      <Route path="/login" element={user && token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute title="Dashboard"><Dashboard /></ProtectedRoute>
      } />
      <Route path="/tracker" element={
        <ProtectedRoute title="Order Tracker"><Tracker /></ProtectedRoute>
      } />
      <Route path="/orders/new" element={
        <ProtectedRoute title="Create Order" allowedRoles={['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT']}>
          <CreateOrder />
        </ProtectedRoute>
      } />
      <Route path="/orders/:id" element={
        <ProtectedRoute title="Order Detail"><OrderDetail /></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute title="Reports" allowedRoles={['ADMIN', 'VENDOR_MANAGEMENT', 'PROCUREMENT']}>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute title="User Management" allowedRoles={['ADMIN']}>
          <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute title="Audit Log" allowedRoles={['ADMIN', 'VENDOR_MANAGEMENT']}>
          <AuditLog />
        </ProtectedRoute>
      } />
      <Route path="/admin/test-tools" element={
        <ProtectedRoute title="Test Tools" allowedRoles={['ADMIN']}>
          <TestTools />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute title="Settings" allowedRoles={['ADMIN']}>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: '14px', borderRadius: '8px' },
            }}
          />
        </BrowserRouter>
      </SettingsProvider>
    </LanguageProvider>
  );
}

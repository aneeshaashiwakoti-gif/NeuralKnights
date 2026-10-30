import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { SignInPage } from '../features/auth/SignInPage';
import { AppShell } from '../layout/AppShell';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ApplicationsListPage } from '../features/applications/ApplicationsListPage';
import { NewApplicationPage } from '../features/applications/NewApplicationPage';
import { ApplicationDetailPage } from '../features/applications/ApplicationDetailPage';
import { PRIMARY_NAV } from './navigation';
import {
  AdminPage,
  AiPage,
  AlertsPage,
  AuditPage,
  CompliancePage,
  DocumentsPage,
  EvcPage,
  ReportsPage,
  WorkflowPage,
} from '../features/modules/ModulePages';

const IMPLEMENTED_KEYS = new Set([
  'overview', 'applications', 'workflow', 'evc', 'compliance', 'documents',
  'alerts', 'reports', 'audit', 'ai', 'admin',
]);

/** Redirects unauthenticated visitors to the sign-in page. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/sign-in" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<DashboardPage />} />
        <Route path="/applications" element={<ApplicationsListPage />} />
        <Route path="/applications/new" element={<NewApplicationPage />} />
        <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/evc" element={<EvcPage />} />
        <Route path="/compliance/:undertakingId" element={<CompliancePage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {PRIMARY_NAV.filter((item) => !IMPLEMENTED_KEYS.has(item.key)).map((item) => (
          <Route key={item.key} path={item.path} element={<PlaceholderPage title={item.label} />} />
        ))}
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Route>
    </Routes>
  );
}

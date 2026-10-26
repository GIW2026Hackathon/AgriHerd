import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { StoreProvider } from './lib/store';
import Toasts from './components/Toasts';
import AppLayout, { Guard, ROUTE_ROLES } from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registry from './pages/Registry';
import Triage from './pages/Triage';
import FindVet from './pages/FindVet';
import Cases from './pages/Cases';
import Coverage from './pages/Coverage';
import Claims from './pages/Claims';
import Agreements from './pages/Agreements';
import Enrollments from './pages/Enrollments';
import Surveillance from './pages/Surveillance';
import Prevention from './pages/Prevention';
import Admin from './pages/Admin';
import Docs from './pages/Docs';
import Reports from './pages/Reports';
import Knowledge from './pages/Knowledge';
import type { Role } from './lib/types';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppPage({ path, element }: { path: string; element: React.ReactNode }) {
  const roles = (ROUTE_ROLES[path] ?? ['farmer', 'vet', 'sponsor', 'authority', 'admin']) as Role[];
  return (
    <AppLayout>
      <Guard roles={roles}>{element}</Guard>
    </AppLayout>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollToTop />
        <Toasts />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<AppPage path="/app/dashboard" element={<Dashboard />} />} />
          <Route path="/app/registry" element={<AppPage path="/app/registry" element={<Registry />} />} />
          <Route path="/app/triage" element={<AppPage path="/app/triage" element={<Triage />} />} />
          <Route path="/app/find-vet" element={<AppPage path="/app/find-vet" element={<FindVet />} />} />
          <Route path="/app/cases" element={<AppPage path="/app/cases" element={<Cases />} />} />
          <Route path="/app/coverage" element={<AppPage path="/app/coverage" element={<Coverage />} />} />
          <Route path="/app/claims" element={<AppPage path="/app/claims" element={<Claims />} />} />
          <Route path="/app/agreements" element={<AppPage path="/app/agreements" element={<Agreements />} />} />
          <Route path="/app/enrollments" element={<AppPage path="/app/enrollments" element={<Enrollments />} />} />
          <Route path="/app/surveillance" element={<AppPage path="/app/surveillance" element={<Surveillance />} />} />
          <Route path="/app/prevention" element={<AppPage path="/app/prevention" element={<Prevention />} />} />
          <Route path="/app/admin" element={<AppPage path="/app/admin" element={<Admin />} />} />
          <Route path="/app/docs" element={<AppPage path="/app/docs" element={<Docs />} />} />
          <Route path="/app/reports" element={<AppPage path="/app/reports" element={<Reports />} />} />
          <Route path="/app/knowledge" element={<AppPage path="/app/knowledge" element={<Knowledge />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}

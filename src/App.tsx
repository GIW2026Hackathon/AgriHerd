import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/session';
import { ToastProvider } from './lib/toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AppLayout from './components/AppLayout';
import FarmerHome from './pages/dashboard/FarmerHome';
import VetHome from './pages/dashboard/VetHome';
import SponsorHome from './pages/dashboard/SponsorHome';
import CountyHome from './pages/dashboard/CountyHome';
import AdminHome from './pages/dashboard/AdminHome';
import Registry from './pages/Registry';
import AITriage from './pages/AITriage';
import VetFinder from './pages/VetFinder';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Claims from './pages/Claims';
import Surveillance from './pages/Surveillance';
import HerdHealth from './pages/HerdHealth';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import UsersAdmin from './pages/UsersAdmin';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Authenticated application shell (role-gated nav per layout) */}
            <Route path="/app/farmer" element={<AppLayout />}>
              <Route index element={<FarmerHome />} />
              <Route path="registry" element={<Registry />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="triage" element={<AITriage />} />
              <Route path="vets" element={<VetFinder />} />
              <Route path="claims" element={<Claims />} />
              <Route path="herd-health" element={<HerdHealth />} />
              <Route path="*" element={<Navigate to="/app/farmer" replace />} />
            </Route>

            <Route path="/app/vet" element={<AppLayout />}>
              <Route index element={<VetHome />} />
              <Route path="registry" element={<Registry />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="triage" element={<AITriage />} />
              <Route path="claims" element={<Claims />} />
              <Route path="surveillance" element={<Surveillance />} />
              <Route path="herd-health" element={<HerdHealth />} />
              <Route path="*" element={<Navigate to="/app/vet" replace />} />
            </Route>

            <Route path="/app/sponsor" element={<AppLayout />}>
              <Route index element={<SponsorHome />} />
              <Route path="registry" element={<Registry />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="claims" element={<Claims />} />
              <Route path="reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/app/sponsor" replace />} />
            </Route>

            <Route path="/app/county" element={<AppLayout />}>
              <Route index element={<CountyHome />} />
              <Route path="registry" element={<Registry />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="claims" element={<Claims />} />
              <Route path="surveillance" element={<Surveillance />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<Audit />} />
              <Route path="*" element={<Navigate to="/app/county" replace />} />
            </Route>

            <Route path="/app/admin" element={<AppLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="registry" element={<Registry />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetail />} />
              <Route path="claims" element={<Claims />} />
              <Route path="surveillance" element={<Surveillance />} />
              <Route path="herd-health" element={<HerdHealth />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<Audit />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="*" element={<Navigate to="/app/admin" replace />} />
            </Route>

            {/* Legacy / convenience redirects */}
            <Route path="/app" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}

import { Navigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import FarmerDashboard from './dashboards/FarmerDashboard';
import VetDashboard from './dashboards/VetDashboard';
import SponsorDashboard from './dashboards/SponsorDashboard';
import AuthorityDashboard from './dashboards/AuthorityDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function Dashboard() {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  switch (currentUser.role) {
    case 'farmer': return <FarmerDashboard />;
    case 'vet': return <VetDashboard />;
    case 'sponsor': return <SponsorDashboard />;
    case 'authority': return <AuthorityDashboard />;
    case 'admin': return <AdminDashboard />;
  }
}

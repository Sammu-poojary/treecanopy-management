import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import HomePage from './pages/HomePage';
import TrackReportPage from './pages/TrackReportPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TreeEncyclopediaPage from './pages/TreeEncyclopediaPage';
import {
  AddPropertyPage,
  AdminConsolePage,
  AttendancePage,
  DashboardPage,
  OfficialManagementPage,
  PropertyInventoryPage,
  PurchaseEquipmentPage,
  ReportIssuePage,
  SchedulerPage,
  TaskPage,
  TreeInventoryPage,
  ViewTreePage,
  CitizenDashboardPage,
} from './pages/CanopyPages';

function App() {
  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || null;
    } catch {
      return null;
    }
  };

  const normalizeRole = (role) => {
    if (!role) return '';
    const r = role.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    if (r === 'arborist / cutter' || r === 'tree cutter' || r === 'treecutter' || r === 'cutter') {
      return 'Tree Cutter';
    }
    if (r === 'official') return 'Official';
    if (r === 'admin') return 'Admin';
    if (r === 'citizen' || r === 'public user' || r === 'public_user') return 'Citizen';
    return role;
  };

  const OfficialOnly = ({ children }) => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    return role === 'Official' || role === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' ? children : <Navigate to="/login" replace />;
  };

  const AdminOnly = ({ children }) => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    return role === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' ? children : <Navigate to="/login" replace />;
  };

  const CutterOnly = ({ children }) => {
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/citizen-dashboard" element={<CitizenDashboardPage />} />
        <Route path="/task" element={<TaskPage />} />
        <Route path="/report-issue" element={<ReportIssuePage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/official-management" element={<OfficialManagementPage />} />
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/tree-inventory" element={<AdminOnly><TreeInventoryPage /></AdminOnly>} />
        <Route path="/add-property" element={<AddPropertyPage />} />
        <Route path="/property-inventory" element={<PropertyInventoryPage />} />
        <Route path="/purchase-equipment" element={<PropertyInventoryPage />} />
        <Route path="/view-tree" element={<ViewTreePage />} />
        <Route path="/tree-encyclopedia" element={<TreeEncyclopediaPage />} />
        <Route path="/track" element={<TrackReportPage />} />
        <Route path="/track/:id" element={<TrackReportPage />} />
        <Route path="/" element={<Navigate to="/register" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

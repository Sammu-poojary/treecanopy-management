import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import HomePage from './pages/HomePage';
import TrackReportPage from './pages/TrackReportPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TreeEncyclopediaPage from './pages/TreeEncyclopediaPage';
import OfficialLoginPage from './pages/OfficialLoginPage';
import {
  AddPropertyPage,
  AdminConsolePage,
  AdminComplaintsPage,
  AdminAttendancePage,
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
  VerifyCertificatePage,
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
    return role === 'Official' || role === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || sessionStorage.getItem('officialAuthed') === 'true' ? children : <Navigate to="/official-login" replace />;
  };

  const AdminOnly = ({ children }) => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    return role === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' ? children : <AdminConsolePage />;
  };

  const CutterOnly = ({ children }) => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    return role === 'Tree Cutter' || role === 'Official' || role === 'Admin' || sessionStorage.getItem('adminAuthed') === 'true' || sessionStorage.getItem('officialAuthed') === 'true' ? children : <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<HomePage />} />

        {/* ── Official Login Page ── */}
        <Route path="/official-login" element={<OfficialLoginPage />} />
        <Route path="/official/login" element={<OfficialLoginPage />} />
        <Route path="/officials/login" element={<OfficialLoginPage />} />

        {/* ── Admin Namespaced Routes ── */}
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/admin/console" element={<AdminConsolePage />} />
        <Route path="/admin/dashboard" element={<AdminOnly><DashboardPage /></AdminOnly>} />
        <Route path="/admin/scheduler" element={<AdminOnly><SchedulerPage /></AdminOnly>} />
        <Route path="/admin-complaints" element={<AdminOnly><AdminComplaintsPage /></AdminOnly>} />
        <Route path="/admin/complaints" element={<AdminOnly><AdminComplaintsPage /></AdminOnly>} />
        <Route path="/admin/attendance" element={<AdminOnly><AdminAttendancePage /></AdminOnly>} />
        <Route path="/admin/tree-inventory" element={<AdminOnly><TreeInventoryPage /></AdminOnly>} />
        <Route path="/admin/add-tree" element={<AdminOnly><TreeInventoryPage /></AdminOnly>} />
        <Route path="/admin/view-tree" element={<AdminOnly><ViewTreePage /></AdminOnly>} />
        <Route path="/admin/tree-encyclopedia" element={<AdminOnly><TreeEncyclopediaPage /></AdminOnly>} />
        <Route path="/admin/add-property" element={<AdminOnly><AddPropertyPage /></AdminOnly>} />
        <Route path="/admin/property-inventory" element={<AdminOnly><PropertyInventoryPage /></AdminOnly>} />
        <Route path="/admin/purchase-equipment" element={<AdminOnly><PropertyInventoryPage /></AdminOnly>} />

        {/* ── Official Namespaced Routes ── */}
        <Route path="/official/login" element={<Navigate to="/login?portal=Official" replace />} />
        <Route path="/official-login" element={<Navigate to="/login?portal=Official" replace />} />
        <Route path="/official" element={<OfficialOnly><DashboardPage /></OfficialOnly>} />
        <Route path="/official/dashboard" element={<OfficialOnly><DashboardPage /></OfficialOnly>} />
        <Route path="/official/scheduler" element={<OfficialOnly><SchedulerPage /></OfficialOnly>} />
        <Route path="/official/complaints" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/official-management" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/officials-management" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/officials" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/official/attendance" element={<OfficialOnly><AttendancePage /></OfficialOnly>} />
        <Route path="/official/tree-inventory" element={<OfficialOnly><TreeInventoryPage /></OfficialOnly>} />
        <Route path="/official/add-tree" element={<OfficialOnly><TreeInventoryPage /></OfficialOnly>} />
        <Route path="/official/view-tree" element={<OfficialOnly><ViewTreePage /></OfficialOnly>} />
        <Route path="/official/tree-encyclopedia" element={<OfficialOnly><TreeEncyclopediaPage /></OfficialOnly>} />
        <Route path="/official/add-property" element={<OfficialOnly><AddPropertyPage /></OfficialOnly>} />
        <Route path="/official/property-inventory" element={<OfficialOnly><PropertyInventoryPage /></OfficialOnly>} />

        {/* ── Tree Cutter Namespaced Routes ── */}
        <Route path="/treecutter/dashboard" element={<CutterOnly><DashboardPage /></CutterOnly>} />
        <Route path="/cutter/dashboard" element={<CutterOnly><DashboardPage /></CutterOnly>} />
        <Route path="/treecutter/task" element={<CutterOnly><TaskPage /></CutterOnly>} />
        <Route path="/cutter/task" element={<CutterOnly><TaskPage /></CutterOnly>} />
        <Route path="/treecutter/attendance" element={<CutterOnly><AttendancePage /></CutterOnly>} />
        <Route path="/cutter/attendance" element={<CutterOnly><AttendancePage /></CutterOnly>} />
        <Route path="/treecutter/view-tree" element={<CutterOnly><ViewTreePage /></CutterOnly>} />
        <Route path="/cutter/view-tree" element={<CutterOnly><ViewTreePage /></CutterOnly>} />
        <Route path="/treecutter/tree-inventory" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/cutter/tree-inventory" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/treecutter/add-tree" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/cutter/add-tree" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/treecutter/property-inventory" element={<CutterOnly><PropertyInventoryPage /></CutterOnly>} />
        <Route path="/cutter/property-inventory" element={<CutterOnly><PropertyInventoryPage /></CutterOnly>} />

        {/* ── Standard / Fallback Routes ── */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/citizen-dashboard" element={<CitizenDashboardPage />} />
        <Route path="/task" element={<CutterOnly><TaskPage /></CutterOnly>} />
        <Route path="/report-issue" element={<ReportIssuePage />} />
        <Route path="/scheduler" element={<OfficialOnly><SchedulerPage /></OfficialOnly>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/tree-inventory" element={<TreeInventoryPage />} />
        <Route path="/add-tree" element={<TreeInventoryPage />} />
        <Route path="/add-property" element={<AddPropertyPage />} />
        <Route path="/property-inventory" element={<PropertyInventoryPage />} />
        <Route path="/purchase-equipment" element={<PropertyInventoryPage />} />
        <Route path="/view-tree" element={<ViewTreePage />} />
        <Route path="/tree-encyclopedia" element={<TreeEncyclopediaPage />} />
        <Route path="/track" element={<TrackReportPage />} />
        <Route path="/track/:id" element={<TrackReportPage />} />
        <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
        <Route path="/verify-certificate/:certificateNumber" element={<VerifyCertificatePage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

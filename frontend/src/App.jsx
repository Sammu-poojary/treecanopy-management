import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import HomePage from './pages/HomePage';
import TrackReportPage from './pages/TrackReportPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TreeEncyclopediaPage from './pages/TreeEncyclopediaPage';
import OfficialLoginPage from './pages/OfficialLoginPage';
import TreeCutterTaskPage from './pages/TreeCutterTaskPage';
import TreeCutterAttendancePage from './pages/TreeCutterAttendancePage';
import TimberAuctionPage from './pages/TimberAuctionPage';
import ProcessingConsolePage from './pages/ProcessingConsolePage';
import OfficialDeliveryAndPaymentsPage from './pages/OfficialDeliveryAndPaymentsPage';
import DeliveryDashboardPage from './pages/DeliveryDashboardPage';
import OfficialTimberManagementPage from './pages/OfficialTimberManagementPage';
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
  ViewTreeCutterPage,
  CitizenDashboardPage,
  VerifyCertificatePage,
  CommunicationPage,
  OfficialAdoptionsPage,
  TreeCutterDutiesPage,
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

  const DynamicAttendanceRoute = () => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    if (role === 'Tree Cutter') {
      return <TreeCutterAttendancePage />;
    }
    return <AttendancePage />;
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
        <Route path="/admin/communication" element={<AdminOnly><CommunicationPage /></AdminOnly>} />
        <Route path="/admin/scheduler" element={<AdminOnly><SchedulerPage /></AdminOnly>} />
        <Route path="/admin/adoptions" element={<AdminOnly><OfficialAdoptionsPage /></AdminOnly>} />
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
        <Route path="/admin/view-tree-cutter" element={<AdminOnly><ViewTreeCutterPage /></AdminOnly>} />

        {/* ── Official Namespaced Routes ── */}
        <Route path="/official" element={<OfficialOnly><DashboardPage /></OfficialOnly>} />
        <Route path="/official/dashboard" element={<OfficialOnly><DashboardPage /></OfficialOnly>} />
        <Route path="/official/adoptions" element={<OfficialOnly><OfficialAdoptionsPage /></OfficialOnly>} />
        <Route path="/official-adoptions" element={<OfficialOnly><OfficialAdoptionsPage /></OfficialOnly>} />
        <Route path="/official/communication" element={<OfficialOnly><CommunicationPage /></OfficialOnly>} />
        <Route path="/official/scheduler" element={<OfficialOnly><SchedulerPage /></OfficialOnly>} />
        <Route path="/official/complaints" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/official-management" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/officials-management" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/officials" element={<OfficialOnly><OfficialManagementPage /></OfficialOnly>} />
        <Route path="/official/attendance" element={<OfficialOnly><AttendancePage /></OfficialOnly>} />
        <Route path="/official/view-tree-cutter" element={<OfficialOnly><ViewTreeCutterPage /></OfficialOnly>} />
        <Route path="/official/tree-inventory" element={<OfficialOnly><TreeInventoryPage /></OfficialOnly>} />
        <Route path="/official/add-tree" element={<OfficialOnly><TreeInventoryPage /></OfficialOnly>} />
        <Route path="/official/view-tree" element={<OfficialOnly><ViewTreePage /></OfficialOnly>} />
        <Route path="/official/tree-encyclopedia" element={<OfficialOnly><TreeEncyclopediaPage /></OfficialOnly>} />
        <Route path="/official/add-property" element={<OfficialOnly><AddPropertyPage /></OfficialOnly>} />
        <Route path="/official/property-inventory" element={<OfficialOnly><PropertyInventoryPage /></OfficialOnly>} />
        <Route path="/view-tree-cutter" element={<ViewTreeCutterPage />} />

        {/* ── Tree Cutter Namespaced Routes ── */}
        <Route path="/treecutter/dashboard" element={<CutterOnly><DashboardPage /></CutterOnly>} />
        <Route path="/cutter/dashboard" element={<CutterOnly><DashboardPage /></CutterOnly>} />
        <Route path="/treecutter/communication" element={<CutterOnly><CommunicationPage /></CutterOnly>} />
        <Route path="/cutter/communication" element={<CutterOnly><CommunicationPage /></CutterOnly>} />
        <Route path="/treecutter/task" element={<CutterOnly><TreeCutterTaskPage /></CutterOnly>} />
        <Route path="/cutter/task" element={<CutterOnly><TreeCutterTaskPage /></CutterOnly>} />
        <Route path="/treecutter/tree-duties" element={<CutterOnly><TreeCutterDutiesPage /></CutterOnly>} />
        <Route path="/cutter/tree-duties" element={<CutterOnly><TreeCutterDutiesPage /></CutterOnly>} />
        <Route path="/treecutter/attendance" element={<CutterOnly><TreeCutterAttendancePage /></CutterOnly>} />
        <Route path="/cutter/attendance" element={<CutterOnly><TreeCutterAttendancePage /></CutterOnly>} />
        <Route path="/treecutter/view-tree" element={<CutterOnly><ViewTreePage /></CutterOnly>} />
        <Route path="/cutter/view-tree" element={<CutterOnly><ViewTreePage /></CutterOnly>} />
        <Route path="/treecutter/tree-inventory" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/cutter/tree-inventory" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/treecutter/add-tree" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/cutter/add-tree" element={<CutterOnly><TreeInventoryPage /></CutterOnly>} />
        <Route path="/treecutter/property-inventory" element={<CutterOnly><PropertyInventoryPage /></CutterOnly>} />
        <Route path="/cutter/property-inventory" element={<CutterOnly><PropertyInventoryPage /></CutterOnly>} />

        {/* ── Circular Economy, Waste Processing & Timber Auction Routes ── */}
        <Route path="/timber-auction" element={<TimberAuctionPage />} />
        <Route path="/timber-auctions" element={<TimberAuctionPage />} />
        <Route path="/official/timber-management" element={<OfficialOnly><OfficialTimberManagementPage /></OfficialOnly>} />
        <Route path="/official/timber-auction" element={<OfficialOnly><OfficialTimberManagementPage /></OfficialOnly>} />
        <Route path="/admin/timber-management" element={<AdminOnly><OfficialTimberManagementPage /></AdminOnly>} />
        <Route path="/admin/timber-auction" element={<AdminOnly><OfficialTimberManagementPage /></AdminOnly>} />
        <Route path="/processing" element={<OfficialOnly><ProcessingConsolePage /></OfficialOnly>} />
        <Route path="/processing/dashboard" element={<OfficialOnly><ProcessingConsolePage /></OfficialOnly>} />
        <Route path="/official/processing" element={<OfficialOnly><ProcessingConsolePage /></OfficialOnly>} />
        <Route path="/eco-store" element={<Navigate to="/citizen-dashboard?tab=store" replace />} />

        {/* ── Green Logistics, Delivery Fleet & Payment Desk Routes ── */}
        <Route path="/official/orders-delivery" element={<OfficialOnly><OfficialDeliveryAndPaymentsPage /></OfficialOnly>} />
        <Route path="/official/delivery" element={<OfficialOnly><OfficialDeliveryAndPaymentsPage /></OfficialOnly>} />
        <Route path="/admin/orders-delivery" element={<AdminOnly><OfficialDeliveryAndPaymentsPage /></AdminOnly>} />
        <Route path="/admin/payments-delivery" element={<AdminOnly><OfficialDeliveryAndPaymentsPage /></AdminOnly>} />
        <Route path="/delivery" element={<DeliveryDashboardPage />} />
        <Route path="/delivery/dashboard" element={<DeliveryDashboardPage />} />
        <Route path="/delivery/tasks" element={<DeliveryDashboardPage />} />
        <Route path="/delivery/attendance" element={<DeliveryDashboardPage />} />

        {/* ── Standard / Fallback Routes ── */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/citizen-dashboard" element={<CitizenDashboardPage />} />
        <Route path="/communication" element={<CommunicationPage />} />
        <Route path="/task" element={<CutterOnly><TreeCutterTaskPage /></CutterOnly>} />
        <Route path="/tree-duties" element={<CutterOnly><TreeCutterDutiesPage /></CutterOnly>} />
        <Route path="/report-issue" element={<ReportIssuePage />} />
        <Route path="/scheduler" element={<OfficialOnly><SchedulerPage /></OfficialOnly>} />
        <Route path="/attendance" element={<DynamicAttendanceRoute />} />
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

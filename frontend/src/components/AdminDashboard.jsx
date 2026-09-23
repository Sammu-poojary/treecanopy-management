import React, { useState, useEffect } from 'react';
import { UserCog, Users, Settings, Database, Activity, CheckCircle, Trash2, RefreshCw, Download, Trees, Plus, Check, X, Pencil, Gift, Tag, Clock, ShieldCheck, Heart, CreditCard, Send, Calendar, DollarSign, ExternalLink, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = ({ user, activeTab }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [canopyGoal, setCanopyGoal] = useState(55);
  const [alertThreshold, setAlertThreshold] = useState(30);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [treeCount, setTreeCount] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', scientificName: '', locationText: '', lat: '', lng: '', notes: '' });

  // Subscriptions & Tree Adoptions Admin State
  const [adminSubscriptions, setAdminSubscriptions] = useState([]);
  const [subPaymentReport, setSubPaymentReport] = useState(null);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subFilter, setSubFilter] = useState('all'); // all, subscription, self, active, lapsed, cancelled
  const [sendingReminders, setSendingReminders] = useState(false);
  const [selectedSubDetail, setSelectedSubDetail] = useState(null);

  // Rewards & Redemptions Admin State
  const [adminRedemptions, setAdminRedemptions] = useState([]);
  const [redemptionMetrics, setRedemptionMetrics] = useState({ totalRedemptions: 0, pendingCount: 0, approvedCount: 0, completedCount: 0, totalPointsRedeemed: 0 });
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [catalogueRewards, setCatalogueRewards] = useState([]);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [newRewardForm, setNewRewardForm] = useState({
    name: '',
    description: '',
    pointsRequired: 500,
    rewardType: 'Native Sapling',
    imageUrl: '',
    quantityAvailable: 50,
    redemptionInstructions: '',
    collectionMethod: 'Sector Nursery Pickup'
  });

  const fetchAdminRedemptions = async () => {
    setLoadingRedemptions(true);
    try {
      const res = await fetch(`${API_URL}/api/rewards/admin/redemptions`);
      const data = await res.json();
      if (res.ok) {
        setAdminRedemptions(data.redemptions || []);
        if (data.metrics) setRedemptionMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching admin redemptions:', err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const fetchCatalogueRewards = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rewards`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCatalogueRewards(data);
      }
    } catch (err) {
      console.error('Error fetching rewards catalogue:', err);
    }
  };

  const fetchAdminSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/all`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAdminSubscriptions(data);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchSubPaymentReport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/payment-report`);
      const data = await res.json();
      if (res.ok) setSubPaymentReport(data);
    } catch (err) {
      console.error('Error fetching payment report:', err);
    }
  };

  const handleSendRenewalReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/send-reminders`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Reminders sent: ${data.remindersSent} email(s). Lapsed subscriptions updated: ${data.lapsedMarked}`);
        fetchAdminSubscriptions();
        fetchSubPaymentReport();
      } else {
        showMsg(data.error || 'Failed to send reminders.');
      }
    } catch {
      showMsg('Server error while sending reminders.');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleRevokeSubscription = async (subId, treeName) => {
    if (!window.confirm(`Are you sure you want to cancel / revoke the adoption for "${treeName}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subId}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        showMsg(`Adoption for "${treeName}" has been cancelled and tree released.`);
        fetchAdminSubscriptions();
        fetchSubPaymentReport();
      } else {
        showMsg('Failed to revoke adoption.');
      }
    } catch {
      showMsg('Server error revoking adoption.');
    }
  };

  const handleUpdateRedemptionStatus = async (id, newStatus, currentRewardName) => {
    let notes = '';
    if (newStatus === 'Rejected') {
      notes = prompt(`Enter rejection reason for '${currentRewardName}':`, 'Criteria unfulfilled or out of stock');
      if (notes === null) return;
    } else if (newStatus === 'Ready for Collection') {
      notes = prompt('Add collection details or notes for citizen (optional):', 'Available at Udupi Sector Nursery Desk #2');
      if (notes === null) notes = '';
    }

    try {
      const res = await fetch(`${API_URL}/api/rewards/admin/redemptions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Redemption status updated to '${newStatus}'!`);
        fetchAdminRedemptions();
      } else {
        showMsg(data.msg || 'Failed to update redemption status.');
      }
    } catch {
      showMsg('Server error updating redemption status.');
    }
  };

  const handleCreateReward = async (e) => {
    e.preventDefault();
    if (!newRewardForm.name || !newRewardForm.description || !newRewardForm.pointsRequired) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRewardForm)
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`New reward item '${newRewardForm.name}' added to catalogue!`);
        setShowAddRewardModal(false);
        setNewRewardForm({
          name: '',
          description: '',
          pointsRequired: 500,
          rewardType: 'Native Sapling',
          imageUrl: '',
          quantityAvailable: 50,
          redemptionInstructions: '',
          collectionMethod: 'Sector Nursery Pickup'
        });
        fetchCatalogueRewards();
      } else {
        alert(data.msg || 'Error adding reward');
      }
    } catch {
      alert('Server error creating reward.');
    }
  };

  const handleToggleRewardActive = async (rewardId, currentIsActive) => {
    try {
      const res = await fetch(`${API_URL}/api/rewards/${rewardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentIsActive })
      });
      if (res.ok) {
        showMsg(`Reward catalogue availability updated.`);
        fetchCatalogueRewards();
      }
    } catch {
      showMsg('Server error toggling reward availability.');
    }
  };


  // Fetch users from real MongoDB
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/users`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch {
      // fallback to empty
    }
    setLoadingUsers(false);
  };

  // Fetch complaint stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/complaints/stats`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch { /* ignore */ }
  };

  // Fetch attendance summary
  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_URL}/api/attendance/today-summary`);
      const data = await res.json();
      if (res.ok) setAttendanceSummary(data);
    } catch { /* ignore */ }
  };

  // Fetch tree inventory count
  const fetchTreesCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trees`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTreeCount(data.length);
      }
    } catch { /* ignore */ }
  };

  // Fetch citizen tree registration proposals
  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await fetch(`${API_URL}/api/trees/register-proposals`);
      const data = await res.json();
      if (res.ok && data.proposals) {
        setProposals(data.proposals);
      }
    } catch (err) {
      console.error('Error fetching tree proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchAttendance();
    fetchTreesCount();
    fetchProposals();
    fetchAdminRedemptions();
    fetchCatalogueRewards();
    fetchAdminSubscriptions();
    fetchSubPaymentReport();

    // Auto-sync live metrics every 8 seconds
    const interval = setInterval(() => {
      fetchAttendance();
      fetchStats();
      fetchUsers();
      fetchAdminSubscriptions();
      fetchSubPaymentReport();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleApproveProposal = async (proposalId, treeName) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/register-proposals/${proposalId}/approve`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Tree '${treeName}' verified & added to official GIS inventory! +100 Eco-Pts awarded.`);
        fetchProposals();
        fetchTreesCount();
      } else {
        showMsg(data.msg || 'Approval failed');
      }
    } catch {
      showMsg('Server error approving tree.');
    }
  };

  const handleRejectProposal = async (proposalId, treeName) => {
    const reason = prompt(`Enter rejection reason for '${treeName}':`, 'Information unverified or invalid location');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_URL}/api/trees/register-proposals/${proposalId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`Tree proposal '${treeName}' rejected.`);
        fetchProposals();
      } else {
        showMsg(data.msg || 'Rejection failed');
      }
    } catch {
      showMsg('Server error rejecting tree proposal.');
    }
  };

  const fetchPlaceName = async (lat, lng) => {
    if (!lat || !lng) return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const parts = [
          addr.amenity || addr.building || addr.road || addr.suburb || addr.neighbourhood || addr.residential,
          addr.village || addr.town || addr.city || addr.county || 'Udupi',
          addr.state || 'Karnataka'
        ].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    }
    return null;
  };

  const handleStartEditProposal = async (p) => {
    setEditingProposal(p);
    const initialLocation = p.locationText || '';
    setEditForm({
      name: p.name || '',
      scientificName: p.scientificName || '',
      locationText: initialLocation,
      lat: p.lat || '',
      lng: p.lng || '',
      notes: p.notes || ''
    });

    if (p.lat && p.lng && (initialLocation.includes('Live GPS') || initialLocation.includes('° N') || !initialLocation || initialLocation === 'Udupi Region')) {
      const place = await fetchPlaceName(p.lat, p.lng);
      if (place) {
        setEditForm(prev => ({ ...prev, locationText: place }));
      }
    }
  };

  const handleAutoFetchPlaceName = async () => {
    if (!editForm.lat || !editForm.lng) return;
    const place = await fetchPlaceName(editForm.lat, editForm.lng);
    if (place) {
      setEditForm(prev => ({ ...prev, locationText: place }));
    } else {
      alert('Could not resolve place name for these coordinates.');
    }
  };

  const handleSaveProposalEdits = async (andApprove = false) => {
    if (!editingProposal) return;
    try {
      const url = andApprove
        ? `${API_URL}/api/trees/register-proposals/${editingProposal._id}/approve`
        : `${API_URL}/api/trees/register-proposals/${editingProposal._id}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok) {
        showMsg(andApprove ? `Tree '${editForm.name}' updated & added to official inventory!` : `Proposal details updated successfully.`);
        setEditingProposal(null);
        fetchProposals();
        if (andApprove) fetchTreesCount();
      } else {
        showMsg(data.msg || 'Save failed');
      }
    } catch {
      showMsg('Server error saving proposal changes.');
    }
  };



  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const showMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        showMsg(`Role updated to ${newRole}`);
      } else {
        showMsg(data.msg || 'Failed to update role');
      }
    } catch {
      showMsg('Server error. Please try again.');
    }
  };

  const handleStatusChange = async (userId, newStatus, email) => {
    let reason = '';
    if (newStatus === 'Rejected') {
      const input = prompt(
        `Enter rejection reason for ${email} (this will be sent in their notification email):`,
        'Application credentials and documentation could not be verified by the municipal authority.'
      );
      if (input === null) return; // User cancelled
      reason = input;
    } else if (newStatus === 'Verified') {
      if (!confirm(`Are you sure you want to approve ${email}? An official approval email will be sent immediately.`)) return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus } : u));
        showMsg(
          newStatus === 'Verified'
            ? `User ${email} approved & approval email dispatched!`
            : newStatus === 'Rejected'
            ? `User ${email} rejected & rejection email dispatched!`
            : `User status updated to ${newStatus}`
        );
      } else {
        showMsg(data.msg || 'Failed to update status');
      }
    } catch {
      showMsg('Server error. Please try again.');
    }
  };

  const handleRemoveUser = async (userId, email) => {
    if (!confirm(`Are you sure you want to delete account ${email}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        showMsg('User deleted successfully.');
      } else {
        showMsg('Failed to delete user.');
      }
    } catch {
      showMsg('Server error. Please try again.');
    }
  };

  const handleResetSystem = () => {
    if (confirm('Warning: This will clear all current local data. Proceed?')) {
      localStorage.removeItem('canopyTickets');
      localStorage.removeItem('officialWorkOrders');
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        window.location.reload();
      }, 1500);
    }
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created'];
    const rows = users.map(u => [u.name, u.email, u.phone || '', u.role, u.status || 'Verified', new Date(u.createdAt).toLocaleDateString('en-IN')]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tree-canopy-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAdoptionCSV = () => {
    const headers = ['Certificate', 'Tree Name', 'Citizen Name', 'Citizen Email', 'Phone', 'Type', 'Plan', 'Amount', 'Status', 'Assigned Cutter', 'Renewal Date'];
    const rows = adminSubscriptions.map(s => [
      s.certificateNumber || '',
      s.treeName || '',
      s.userName || '',
      s.userEmail || '',
      s.userPhone || '',
      s.adoptionType || 'subscription',
      s.plan || 'Self-Care',
      s.amount || 0,
      s.status || '',
      s.assignedCutterName || 'Unassigned',
      s.nextRenewalDate ? new Date(s.nextRenewalDate).toLocaleDateString('en-IN') : 'N/A'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tree-adoptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-content">
      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue-tint">
                <Users size={24} />
              </div>
              <div className="stat-details">
                <h3>{users.length}</h3>
                <p>Registered Users</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/tree-inventory')} style={{ cursor: 'pointer' }} title="Click to manage trees in database">
              <div className="stat-icon green-tint">
                <Trees size={24} color="#047857" />
              </div>
              <div className="stat-details">
                <h3>{treeCount}</h3>
                <p>Trees in DB (Add New +)</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint">
                <Activity size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.total}</h3>
                <p>Total Complaints</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red-tint">
                <Database size={24} />
              </div>
              <div className="stat-details">
                <h3>{stats.pending}</h3>
                <p>Pending Complaints</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-tint">
                <Heart size={24} color="#10b981" fill="#10b98122" />
              </div>
              <div className="stat-details">
                <h3>{adminSubscriptions.filter(s => ['active', 'assigned'].includes(s.status)).length}</h3>
                <p>Adopted Trees</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue-tint">
                <DollarSign size={24} color="#059669" />
              </div>
              <div className="stat-details">
                <h3>₹{subPaymentReport?.totalRevenue?.toLocaleString('en-IN') || 0}</h3>
                <p>Adoption Revenue</p>
              </div>
            </div>
          </div>

          {/* Pending Citizen Tree Registration Proposals */}
          <div
            className="data-table-container"
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  🌳 Citizen Tree Registration Proposals ({proposals.filter(p => p.status === 'Pending').length} Pending)
                </h2>
                <p className="table-subtitle" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Citizens scan &amp; submit new trees with photo, species name, and live GPS coordinates for Admin verification.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={fetchProposals}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                <RefreshCw size={14} /> Refresh Requests
              </button>
            </div>

            {loadingProposals ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>Loading tree registration proposals…</p>
            ) : proposals.filter(p => p.status === 'Pending').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                <Trees size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>No pending tree registration proposals to review.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>Tree Photo</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Species Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>GPS Coordinates</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Location Zone</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Citizen Reporter</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Submitted On</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.filter(p => p.status === 'Pending').map(p => {
                      const isPending = p.status === 'Pending';
                      const statusColor = p.status === 'Approved' ? '#10b981' : p.status === 'Pending' ? '#f59e0b' : '#f87171';
                      const statusBg = p.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'Pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';

                      const displayLoc = (p.locationText && !p.locationText.includes('Live GPS') && !p.locationText.includes('° N'))
                        ? p.locationText
                        : `${p.lat ? p.lat.toFixed(4) : ''}°N, ${p.lng ? p.lng.toFixed(4) : ''}°E (Udupi Zone)`;

                      return (
                        <tr key={p._id} style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                onClick={() => setSelectedImagePreview(p.image)}
                                title="Click to enlarge tree photo"
                              />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No Photo</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>{p.name}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{p.scientificName}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <code style={{ background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {p.lat ? p.lat.toFixed(4) : 'N/A'}° N, {p.lng ? p.lng.toFixed(4) : 'N/A'}° E
                            </code>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              📍 {displayLoc}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{p.submittedBy}</strong>
                            {p.submittedByEmail && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{p.submittedByEmail}</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              backgroundColor: statusBg,
                              color: statusColor,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              border: `1px solid ${statusColor}40`,
                              display: 'inline-block'
                            }}>
                              {p.status === 'Pending' ? '⏳ Pending Review' : p.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleStartEditProposal(p)}
                                    style={{
                                      backgroundColor: '#0284c7',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Edit tree proposal details"
                                  >
                                    <Pencil size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleStartEditProposal(p)}
                                    style={{
                                      backgroundColor: '#16a34a',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                                    }}
                                    title="Verify & Add Tree to Official GIS Map Inventory"
                                  >
                                    <Check size={14} /> Verify &amp; Add to Inventory
                                  </button>
                                  <button
                                    onClick={() => handleRejectProposal(p._id, p.name)}
                                    style={{
                                      backgroundColor: '#dc2626',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Reject tree registration request"
                                  >
                                    <X size={13} /> Reject
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Reviewed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 🎁 ECO REWARDS & CITIZEN REDEMPTIONS MANAGEMENT PANEL */}
          <div
            className="data-table-container"
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={22} color="#10b981" /> 🎁 Eco Rewards &amp; Citizen Redemptions ({redemptionMetrics.pendingCount} Pending)
                </h2>
                <p className="table-subtitle" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Manage citizen reward redemptions, update voucher status, and configure the municipal rewards catalogue.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowAddRewardModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  <Plus size={16} /> Add Catalogue Reward
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { fetchAdminRedemptions(); fetchCatalogueRewards(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* Metrics Mini-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Redemptions</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{redemptionMetrics.totalRedemptions}</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>Pending Approval</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{redemptionMetrics.pendingCount}</div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Approved / Ready</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{redemptionMetrics.approvedCount}</div>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <span style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>Total Points Redeemed</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{redemptionMetrics.totalPointsRedeemed.toLocaleString()} Pts</div>
              </div>
            </div>

            {/* Redemptions Table */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Citizen Redemption Requests</h3>
            {loadingRedemptions ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading redemption records…</p>
            ) : adminRedemptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                <Gift size={32} color="#94a3b8" style={{ marginBottom: '6px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>No redemption requests recorded yet.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>Voucher Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Citizen</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Reward Requested</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Pts Spent</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Collection Method</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminRedemptions.map(r => {
                      const isPending = r.status === 'Pending';
                      const isApproved = r.status === 'Approved';
                      const isReady = r.status === 'Ready for Collection' || r.status === 'Plantation Scheduled';
                      const isCompleted = r.status === 'Completed' || r.status === 'Collected';
                      const isRejected = r.status === 'Rejected';

                      let badgeBg = 'rgba(245, 158, 11, 0.15)'; let badgeColor = '#f59e0b';
                      if (isApproved || isReady) { badgeBg = 'rgba(16, 185, 129, 0.15)'; badgeColor = '#10b981'; }
                      else if (isCompleted) { badgeBg = 'rgba(59, 130, 246, 0.15)'; badgeColor = '#3b82f6'; }
                      else if (isRejected) { badgeBg = 'rgba(239, 68, 68, 0.15)'; badgeColor = '#f87171'; }

                      return (
                        <tr key={r._id} style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <code style={{ background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                              {r.redemptionCode}
                            </code>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{r.userName || 'Citizen'}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.userEmail}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#10b981', display: 'block' }}>{r.rewardNameSnapshot}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Type: {r.rewardTypeSnapshot}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>-{r.pointsSpent} Pts</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>📍 {r.collectionMethodSnapshot || 'Nursery Pickup'}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-block' }}>
                              {r.status}
                            </span>
                            {r.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>Note: {r.notes}</div>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {isPending && (
                                <button
                                  onClick={() => handleUpdateRedemptionStatus(r._id, 'Approved', r.rewardNameSnapshot)}
                                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Approve
                                </button>
                              )}
                              {(isPending || isApproved) && (
                                <button
                                  onClick={() => handleUpdateRedemptionStatus(r._id, 'Ready for Collection', r.rewardNameSnapshot)}
                                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Mark Ready
                                </button>
                              )}
                              {!isCompleted && !isRejected && (
                                <button
                                  onClick={() => handleUpdateRedemptionStatus(r._id, 'Completed', r.rewardNameSnapshot)}
                                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Complete
                                </button>
                              )}
                              {!isCompleted && !isRejected && (
                                <button
                                  onClick={() => handleUpdateRedemptionStatus(r._id, 'Rejected', r.rewardNameSnapshot)}
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit / Verify Tree Proposal Details Modal */}
          {editingProposal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 99999,
                display: 'grid',
                placeItems: 'center',
                padding: '20px'
              }}
            >
              <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '16px', maxWidth: '560px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={20} color="#16a34a" /> Verify Tree &amp; Add to Inventory
                  </h3>
                  <button onClick={() => setEditingProposal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Proposal Summary Card */}
                {editingProposal.image && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <img src={editingProposal.image} alt={editingProposal.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{editingProposal.name}</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{editingProposal.scientificName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>Reporter: {editingProposal.submittedBy}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Common Tree Name:</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Scientific Name:</label>
                    <input
                      type="text"
                      value={editForm.scientificName}
                      onChange={(e) => setEditForm({ ...editForm, scientificName: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Location Zone / Place Name:</label>
                      <button
                        type="button"
                        onClick={handleAutoFetchPlaceName}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Auto-detect place name from GPS coordinates"
                      >
                        📍 Auto-Detect Place Name
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editForm.locationText}
                      onChange={(e) => setEditForm({ ...editForm, locationText: e.target.value })}
                      placeholder="e.g. Kaup / Ajjarkadu Park, Udupi"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Latitude (°N):</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editForm.lat}
                        onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Longitude (°E):</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editForm.lng}
                        onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Notes / Inventory Details:</label>
                    <textarea
                      rows="2"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setEditingProposal(null)}
                    style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveProposalEdits(false)}
                    style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    💾 Save Draft Edits
                  </button>
                  <button
                    onClick={() => handleSaveProposalEdits(true)}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
                  >
                    ✅ Confirm &amp; Add to Inventory
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Add New Catalogue Reward Modal */}
          {showAddRewardModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 99999,
                display: 'grid',
                placeItems: 'center',
                padding: '20px'
              }}
            >
              <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '16px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={20} color="#16a34a" /> Add New Reward to Catalogue
                  </h3>
                  <button onClick={() => setShowAddRewardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateReward} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reward Title / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solar Garden Light"
                      value={newRewardForm.name}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description *</label>
                    <textarea
                      required
                      rows="2"
                      placeholder="Brief details about what the citizen receives upon redeeming points..."
                      value={newRewardForm.description}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, description: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Eco-Points Required *</label>
                      <input
                        type="number"
                        min="10"
                        required
                        value={newRewardForm.pointsRequired}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, pointsRequired: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category / Type</label>
                      <select
                        value={newRewardForm.rewardType}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, rewardType: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      >
                        <option value="Native Sapling">Native Sapling</option>
                        <option value="Native Seed Kit">Native Seed Kit</option>
                        <option value="Tree Care Kit">Tree Care Kit</option>
                        <option value="Special Certificate">Special Certificate</option>
                        <option value="Tree Plantation Sponsorship">Tree Plantation Sponsorship</option>
                        <option value="Adopt Another Tree">Adopt Another Tree</option>
                        <option value="Community Plantation">Community Plantation</option>
                        <option value="Digital / Voucher">Digital / Voucher</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Stock Available (Optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50"
                        value={newRewardForm.quantityAvailable || ''}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, quantityAvailable: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Collection Method</label>
                      <input
                        type="text"
                        placeholder="e.g. Nursery Pickup"
                        value={newRewardForm.collectionMethod}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, collectionMethod: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newRewardForm.imageUrl}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, imageUrl: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Redemption Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Present code at Municipal Forestry Office"
                      value={newRewardForm.redemptionInstructions}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, redemptionInstructions: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-surface))', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddRewardModal(false)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                    >
                      Save Reward Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Photo Modal Preview */}
          {selectedImagePreview && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                zIndex: 99999,
                display: 'grid',
                placeItems: 'center',
                padding: '20px'
              }}
              onClick={() => setSelectedImagePreview(null)}
            >
              <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '16px', maxWidth: '600px', width: '100%', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Citizen Submitted Tree Photo Preview</h4>
                <img src={selectedImagePreview} alt="Enlarged" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
                <button
                  onClick={() => setSelectedImagePreview(null)}
                  style={{ marginTop: '14px', padding: '8px 16px', borderRadius: '8px', background: 'var(--brand-deep)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}


          {/* Attendance Summary */}
          {attendanceSummary && (
            <div
              style={{
                marginTop: '1.5rem',
                marginBottom: '1.5rem',
                background: 'var(--bg-surface)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Today's Workforce &amp; Attendance Summary
                    </h2>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Date: {attendanceSummary.date}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 12px', borderRadius: '99px', fontWeight: 700 }}>
                  ● Live Sync
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCog size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {attendanceSummary.officialCount}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Officials Present
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {attendanceSummary.cutterCount}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Cutters Present
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                      {attendanceSummary.total}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Total Present
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
                      {stats.resolved}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Resolved Complaints
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Performance Info */}
          <div
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <h2 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Canopy Monitoring Coverage
            </h2>
            <div className="canopy-target-wrapper">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: '100%' }}>100% Area Monitored</div>
              </div>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: 0 }}>
              All municipal sectors are covered by satellite analysis pipelines. Sensor health check reports green across 24 regional gateway beacons.
            </p>
          </div>

          {/* Tree Adoption & Care Subscriptions Governance Panel */}
          <div
            className="data-table-container"
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Heart size={20} />
                  </div>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem' }}>Tree Adoptions & Care Subscriptions</h2>
                    <p className="table-subtitle" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                      Monitor citizen tree adoptions, automated cutter assignments, recurring renewal dates, and revenue.
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={handleSendRenewalReminders}
                  disabled={sendingReminders}
                  title="Scan for upcoming renewals in next 3 days and send email notifications"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)',
                    color: '#10b981', cursor: sendingReminders ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600
                  }}
                >
                  <Send size={15} /> {sendingReminders ? 'Sending...' : 'Send Renewal Reminders'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={exportAdoptionCSV}
                  title="Export all adoption records to CSV"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <Download size={15} /> Export CSV
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { fetchAdminSubscriptions(); fetchSubPaymentReport(); }}
                  title="Refresh adoptions list"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Adoptions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{adminSubscriptions.length}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Active Care</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {adminSubscriptions.filter(s => ['active', 'assigned'].includes(s.status)).length}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>Paid Subscriptions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                  {adminSubscriptions.filter(s => s.adoptionType === 'subscription').length}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#eab308', textTransform: 'uppercase', fontWeight: 700 }}>Self-Care Pledges</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308', marginTop: '4px' }}>
                  {adminSubscriptions.filter(s => s.adoptionType === 'self').length}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#a855f7', textTransform: 'uppercase', fontWeight: 700 }}>Revenue Collected</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
                  ₹{subPaymentReport?.totalRevenue?.toLocaleString('en-IN') || 0}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${adminSubscriptions.length})` },
                { id: 'subscription', label: `Paid (${adminSubscriptions.filter(s => s.adoptionType === 'subscription').length})` },
                { id: 'self', label: `Self-Care Pledge (${adminSubscriptions.filter(s => s.adoptionType === 'self').length})` },
                { id: 'active', label: `Active (${adminSubscriptions.filter(s => ['active', 'assigned'].includes(s.status)).length})` },
                { id: 'lapsed', label: `Lapsed (${adminSubscriptions.filter(s => s.status === 'lapsed').length})` },
                { id: 'cancelled', label: `Cancelled (${adminSubscriptions.filter(s => s.status === 'cancelled').length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSubFilter(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: subFilter === tab.id ? '#10b981' : 'var(--border)',
                    background: subFilter === tab.id ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                    color: subFilter === tab.id ? '#10b981' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            {loadingSubscriptions ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>Loading adoption records...</p>
            ) : adminSubscriptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                <Heart size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No trees adopted yet.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Citizens can adopt trees from the View Tree page with self-care pledge or municipal subscription.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tree & Certificate</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Citizen</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type / Plan</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned Cutter</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Next Renewal</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSubscriptions
                      .filter(s => {
                        if (subFilter === 'subscription') return s.adoptionType === 'subscription';
                        if (subFilter === 'self') return s.adoptionType === 'self';
                        if (subFilter === 'active') return ['active', 'assigned'].includes(s.status);
                        if (subFilter === 'lapsed') return s.status === 'lapsed';
                        if (subFilter === 'cancelled') return s.status === 'cancelled';
                        return true;
                      })
                      .map(sub => (
                        <tr key={sub._id} style={{ background: 'var(--bg-card, var(--bg-surface))', borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {sub.treeImage ? (
                                <img src={sub.treeImage} alt={sub.treeName} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                  <Trees size={20} />
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{sub.treeName || 'Adopted Tree'}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub.treeScientificName || sub.treeLocation || 'Sector Area'}</div>
                                {sub.certificateNumber && (
                                  <span style={{ display: 'inline-block', marginTop: '2px', fontSize: '0.72rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {sub.certificateNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{sub.userName || 'Citizen'}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{sub.userEmail || '-'}</div>
                            {sub.userPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📞 {sub.userPhone}</div>}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {sub.adoptionType === 'self' ? (
                              <div>
                                <span style={{ background: 'rgba(234,179,8,0.15)', color: '#ca8a04', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                                  🌱 Self-Care Pledge
                                </span>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Citizen Commitment</div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                                  💳 {sub.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                                </span>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>₹{sub.amount || 0}</div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {sub.assignedCutterName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={14} color="#10b981" />
                                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.assignedCutterName}</span>
                              </div>
                            ) : sub.adoptionType === 'self' ? (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Citizen Self-Care</span>
                            ) : (
                              <span style={{ fontSize: '0.78rem', background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            {sub.nextRenewalDate ? (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(sub.nextRenewalDate).toLocaleDateString('en-IN')}</div>
                                <div style={{ fontSize: '0.74rem', color: new Date(sub.nextRenewalDate) < new Date() ? '#ef4444' : '#10b981' }}>
                                  {new Date(sub.nextRenewalDate) < new Date() ? 'Renewal Overdue' : 'Active Period'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {sub.createdAt ? `Adopted ${new Date(sub.createdAt).toLocaleDateString('en-IN')}` : 'Active'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                background:
                                  sub.status === 'active' ? 'rgba(16,185,129,0.15)' :
                                  sub.status === 'assigned' ? 'rgba(59,130,246,0.15)' :
                                  sub.status === 'lapsed' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                                color:
                                  sub.status === 'active' ? '#10b981' :
                                  sub.status === 'assigned' ? '#3b82f6' :
                                  sub.status === 'lapsed' ? '#ef4444' : '#6b7280',
                              }}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setSelectedSubDetail(sub)}
                                title="View care activity and tasks"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-elevated)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Eye size={13} /> View
                              </button>
                              {['active', 'assigned'].includes(sub.status) && (
                                <button
                                  onClick={() => handleRevokeSubscription(sub._id, sub.treeName)}
                                  title="Revoke adoption and release tree"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 600
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Adoption Detail & Care Tasks Modal */}
          {selectedSubDetail && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
              onClick={() => setSelectedSubDetail(null)}
            >
              <div
                style={{
                  background: 'var(--bg-surface, #1e293b)',
                  borderRadius: '16px',
                  maxWidth: '650px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '24px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Adoption & Care Record</h3>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
                      Certificate: {selectedSubDetail.certificateNumber || 'N/A'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSubDetail(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TREE NAME</div>
                    <div style={{ fontWeight: 700 }}>{selectedSubDetail.treeName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ADOPTER</div>
                    <div style={{ fontWeight: 700 }}>{selectedSubDetail.userName} ({selectedSubDetail.userEmail})</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ADOPTION TYPE</div>
                    <div style={{ fontWeight: 700 }}>{selectedSubDetail.adoptionType === 'self' ? '🌱 Self-Care Pledge' : `💳 Paid ${selectedSubDetail.plan}`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ASSIGNED ARBORIST</div>
                    <div style={{ fontWeight: 700 }}>{selectedSubDetail.assignedCutterName || 'None / Self-Care'}</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Care Tasks & Field Proofs ({selectedSubDetail.careTasks?.length || 0})</h4>
                {(!selectedSubDetail.careTasks || selectedSubDetail.careTasks.length === 0) ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                    No care activity proofs uploaded yet by the arborist.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {selectedSubDetail.careTasks.map((task, idx) => (
                      <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: 'var(--bg-card, var(--bg-surface))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{task.taskType}</span>
                          <span style={{ fontSize: '0.75rem', background: task.status === 'Validated' ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)', color: task.status === 'Validated' ? '#10b981' : '#ca8a04', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                            {task.status || 'Pending'}
                          </span>
                        </div>
                        {task.description && <p style={{ fontSize: '0.84rem', margin: '6px 0', color: 'var(--text-secondary)' }}>{task.description}</p>}
                        {task.proofImageUrl && (
                          <div style={{ marginTop: '8px' }}>
                            <img src={task.proofImageUrl} alt="Care Proof" style={{ maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          Uploaded by {task.uploadedByName || 'Tree Cutter'} • {new Date(task.uploadedAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedSubDetail(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <div className="data-table-container" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', color: 'var(--text-primary)' }}>
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0' }}>User Account Directory</h2>
              <p className="table-subtitle" style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage user roles, approve pending tree cutters, or remove accounts.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={fetchUsers} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                <RefreshCw size={15} /> Refresh
              </button>
              <button className="btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>

          {actionMsg && (
            <div className="success-alert" style={{ marginBottom: '1rem' }}>
              <CheckCircle size={18} />
              <span>{actionMsg}</span>
            </div>
          )}

          {loadingUsers ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>Loading users from database…</p>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: '24px' }}>No users found in database.</td></tr>
                  ) : users.map(u => {
                    const status = u.status || 'Verified';
                    const statusColor = status === 'Verified' ? '#16a34a' : status === 'Pending' ? '#d97706' : '#dc2626';
                    const statusBg = status === 'Verified' ? '#f0fdf4' : status === 'Pending' ? '#fffbeb' : '#fef2f2';

                    return (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td>{u.phone || 'N/A'}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="role-selector-admin"
                          >
                            <option value="Citizen">Citizen</option>
                            <option value="Official">Official</option>
                            <option value="Tree Cutter">Tree Cutter</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: statusBg,
                            color: statusColor,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '0.8rem',
                            border: `1px solid ${statusColor}40`,
                            display: 'inline-block'
                          }}>
                            {status}
                          </span>
                        </td>
                        <td><small>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {status !== 'Verified' && (
                              <button
                                onClick={() => handleStatusChange(u._id, 'Verified', u.email)}
                                style={{
                                  backgroundColor: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Approve User & Send Email"
                              >
                                <Check size={14} /> Approve
                              </button>
                            )}
                            {status !== 'Rejected' && (
                              <button
                                onClick={() => handleStatusChange(u._id, 'Rejected', u.email)}
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Reject Registration & Send Email"
                              >
                                <X size={14} /> Reject
                              </button>
                            )}
                            <button
                              className="btn-delete"
                              onClick={() => handleRemoveUser(u._id, u.email)}
                              title="Delete User Account"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="form-card-container">
          <div className="form-card">
            <h2>System Configurations</h2>
            <p className="form-subtitle">Tweak environmental metrics and administrative behaviors.</p>

            {resetSuccess && (
              <div className="success-alert" style={{ marginBottom: '1.5rem' }}>
                <CheckCircle size={20} />
                <span>System reset successful. Reloading details...</span>
              </div>
            )}

            <div className="settings-fields">
              <div className="form-group">
                <label>Municipal Canopy Coverage Goal: <strong>{canopyGoal}%</strong></label>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={canopyGoal}
                  onChange={(e) => setCanopyGoal(e.target.value)}
                  className="settings-slider"
                />
              </div>

              <div className="form-group">
                <label>Regional Alarm/Warning Threshold (AQI Index): <strong>{alertThreshold}</strong></label>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="settings-slider"
                />
              </div>

              <div className="detail-divider"></div>

              <div className="form-group" style={{ marginTop: '2rem' }}>
                <h3>Database Maintenance</h3>
                <p style={{ color: '#4b5563', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Clear local cached data (work orders, tickets). MongoDB records are not affected.
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleResetSystem}
                >
                  Reset Local Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

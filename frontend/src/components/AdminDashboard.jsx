import React, { useState, useEffect } from 'react';
import { UserCog, Users, Settings, Database, Activity, CheckCircle, Trash2, RefreshCw, Download, Trees, Plus, Check, X, Pencil, Gift, Tag, Clock, ShieldCheck } from 'lucide-react';
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
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus } : u));
        showMsg(newStatus === 'Verified' ? `User ${email} approved & email sent successfully!` : `User status updated to ${newStatus}`);
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
          </div>
          {/* Pending Citizen Tree Registration Proposals */}
          <div
            className="data-table-container"
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              color: '#0f172a'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  🌳 Citizen Tree Registration Proposals ({proposals.filter(p => p.status === 'Pending').length} Pending)
                </h2>
                <p className="table-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Citizens scan &amp; submit new trees with photo, species name, and live GPS coordinates for Admin verification.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={fetchProposals}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
              >
                <RefreshCw size={14} /> Refresh Requests
              </button>
            </div>

            {loadingProposals ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>Loading tree registration proposals…</p>
            ) : proposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                <Trees size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>No tree registration proposals submitted yet.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#475569' }}>
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
                    {proposals.map(p => {
                      const isPending = p.status === 'Pending';
                      const statusColor = p.status === 'Approved' ? '#16a34a' : p.status === 'Pending' ? '#d97706' : '#dc2626';
                      const statusBg = p.status === 'Approved' ? '#f0fdf4' : p.status === 'Pending' ? '#fffbeb' : '#fef2f2';

                      const displayLoc = (p.locationText && !p.locationText.includes('Live GPS') && !p.locationText.includes('° N'))
                        ? p.locationText
                        : `${p.lat ? p.lat.toFixed(4) : ''}°N, ${p.lng ? p.lng.toFixed(4) : ''}°E (Udupi Zone)`;

                      return (
                        <tr key={p._id} style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                onClick={() => setSelectedImagePreview(p.image)}
                                title="Click to enlarge tree photo"
                              />
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No Photo</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{p.name}</strong>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{p.scientificName}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>
                              {p.lat ? p.lat.toFixed(4) : 'N/A'}° N, {p.lng ? p.lng.toFixed(4) : 'N/A'}° E
                            </code>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              📍 {displayLoc}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{p.submittedBy}</strong>
                            {p.submittedByEmail && <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.submittedByEmail}</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
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
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              color: '#0f172a'
            }}
          >
            <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={22} color="#16a34a" /> 🎁 Eco Rewards &amp; Citizen Redemptions ({redemptionMetrics.pendingCount} Pending)
                </h2>
                <p className="table-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            {/* Metrics Mini-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Redemptions</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{redemptionMetrics.totalRedemptions}</div>
              </div>
              <div style={{ background: '#fffbeb', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>Pending Approval</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{redemptionMetrics.pendingCount}</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>Approved / Ready</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{redemptionMetrics.approvedCount}</div>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>Total Points Redeemed</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{redemptionMetrics.totalPointsRedeemed.toLocaleString()} Pts</div>
              </div>
            </div>

            {/* Redemptions Table */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>Citizen Redemption Requests</h3>
            {loadingRedemptions ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading redemption records…</p>
            ) : adminRedemptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                <Gift size={32} color="#94a3b8" style={{ marginBottom: '6px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>No redemption requests recorded yet.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#475569' }}>
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

                      let badgeBg = '#fffbeb'; let badgeColor = '#b45309';
                      if (isApproved || isReady) { badgeBg = '#f0fdf4'; badgeColor = '#16a34a'; }
                      else if (isCompleted) { badgeBg = '#eff6ff'; badgeColor = '#2563eb'; }
                      else if (isRejected) { badgeBg = '#fef2f2'; badgeColor = '#dc2626'; }

                      return (
                        <tr key={r._id} style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                              {r.redemptionCode}
                            </code>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{r.userName || 'Citizen'}</strong>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.userEmail}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#16a34a', display: 'block' }}>{r.rewardNameSnapshot}</strong>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Type: {r.rewardTypeSnapshot}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>-{r.pointsSpent} Pts</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#334155' }}>📍 {r.collectionMethodSnapshot || 'Nursery Pickup'}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-block' }}>
                              {r.status}
                            </span>
                            {r.notes && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>Note: {r.notes}</div>}
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
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', maxWidth: '560px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={20} color="#16a34a" /> Verify Tree &amp; Add to Inventory
                  </h3>
                  <button onClick={() => setEditingProposal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Proposal Summary Card */}
                {editingProposal.image && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <img src={editingProposal.image} alt={editingProposal.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{editingProposal.name}</strong>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>{editingProposal.scientificName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>Reporter: {editingProposal.submittedBy}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Common Tree Name:</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Scientific Name:</label>
                    <input
                      type="text"
                      value={editForm.scientificName}
                      onChange={(e) => setEditForm({ ...editForm, scientificName: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Location Zone / Place Name:</label>
                      <button
                        type="button"
                        onClick={handleAutoFetchPlaceName}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
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
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Latitude (°N):</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editForm.lat}
                        onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Longitude (°E):</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editForm.lng}
                        onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Notes / Inventory Details:</label>
                    <textarea
                      rows="2"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setEditingProposal(null)}
                    style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
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
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={20} color="#16a34a" /> Add New Reward to Catalogue
                  </h3>
                  <button onClick={() => setShowAddRewardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateReward} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Reward Title / Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solar Garden Light"
                      value={newRewardForm.name}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Description *</label>
                    <textarea
                      required
                      rows="2"
                      placeholder="Brief details about what the citizen receives upon redeeming points..."
                      value={newRewardForm.description}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, description: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Eco-Points Required *</label>
                      <input
                        type="number"
                        min="10"
                        required
                        value={newRewardForm.pointsRequired}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, pointsRequired: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Category / Type</label>
                      <select
                        value={newRewardForm.rewardType}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, rewardType: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
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
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Stock Available (Optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50"
                        value={newRewardForm.quantityAvailable || ''}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, quantityAvailable: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Collection Method</label>
                      <input
                        type="text"
                        placeholder="e.g. Nursery Pickup"
                        value={newRewardForm.collectionMethod}
                        onChange={(e) => setNewRewardForm({ ...newRewardForm, collectionMethod: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newRewardForm.imageUrl}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, imageUrl: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Redemption Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Present code at Municipal Forestry Office"
                      value={newRewardForm.redemptionInstructions}
                      onChange={(e) => setNewRewardForm({ ...newRewardForm, redemptionInstructions: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddRewardModal(false)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
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
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Citizen Submitted Tree Photo Preview</h4>
                <img src={selectedImagePreview} alt="Enlarged" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
                <button
                  onClick={() => setSelectedImagePreview(null)}
                  style={{ marginTop: '14px', padding: '8px 16px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}


          {/* Attendance Summary */}
          {attendanceSummary && (
            <div className="info-section">
              <div className="info-card">
                <h2>Today's Attendance Summary — {attendanceSummary.date}</h2>
                <div className="metrics-grid">
                  <div className="metric-box">
                    <span className="value">{attendanceSummary.officialCount}</span>
                    <span className="label">Officials Present</span>
                  </div>
                  <div className="metric-box">
                    <span className="value">{attendanceSummary.cutterCount}</span>
                    <span className="label">Cutters Present</span>
                  </div>
                  <div className="metric-box">
                    <span className="value">{attendanceSummary.total}</span>
                    <span className="label">Total Present</span>
                  </div>
                  <div className="metric-box text-success">
                    <span className="value">{stats.resolved}</span>
                    <span className="label">Resolved Complaints</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Performance Info */}
          <div className="info-section">
            <div className="info-card">
              <h2>Canopy Monitoring Coverage</h2>
              <div className="canopy-target-wrapper">
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '100%' }}>100% Area Monitored</div>
                </div>
              </div>
              <p style={{ marginTop: '1rem', color: '#4b5563', fontSize: '0.95rem' }}>All municipal sectors are covered by satellite analysis pipelines. Sensor health check reports green across 24 regional gateway beacons.</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="data-table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2>User Account Directory</h2>
              <p className="table-subtitle">Manage user roles, approve pending tree cutters, or remove accounts.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={fetchUsers} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                <RefreshCw size={15} /> Refresh
              </button>
              <button className="btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
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
                            {status === 'Pending' && (
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
                            {status === 'Pending' && (
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
                                title="Reject Registration"
                              >
                                <X size={14} /> Reject
                              </button>
                            )}
                            {status !== 'Pending' && (
                              <button
                                className="btn-delete"
                                onClick={() => handleRemoveUser(u._id, u.email)}
                                title="Delete User Account"
                              >
                                <Trash2 size={16} />
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

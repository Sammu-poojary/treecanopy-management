import React, { useState, useEffect } from 'react';
import { UserCog, Users, Settings, Database, Activity, CheckCircle, Trash2, RefreshCw, Download, Trees, Plus, Check, X } from 'lucide-react';
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

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchAttendance();
    fetchTreesCount();
  }, []);

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

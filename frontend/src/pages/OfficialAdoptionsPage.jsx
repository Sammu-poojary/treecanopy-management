import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TreePine,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  ExternalLink,
  Camera,
  RefreshCw,
  X,
  CalendarDays,
  ShieldCheck,
  Trash2,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  HeartHandshake
} from 'lucide-react';
import { Sidebar, Topbar } from './CanopyPages';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OfficialAdoptionsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adoptions, setAdoptions] = useState([]);
  const [cutters, setCutters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, needs_cutter, pending_proofs, subscription, self, lapsed
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [assignModalSub, setAssignModalSub] = useState(null);
  const [selectedCutterId, setSelectedCutterId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [careActivitySub, setCareActivitySub] = useState(null);
  const [auditTask, setAuditTask] = useState(null);
  const [auditNote, setAuditNote] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  const fetchAdoptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/all`);
      if (res.ok) {
        const data = await res.json();
        setAdoptions(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch adoptions:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching adoptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCutters = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/cutters`);
      if (res.ok) {
        const data = await res.json();
        setCutters(data.cutters || []);
      }
    } catch (err) {
      console.error('Error fetching cutters:', err);
    }
  };

  useEffect(() => {
    fetchAdoptions();
    fetchCutters();
  }, []);

  const notify = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4500);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = adoptions.length;
    const needsCutter = adoptions.filter(a => ['active', 'subscription'].includes(a.status) && !a.assignedCutterId && a.adoptionType === 'subscription').length;
    let pendingProofsCount = 0;
    adoptions.forEach(a => {
      if (a.careTasks && Array.isArray(a.careTasks)) {
        pendingProofsCount += a.careTasks.filter(t => t.status === 'Pending').length;
      }
    });
    const municipalSubs = adoptions.filter(a => a.adoptionType === 'subscription' && ['active', 'assigned'].includes(a.status)).length;
    const selfAdoptions = adoptions.filter(a => a.adoptionType === 'self' && a.status === 'active').length;
    return { total, needsCutter, pendingProofsCount, municipalSubs, selfAdoptions };
  }, [adoptions]);

  // Filtered adoptions
  const filteredAdoptions = useMemo(() => {
    return adoptions.filter(a => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        (a.treeName && a.treeName.toLowerCase().includes(q)) ||
        (a.treeScientificName && a.treeScientificName.toLowerCase().includes(q)) ||
        (a.userName && a.userName.toLowerCase().includes(q)) ||
        (a.userEmail && a.userEmail.toLowerCase().includes(q)) ||
        (a.certificateNumber && a.certificateNumber.toLowerCase().includes(q)) ||
        (a.treeLocation && a.treeLocation.toLowerCase().includes(q)) ||
        (a.assignedCutterName && a.assignedCutterName.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (activeFilter === 'needs_cutter') {
        return !a.assignedCutterId && a.adoptionType === 'subscription' && ['active', 'assigned'].includes(a.status);
      }
      if (activeFilter === 'pending_proofs') {
        return a.careTasks && a.careTasks.some(t => t.status === 'Pending');
      }
      if (activeFilter === 'subscription') {
        return a.adoptionType === 'subscription';
      }
      if (activeFilter === 'self') {
        return a.adoptionType === 'self';
      }
      if (activeFilter === 'lapsed') {
        return ['lapsed', 'cancelled'].includes(a.status);
      }
      return true;
    });
  }, [adoptions, searchTerm, activeFilter]);

  // Handle assign cutter
  const handleAssignCutter = async (e) => {
    e.preventDefault();
    if (!assignModalSub || !selectedCutterId) return;

    const chosenCutter = cutters.find(c => (c._id || c.id) === selectedCutterId);
    const cutterName = chosenCutter ? (chosenCutter.name || chosenCutter.username) : 'Tree Cutter';

    setIsAssigning(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${assignModalSub._id}/assign-cutter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutterId: selectedCutterId,
          cutterName,
          assignedById: currentUser._id || null,
          assignedByName: currentUser.name || 'Municipal Official',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdoptions(prev => prev.map(a => a._id === assignModalSub._id ? data.subscription : a));
        notify(`✅ Successfully assigned ${cutterName} to tree "${assignModalSub.treeName}"!`);
        setAssignModalSub(null);
        setSelectedCutterId('');
      } else {
        alert(data.error || 'Failed to assign cutter');
      }
    } catch (err) {
      alert('Error assigning cutter: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle audit care proof
  const handleAuditProof = async (status) => {
    if (!careActivitySub || !auditTask) return;
    setIsAuditing(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${careActivitySub._id}/tasks/${auditTask._id}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          validationNote: auditNote,
          validatedById: currentUser._id || null,
          validatedByName: currentUser.name || 'Municipal Official',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdoptions(prev => prev.map(a => a._id === careActivitySub._id ? data.subscription : a));
        setCareActivitySub(data.subscription);
        setAuditTask(null);
        setAuditNote('');
        notify(`✅ Care proof marked as ${status}!`);
      } else {
        alert(data.error || 'Failed to validate care task');
      }
    } catch (err) {
      alert('Error auditing care proof: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  // Handle cancel adoption
  const handleCancelAdoption = async (sub) => {
    if (!window.confirm(`Are you sure you want to release and cancel adoption for "${sub.treeName}"? This will free the tree for other citizens.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${sub._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdoptions(prev => prev.map(a => a._id === sub._id ? data.subscription : a));
        notify(`Tree "${sub.treeName}" adoption has been cancelled and released.`);
      } else {
        alert(data.error || 'Failed to cancel adoption');
      }
    } catch (err) {
      alert('Error cancelling adoption: ' + err.message);
    }
  };

  return (
    <div className="cg-app" style={{ minHeight: '100vh', background: 'var(--bg-app, #f8fafc)' }}>
      <Sidebar active="Tree Adoptions" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <div className="cg-workspace" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Topbar title="Official Tree Adoptions & Care Supervision" onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="cg-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Status Message */}
          {statusMsg && (
            <div style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '12px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(5,150,105,0.1)'
            }}>
              <CheckCircle2 size={20} color="#059669" />
              {statusMsg}
            </div>
          )}

          {/* Page Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  <HeartHandshake size={22} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.02em' }}>
                    Tree Adoptions & Municipal Care Supervision
                  </h1>
                  <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
                    Supervise citizen adoptions, dispatch arborists/cutters, and validate field care activity proof photos.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={fetchAdoptions}
                className="btn-refresh"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#334155',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Data
              </button>
              <Link
                to="/official/scheduler"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.25)'
                }}
              >
                <CalendarDays size={16} /> Work Schedules
              </Link>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            {/* Total */}
            <div
              onClick={() => setActiveFilter('all')}
              style={{
                background: '#ffffff',
                padding: '18px 20px',
                borderRadius: '16px',
                border: activeFilter === 'all' ? '2px solid #10b981' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Adoptions
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TreePine size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Across all municipal sectors</div>
            </div>

            {/* Needs Cutter */}
            <div
              onClick={() => setActiveFilter('needs_cutter')}
              style={{
                background: stats.needsCutter > 0 ? '#fffbeb' : '#ffffff',
                padding: '18px 20px',
                borderRadius: '16px',
                border: activeFilter === 'needs_cutter' ? '2px solid #f59e0b' : (stats.needsCutter > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0'),
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Needs Cutter
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stats.needsCutter > 0 ? '#b45309' : '#0f172a' }}>
                {stats.needsCutter}
              </div>
              <div style={{ fontSize: '0.78rem', color: stats.needsCutter > 0 ? '#b45309' : '#64748b', marginTop: '4px', fontWeight: stats.needsCutter > 0 ? 600 : 400 }}>
                {stats.needsCutter > 0 ? '⚠️ Awaiting arborist dispatch' : 'All subscriptions staffed'}
              </div>
            </div>

            {/* Pending Proofs Audit */}
            <div
              onClick={() => setActiveFilter('pending_proofs')}
              style={{
                background: stats.pendingProofsCount > 0 ? '#fef2f2' : '#ffffff',
                padding: '18px 20px',
                borderRadius: '16px',
                border: activeFilter === 'pending_proofs' ? '2px solid #ef4444' : (stats.pendingProofsCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0'),
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Care Proofs Review
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stats.pendingProofsCount > 0 ? '#dc2626' : '#0f172a' }}>
                {stats.pendingProofsCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: stats.pendingProofsCount > 0 ? '#dc2626' : '#64748b', marginTop: '4px', fontWeight: stats.pendingProofsCount > 0 ? 600 : 400 }}>
                {stats.pendingProofsCount > 0 ? '⚠️ Field logs pending validation' : 'All maintenance logs verified'}
              </div>
            </div>

            {/* Municipal Subscriptions */}
            <div
              onClick={() => setActiveFilter('subscription')}
              style={{
                background: '#ffffff',
                padding: '18px 20px',
                borderRadius: '16px',
                border: activeFilter === 'subscription' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Municipal Care Plans
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>{stats.municipalSubs}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Paid monthly & yearly sponsors</div>
            </div>

            {/* Citizen Self-Care */}
            <div
              onClick={() => setActiveFilter('self')}
              style={{
                background: '#ffffff',
                padding: '18px 20px',
                borderRadius: '16px',
                border: activeFilter === 'self' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Citizen Self-Care
                </span>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={18} />
                </span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>{stats.selfAdoptions}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Free solemn stewardship pledges</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{
            background: '#ffffff',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { id: 'all', label: 'All Adoptions', count: stats.total },
                { id: 'needs_cutter', label: 'Needs Cutter', count: stats.needsCutter, badgeColor: '#f59e0b' },
                { id: 'pending_proofs', label: 'Pending Care Proofs', count: stats.pendingProofsCount, badgeColor: '#ef4444' },
                { id: 'subscription', label: 'Municipal Plans', count: stats.municipalSubs },
                { id: 'self', label: 'Citizen Pledges', count: stats.selfAdoptions },
                { id: 'lapsed', label: 'Lapsed / Cancelled' },
              ].map(tab => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? '#065f46' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#475569',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '99px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isActive ? 'rgba(255,255,255,0.25)' : (tab.badgeColor ? tab.badgeColor : '#cbd5e1'),
                        color: isActive ? '#ffffff' : (tab.badgeColor ? '#ffffff' : '#334155')
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 300px', maxWidth: '450px' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search citizen, tree, certificate, location..."
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  background: '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Adoptions Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: '#10b981' }} />
              <p style={{ fontWeight: 600 }}>Loading municipal adoptions...</p>
            </div>
          ) : filteredAdoptions.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <TreePine size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
                No matching adoptions found
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 20px' }}>
                {searchTerm
                  ? `No adoptions matched your search for "${searchTerm}". Try another keyword or clear the search.`
                  : 'There are currently no adoptions in this category.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: '#059669', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredAdoptions.map(sub => {
                const isPaid = sub.adoptionType === 'subscription';
                const hasPendingProof = sub.careTasks && sub.careTasks.some(t => t.status === 'Pending');
                const proofCount = sub.careTasks ? sub.careTasks.length : 0;

                return (
                  <div
                    key={sub._id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: hasPendingProof ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '20px',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Left: Tree & Citizen Info */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: '320px', flex: '1 1 360px' }}>
                      <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: '#f1f5f9',
                        flexShrink: 0,
                        border: '1px solid #e2e8f0'
                      }}>
                        {sub.treeImage ? (
                          <img
                            src={sub.treeImage}
                            alt={sub.treeName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <TreePine size={32} />
                          </div>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                            {sub.treeName}
                          </h3>
                          {sub.certificateNumber && (
                            <Link
                              to={`/verify-certificate/${sub.certificateNumber}`}
                              target="_blank"
                              title="Click to view official digital certificate"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                textDecoration: 'none'
                              }}
                            >
                              <Award size={13} /> {sub.certificateNumber}
                            </Link>
                          )}
                        </div>

                        {sub.treeScientificName && (
                          <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
                            {sub.treeScientificName}
                          </div>
                        )}

                        {sub.treeLocation && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                            <MapPin size={13} color="#94a3b8" />
                            {sub.treeLocation}
                          </div>
                        )}

                        {/* Citizen Adopter details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>
                            Adopter: {sub.userName}
                          </span>
                          {sub.userEmail && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                              <Mail size={12} /> {sub.userEmail}
                            </span>
                          )}
                          {sub.userPhone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                              <Phone size={12} /> {sub.userPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Plan Type & Care Duties */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1 1 240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                          Plan:
                        </span>
                        {isPaid ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe'
                          }}>
                            <ShieldCheck size={14} />
                            Municipal Care ({sub.plan === 'monthly' ? '₹500 / mo' : '₹6,000 / yr'})
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe'
                          }}>
                            <Award size={14} />
                            Citizen Self-Care (Pledge)
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                          Status:
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ['active', 'assigned'].includes(sub.status) ? '#ecfdf5' : '#fef2f2',
                          color: ['active', 'assigned'].includes(sub.status) ? '#059669' : '#dc2626',
                          border: `1px solid ${['active', 'assigned'].includes(sub.status) ? '#a7f3d0' : '#fecaca'}`
                        }}>
                          {sub.status.toUpperCase()}
                        </span>
                        {sub.startDate && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Since {new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Assigned Cutter Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                          Arborist:
                        </span>
                        {sub.assignedCutterName ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0'
                          }}>
                            <UserCheck size={14} />
                            {sub.assignedCutterName}
                          </span>
                        ) : isPaid ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                          }}>
                            <AlertTriangle size={13} />
                            Unassigned
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Citizen Managed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                      {/* Assign / Reassign Cutter button for paid plans */}
                      {isPaid && (
                        <button
                          onClick={() => {
                            setAssignModalSub(sub);
                            setSelectedCutterId(sub.assignedCutterId || '');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: sub.assignedCutterId ? '1px solid #cbd5e1' : '1px solid #f59e0b',
                            background: sub.assignedCutterId ? '#ffffff' : '#f59e0b',
                            color: sub.assignedCutterId ? '#334155' : '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: sub.assignedCutterId ? 'none' : '0 2px 8px rgba(245,158,11,0.25)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Users size={15} />
                          {sub.assignedCutterId ? 'Reassign Cutter' : 'Assign Cutter'}
                        </button>
                      )}

                      {/* Care Activity & Proofs button */}
                      <button
                        onClick={() => {
                          setCareActivitySub(sub);
                          setAuditTask(null);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: hasPendingProof ? '1px solid #ef4444' : '1px solid #10b981',
                          background: hasPendingProof ? '#fef2f2' : 'rgba(16,185,129,0.08)',
                          color: hasPendingProof ? '#dc2626' : '#047857',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Camera size={15} />
                        Care Logs ({proofCount})
                        {hasPendingProof && (
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#ef4444',
                            display: 'inline-block'
                          }} />
                        )}
                      </button>

                      {/* View Tree in Database */}
                      <Link
                        to={`/official/view-tree`}
                        title="View tree in municipal database"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#64748b',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={16} />
                      </Link>

                      {/* Cancel / Terminate Option */}
                      {['active', 'assigned'].includes(sub.status) && (
                        <button
                          onClick={() => handleCancelAdoption(sub)}
                          title="Release tree and cancel adoption"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: '1px solid #fee2e2',
                            background: '#ffffff',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Assign Arborist / Cutter Modal ── */}
      {assignModalSub && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button
              onClick={() => setAssignModalSub(null)}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Assign Arborist / Cutter
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Assign field personnel to inspect, prune, and water this adopted tree.
                </p>
              </div>
            </div>

            {/* Tree & Citizen Context */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                🌳 {assignModalSub.treeName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Location: {assignModalSub.treeLocation || 'Udupi Municipality'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Adopted By: <strong>{assignModalSub.userName}</strong> ({assignModalSub.plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'})
              </div>
            </div>

            <form onSubmit={handleAssignCutter}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Select Tree Cutter / Arborist:
                </label>
                <select
                  value={selectedCutterId}
                  onChange={(e) => setSelectedCutterId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Choose Registered Cutter --</option>
                  {cutters.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name || c.username} {c.phone ? `(${c.phone})` : ''} - Registered Field Staff
                    </option>
                  ))}
                  {cutters.length === 0 && (
                    <>
                      <option value="cutter_john">John Cutter (Tree Specialist)</option>
                      <option value="cutter_dave">Dave Cutter (Pruning & Watering)</option>
                      <option value="cutter_sarah">Sarah Cutter (Arborist Lead)</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalSub(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedCutterId}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                    opacity: isAssigning ? 0.7 : 1
                  }}
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Care Activity & Proof Lightbox Modal ── */}
      {careActivitySub && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Care Activity & Field Proofs
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Tree: <strong>{careActivitySub.treeName}</strong> • Adopter: <strong>{careActivitySub.userName}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setCareActivitySub(null);
                  setAuditTask(null);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body: Task list */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {(!careActivitySub.careTasks || careActivitySub.careTasks.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <Camera size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No field care tasks logged yet</p>
                  <p style={{ fontSize: '0.84rem', margin: 0, color: '#94a3b8' }}>
                    When the assigned arborist logs watering or pruning photos from the field, they will appear here for review.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {careActivitySub.careTasks.map((task, idx) => {
                    const isPending = task.status === 'Pending';
                    const isValidated = task.status === 'Validated';
                    const isSelectedForAudit = auditTask && auditTask._id === task._id;

                    return (
                      <div
                        key={task._id || idx}
                        style={{
                          borderRadius: '14px',
                          border: isPending ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                          padding: '16px',
                          background: isPending ? '#fffdf7' : '#ffffff',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                          alignItems: 'flex-start'
                        }}
                      >
                        {/* Proof Photo thumbnail */}
                        <div style={{
                          width: 110,
                          height: 110,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#f1f5f9',
                          flexShrink: 0,
                          border: '1px solid #e2e8f0',
                          position: 'relative'
                        }}>
                          {task.proofImageUrl ? (
                            <a href={task.proofImageUrl} target="_blank" rel="noreferrer" title="Click to view full image">
                              <img
                                src={task.proofImageUrl}
                                alt={task.taskType}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </a>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              <Camera size={28} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                                {task.taskType}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '99px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: isValidated ? '#ecfdf5' : (isPending ? '#fffbeb' : '#fef2f2'),
                                color: isValidated ? '#059669' : (isPending ? '#b45309' : '#dc2626'),
                                border: `1px solid ${isValidated ? '#a7f3d0' : (isPending ? '#fde68a' : '#fecaca')}`
                              }}>
                                {task.status || 'Pending'}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {task.uploadedAt ? new Date(task.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                            {task.description || 'Routine tree maintenance and inspection.'}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                            Logged by: <strong>{task.uploadedByName || 'Tree Cutter'}</strong> ({task.uploadedByRole || 'Staff'})
                          </div>

                          {task.validationNote && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
                              <strong>Official Note:</strong> {task.validationNote}
                              {task.validatedByName && <span style={{ color: '#64748b' }}> — Reviewed by {task.validatedByName}</span>}
                            </div>
                          )}

                          {/* Audit Trigger */}
                          {isPending && !isSelectedForAudit && (
                            <div style={{ marginTop: '12px' }}>
                              <button
                                onClick={() => {
                                  setAuditTask(task);
                                  setAuditNote('');
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid #059669',
                                  background: '#059669',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Review & Validate Proof
                              </button>
                            </div>
                          )}

                          {/* Inline Audit Form */}
                          {isSelectedForAudit && (
                            <div style={{
                              marginTop: '14px',
                              padding: '14px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1'
                            }}>
                              <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                                Official Review Decision
                              </h4>
                              <textarea
                                value={auditNote}
                                onChange={(e) => setAuditNote(e.target.value)}
                                placeholder="Add official audit remarks or feedback for citizen & arborist..."
                                rows="2"
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.84rem',
                                  boxSizing: 'border-box',
                                  marginBottom: '10px',
                                  outline: 'none'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => setAuditTask(null)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAuditProof('Rejected')}
                                  disabled={isAuditing}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #ef4444',
                                    background: '#ffffff',
                                    color: '#dc2626',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reject Proof
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAuditProof('Validated')}
                                  disabled={isAuditing}
                                  style={{
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isAuditing ? 'Validating...' : 'Approve & Validate'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

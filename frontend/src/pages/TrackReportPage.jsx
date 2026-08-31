import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  TreePine,
  User,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statusSteps = ['Pending', 'In Review', 'Scheduled', 'Resolved'];

const issueLabels = {
  damaged: 'Damaged Tree',
  overhanging: 'Overhanging Branches',
  dead: 'Dead / Dying Tree',
  pest: 'Pest / Disease',
  roots: 'Roots Damage',
  fallen: 'Fallen Branch',
};

const stepColors = {
  'Pending': '#f59e0b',
  'In Review': '#3b82f6',
  'Scheduled': '#8b5cf6',
  'In Progress': '#3b82f6',
  'Reached Location': '#3b82f6',
  'Work Completed': '#10b981',
  'Waste Disposed': '#10b981',
  'Resolved': '#10b981',
};

const stepDescriptions = {
  'Pending': 'Your report has been logged and queued for initial verification by forest officials.',
  'In Review': 'Official team is reviewing tree health metrics and dispatching field inspectors.',
  'Scheduled': 'Work order created. Maintenance crew and equipment have been assigned.',
  'In Progress': 'Tree cutters have arrived on site and work is actively underway.',
  'Reached Location': 'Tree cutter team has reached the site location.',
  'Work Completed': 'Pruning/cutting completed safely. Proof images submitted for verification.',
  'Waste Disposed': 'Green waste dumped at authorized site and final report verified.',
  'Resolved': 'Tree maintenance completed successfully. Ticket closed.',
};

export default function TrackReportPage() {
  const { id } = useParams();

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || null;
    } catch {
      return null;
    }
  })();

  const [searchId, setSearchId] = useState(id || '');
  const [showSearch, setShowSearch] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [userComplaints, setUserComplaints] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'my'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchComplaint = (lookupId) => {
    const targetId = lookupId || id || searchId;
    setLoading(true);
    setIsRefreshing(true);

    fetch(`${API_URL}/api/complaints`)
      .then(r => r.json())
      .then(data => {
        const list = data.complaints || (Array.isArray(data) ? data : []);
        setAllComplaints(list);

        // Filter complaints for logged in user (e.g. Sameeksha)
        let myReports = [];
        if (currentUser) {
          const currentName = (currentUser.name || currentUser.username || '').toLowerCase().trim();
          const currentEmail = (currentUser.email || '').toLowerCase().trim();
          const currentId = currentUser.id || currentUser._id;

          myReports = list.filter(c => {
            if (currentId && (c.submittedByUserId === currentId || String(c.submittedByUserId) === String(currentId))) return true;
            const sub = (c.submittedBy || '').toLowerCase().trim();
            if (currentName && (sub === currentName || sub.includes(currentName))) return true;
            if (currentEmail && (sub === currentEmail || sub.includes(currentEmail))) return true;
            return false;
          });
        }
        setUserComplaints(myReports);

        let selected = null;
        if (targetId) {
          selected = list.find(c => c._id === targetId || String(c._id).includes(targetId));
        }
        if (!selected && myReports.length > 0) {
          selected = myReports[0];
        }
        if (!selected && list.length > 0) {
          // Always fallback to latest public report in list so tracking portal displays live data!
          selected = list[list.length - 1];
        }

        if (selected) {
          setComplaint(selected);
          setSearchId(selected._id);
          setError('');
        } else {
          setComplaint(null);
          setError('No reports found. Click "Submit New Report" to log a tree issue.');
        }
      })
      .catch((err) => {
        console.error('Fetch complaint error:', err);
        setError('Could not connect to server. Please try again later.');
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
        setLastRefreshed(new Date());
      });
  };

  useEffect(() => {
    fetchComplaint();
    const interval = setInterval(() => fetchComplaint(), 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCopyId = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStepIndex = complaint ? (
    ['Resolved', 'Work Completed', 'Waste Disposed'].includes(complaint.status) ? 3
      : ['In Progress', 'Reached Location'].includes(complaint.status) ? 2
        : statusSteps.indexOf(complaint.status)
  ) : -1;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
      color: '#1e293b'
    }}>
      {/* ── TOP GLASS NAVBAR ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1001,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f1f5f9',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} /> Home
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#043224', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            <TreePine size={24} style={{ color: '#10b981' }} />
            <span>CanopyGuard</span>
          </div>
        </div>

        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            color: '#065f46',
            fontWeight: 600
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>{currentUser.name || 'User'}</span>
          </div>
        )}
      </header>

      {/* ── MAIN CONTAINER ── */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* ── HERO BANNER ── */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{
            display: 'inline-block',
            background: '#dcfce7',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 12px',
            borderRadius: '12px',
            marginBottom: '8px'
          }}>
            Real-Time Tracking Portal
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Track Report Progress
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            Auto-refreshes every 30s &nbsp;•&nbsp; Last updated: <b>{lastRefreshed.toLocaleTimeString()}</b>
          </p>
        </div>

        {/* ── SEARCH & REPORT SELECTOR BAR ── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          marginBottom: '24px'
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <FileText size={18} style={{ color: '#10b981' }} />
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setReportFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: reportFilter === 'all' ? '#ffffff' : 'transparent',
                    color: reportFilter === 'all' ? '#065f46' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: reportFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🌐 All Reports ({allComplaints.length})
                </button>
                {userComplaints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReportFilter('my')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: reportFilter === 'my' ? '#ffffff' : 'transparent',
                      color: reportFilter === 'my' ? '#065f46' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: reportFilter === 'my' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    👤 My Reports ({userComplaints.length})
                  </button>
                )}
              </div>
            </div>

            <Link
              to="/report"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <TreePine size={16} /> Submit New Report
            </Link>
          </div>

          {/* Search Input Box */}
          <form
            onSubmit={(e) => { e.preventDefault(); fetchComplaint(searchId); }}
            style={{
              display: 'flex',
              gap: '8px',
              background: '#f8fafc',
              padding: '6px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              marginBottom: '14px'
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px' }}>
              <Search size={18} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. 66a2e5abd2f3...)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  color: '#1e293b'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#043224',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Track Report
            </button>
          </form>

          {/* Pill Carousel */}
          {((reportFilter === 'my' ? userComplaints : allComplaints).length > 0) && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {(reportFilter === 'my' ? userComplaints : allComplaints).map((item) => {
                const isActive = complaint?._id === item._id;
                const statusColor = stepColors[item.status] || '#64748b';

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => { setComplaint(item); setSearchId(item._id); setError(''); }}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      borderRadius: '14px',
                      border: isActive ? '2px solid #10b981' : '1px solid #e2e8f0',
                      background: isActive ? '#f0fdf4' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 12px rgba(16,185,129,0.12)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: isActive ? '#10b981' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      <TreePine size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isActive ? '#065f46' : '#1e293b' }}>
                        {issueLabels[item.issueType] || item.issueType}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span>•</span>
                        <span style={{ color: statusColor, fontWeight: 700 }}>{item.status}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── LOADING STATE ── */}
        {loading && (
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '48px 24px',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <RefreshCw size={28} className="spin" style={{ color: '#10b981', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#64748b', fontWeight: 600, margin: 0 }}>Fetching report status details…</p>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {error && !loading && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '20px',
            padding: '24px',
            textAlign: 'center',
            color: '#b91c1c',
            marginBottom: '24px'
          }}>
            <AlertTriangle size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, margin: '0 0 14px' }}>{error}</p>
            <button
              onClick={() => fetchComplaint()}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── REPORT CONTENT ── */}
        {complaint && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. STATUS TIMELINE CARD */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    Status Progress
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                    Tracking ID:&nbsp;
                    <code style={{ background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', color: '#065f46', fontWeight: 700 }}>
                      {complaint._id}
                    </code>
                  </p>
                </div>
                <button
                  onClick={() => handleCopyId(complaint._id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: copied ? '#dcfce7' : '#f1f5f9',
                    color: copied ? '#15803d' : '#475569',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy ID'}
                </button>
              </div>

              {/* Progress Stepper Bar */}
              <div style={{ position: 'relative', margin: '30px 10px 20px' }}>
                {/* Background Line */}
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '30px',
                  right: '30px',
                  height: '4px',
                  background: '#e2e8f0',
                  zIndex: 1
                }} />

                {/* Active Line Fill */}
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '30px',
                  height: '4px',
                  width: currentStepIndex >= 0 ? `calc(${(currentStepIndex / (statusSteps.length - 1)) * 100}% - 30px)` : '0%',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  transition: 'all 0.4s ease',
                  zIndex: 2
                }} />

                {/* Steps Nodes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
                  {statusSteps.map((stepName, idx) => {
                    const isPassed = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={stepName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isPassed ? '#10b981' : '#ffffff',
                          border: isCurrent ? '3px solid #043224' : isPassed ? '3px solid #10b981' : '3px solid #cbd5e1',
                          color: isPassed ? '#ffffff' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.25)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {isPassed ? <Check size={18} /> : idx + 1}
                        </div>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: isCurrent ? 800 : 600,
                          color: isCurrent ? '#043224' : isPassed ? '#0f172a' : '#94a3b8',
                          marginTop: '8px',
                          textAlign: 'center'
                        }}>
                          {stepName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Banner */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #a7f3d0',
                borderRadius: '16px',
                padding: '16px 20px',
                marginTop: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <ShieldCheck size={22} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Status: {complaint.status}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#1e293b', marginTop: '2px', fontWeight: 500 }}>
                    {stepDescriptions[complaint.status] || 'Your report is currently being processed by municipal forest authorities.'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. REPORT DETAILS & MAP CARD */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
                Incident Location & Details
              </h3>

              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <ComplaintMap />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Issue Category</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {issueLabels[complaint.issueType] || complaint.issueType}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Submitted By</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {complaint.submittedBy || 'Anonymous'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Submitted Date</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Location Address</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                    {complaint.location || 'Hubli-Dharwad Canopy Sector'}
                  </div>
                </div>
              </div>

              {complaint.description && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Citizen Description</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                    {complaint.description}
                  </p>
                </div>
              )}
            </div>

            {/* 3. BOTTOM ACTION TOOLBAR */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => fetchComplaint()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} /> Refresh Status
              </button>

              <Link
                to="/report-issue"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#043224',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 14px rgba(4, 50, 36, 0.2)'
                }}
              >
                + Submit New Report
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

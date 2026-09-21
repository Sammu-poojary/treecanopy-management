import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Droplets,
  Scissors,
  Sprout,
  ShieldCheck,
  AlertCircle,
  Heart,
  Trees,
  User,
  Mail,
  Phone,
  MapPin,
  Maximize2,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  X,
  FileText,
  Check,
  Award,
  CalendarDays
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ACTIVITY_ICONS = {
  Watering: { icon: Droplets, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  Pruning: { icon: Scissors, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  Fertilizing: { icon: Sprout, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  Mulching: { icon: Sprout, color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' },
  Inspection: { icon: ShieldCheck, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  Cleaning: { icon: Droplets, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  Other: { icon: Trees, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export default function CareCalendarModal({
  subscription,
  onClose,
  onUpdate,
  currentUser = {},
  isAdmin = false
}) {
  if (!subscription) return null;

  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'proofs', 'log'
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(null); // 'YYYY-MM-DD'
  const [lightboxImg, setLightboxImg] = useState(null);

  // Care proof logging state
  const [logForm, setLogForm] = useState({
    taskType: 'Watering',
    description: '',
    imageBase64: '',
    customDate: new Date().toISOString().slice(0, 10)
  });
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Revoke modal state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeReason, setRevokeReason] = useState('Citizen requested cancellation');
  const [isRevoking, setIsRevoking] = useState(false);

  // Proof audit state
  const [auditingTaskId, setAuditingTaskId] = useState(null);
  const [auditNote, setAuditNote] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  const careTasks = useMemo(() => {
    return Array.isArray(subscription.careTasks) ? subscription.careTasks : [];
  }, [subscription]);

  // Group care tasks by date (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    careTasks.forEach(task => {
      const d = task.uploadedAt ? new Date(task.uploadedAt) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [careTasks]);

  // Calendar generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  // Adjust to Mon = 0 if preferred, or standard Sun = 0
  const adjustedFirstDay = (firstDayIndex + 6) % 7; // Mon = 0

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayKey(null);
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDayKey(todayKey);
  };

  // Filter tasks for active day or show all
  const displayedTasks = useMemo(() => {
    if (selectedDayKey && tasksByDate[selectedDayKey]) {
      return tasksByDate[selectedDayKey];
    }
    return careTasks.slice().reverse();
  }, [selectedDayKey, tasksByDate, careTasks]);

  // Handle Photo File Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogForm(prev => ({ ...prev, imageBase64: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Submit New Care Proof
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!logForm.imageBase64) {
      alert('Please upload a photo proof of the maintenance activity.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subscription._id}/upload-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: logForm.taskType,
          description: logForm.description,
          imageBase64: logForm.imageBase64,
          uploadedBy: currentUser._id || null,
          uploadedByName: currentUser.name || (isAdmin ? 'Municipal Administrator' : 'Field Official'),
          uploadedByRole: isAdmin ? 'Admin' : 'Official',
          customDate: logForm.customDate
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onUpdate) onUpdate(data.subscription);
        setLogForm({
          taskType: 'Watering',
          description: '',
          imageBase64: '',
          customDate: new Date().toISOString().slice(0, 10)
        });
        setActiveTab('calendar');
      } else {
        alert(data.error || 'Failed to submit care proof.');
      }
    } catch (err) {
      alert('Network error submitting proof: ' + err.message);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Handle Audit / Validate Proof
  const handleValidateProof = async (taskId, status) => {
    setIsAuditing(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subscription._id}/tasks/${taskId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          validationNote: auditNote,
          validatedById: currentUser._id || null,
          validatedByName: currentUser.name || (isAdmin ? 'Admin Supervisor' : 'Municipal Official')
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onUpdate) onUpdate(data.subscription);
        setAuditingTaskId(null);
        setAuditNote('');
      } else {
        alert(data.error || 'Failed to update proof status.');
      }
    } catch (err) {
      alert('Error updating proof: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  // Handle Revoke Adoption
  const handleConfirmRevoke = async () => {
    setIsRevoking(true);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subscription._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onUpdate) onUpdate(data.subscription);
        setShowRevokeConfirm(false);
      } else {
        alert(data.error || 'Failed to revoke adoption.');
      }
    } catch (err) {
      alert('Error revoking adoption: ' + err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const isCancelled = ['cancelled', 'lapsed'].includes(subscription.status);
  const isSub = subscription.adoptionType === 'subscription';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(5, 29, 24, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'var(--bg-surface, #0b2921)',
        border: '1px solid var(--border, #17473b)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
        color: 'var(--text-primary, #f1f5f9)',
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border, #17473b)',
          background: 'var(--bg-elevated, #0f3329)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'var(--bg-subtle, #143e32)',
              border: '1px solid var(--border, #17473b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {subscription.treeImage ? (
                <img
                  src={subscription.treeImage}
                  alt={subscription.treeName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Trees size={26} color="#10b981" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #f1f5f9)' }}>
                  {subscription.treeName || 'Adopted Tree'}
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isCancelled ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                  color: isCancelled ? '#f87171' : '#34d399',
                  border: `1px solid ${isCancelled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  textTransform: 'uppercase'
                }}>
                  {subscription.status || 'Active'}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isSub ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                  color: isSub ? '#a5b4fc' : '#6ee7b7'
                }}>
                  {isSub ? 'Municipal Care Plan' : 'Citizen Self-Care Pledge'}
                </span>
                {subscription.certificateNumber && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-subtle, #143e32)',
                    color: 'var(--text-muted, #94a3b8)',
                    border: '1px solid var(--border, #17473b)'
                  }}>
                    Cert #{subscription.certificateNumber}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary, #94a3b8)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {subscription.treeScientificName && <i>{subscription.treeScientificName}</i>}
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {subscription.treeLocation || 'Ward Sector'}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} /> Guardian: <b>{subscription.userName || 'Citizen'}</b> ({subscription.userEmail || 'No email'})
                </span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isCancelled && (
              <button
                onClick={() => setShowRevokeConfirm(true)}
                title="Revoke tree adoption and release tree back to municipal inventory"
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Trash2 size={14} /> Revoke Adoption
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                border: '1px solid var(--border, #17473b)',
                background: 'var(--bg-subtle, #143e32)',
                color: 'var(--text-secondary, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Revoke Confirmation Banner (if open) */}
        {showRevokeConfirm && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} color="#f87171" />
              <div>
                <strong style={{ color: '#fca5a5', fontSize: '0.9rem' }}>Revoke / Cancel Adoption:</strong>
                <span style={{ color: '#fecaca', fontSize: '0.85rem', marginLeft: '6px' }}>
                  This will release "{subscription.treeName}" back for other citizens to adopt.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface, #0b2921)',
                  color: 'var(--text-primary, #f1f5f9)',
                  border: '1px solid var(--border, #17473b)',
                  fontSize: '0.82rem'
                }}
              >
                <option value="Citizen requested cancellation">Citizen requested cancellation</option>
                <option value="Failure to uphold care pledge">Failure to uphold care pledge</option>
                <option value="Payment subscription lapsed">Payment subscription lapsed</option>
                <option value="Municipal redevelopment / replanting">Municipal redevelopment</option>
                <option value="Administrative correction">Administrative correction</option>
              </select>
              <button
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {isRevoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
              <button
                onClick={() => setShowRevokeConfirm(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #17473b)',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border, #17473b)',
          background: 'var(--bg-surface, #0b2921)',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('calendar')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: activeTab === 'calendar' ? '1px solid #10b981' : '1px solid transparent',
                background: activeTab === 'calendar' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: activeTab === 'calendar' ? '#34d399' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <CalendarDays size={16} /> Interactive Care Calendar
            </button>
            <button
              onClick={() => setActiveTab('proofs')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: activeTab === 'proofs' ? '1px solid #10b981' : '1px solid transparent',
                background: activeTab === 'proofs' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: activeTab === 'proofs' ? '#34d399' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <Camera size={16} /> Proof Gallery & Dossier ({careTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('log')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: activeTab === 'log' ? '1px solid #10b981' : '1px solid transparent',
                background: activeTab === 'log' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: activeTab === 'log' ? '#34d399' : 'var(--text-secondary, #94a3b8)'
              }}
            >
              <Plus size={16} /> Log New Care Proof
            </button>
          </div>

          {/* Quick status counters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
            <span>Validated: <b style={{ color: '#34d399' }}>{careTasks.filter(t => t.status === 'Validated').length}</b></span>
            <span>Pending Review: <b style={{ color: '#fbbf24' }}>{careTasks.filter(t => t.status === 'Pending').length}</b></span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* ── TAB 1: CALENDAR VIEW ── */}
          {activeTab === 'calendar' && (
            <div>
              {/* Month Header Controller */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                background: 'var(--bg-elevated, #0f3329)',
                padding: '12px 18px',
                borderRadius: '14px',
                border: '1px solid var(--border, #17473b)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={prevMonth}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'var(--bg-subtle, #143e32)',
                      border: '1px solid var(--border, #17473b)',
                      color: 'var(--text-primary, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #f1f5f9)' }}>
                    {monthNames[month]} {year}
                  </h3>
                  <button
                    onClick={nextMonth}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'var(--bg-subtle, #143e32)',
                      border: '1px solid var(--border, #17473b)',
                      color: 'var(--text-primary, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={jumpToToday}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-subtle, #143e32)',
                      border: '1px solid var(--border, #17473b)',
                      color: 'var(--text-primary, #f1f5f9)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Jump to Today
                  </button>
                  {selectedDayKey && (
                    <button
                      onClick={() => setSelectedDayKey(null)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Clear Date Filter (Show All)
                    </button>
                  )}
                </div>
              </div>

              {/* 7-Column Calendar Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                marginBottom: '24px'
              }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
                  <div key={dayName} style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted, #64748b)',
                    padding: '6px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {dayName}
                  </div>
                ))}

                {/* Empty offset padding days */}
                {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                  <div key={`empty-${i}`} style={{
                    minHeight: '76px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    opacity: 0.25
                  }} />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayTasks = tasksByDate[dateStr] || [];
                  const hasTasks = dayTasks.length > 0;
                  const isSelected = selectedDayKey === dateStr;
                  const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDayKey(prev => prev === dateStr ? null : dateStr)}
                      style={{
                        minHeight: '76px',
                        borderRadius: '12px',
                        background: isSelected
                          ? 'rgba(16, 185, 129, 0.22)'
                          : isToday
                          ? 'var(--bg-elevated, #0f3329)'
                          : 'var(--bg-surface, #0b2921)',
                        border: isSelected
                          ? '2px solid #10b981'
                          : isToday
                          ? '1.5px solid #3b82f6'
                          : hasTasks
                          ? '1px solid rgba(52, 211, 153, 0.4)'
                          : '1px solid var(--border, #17473b)',
                        padding: '8px',
                        cursor: hasTasks ? 'pointer' : 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 15px rgba(16,185,129,0.3)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: isToday || isSelected ? 800 : 600,
                          color: isToday ? '#60a5fa' : isSelected ? '#34d399' : 'var(--text-primary, #f1f5f9)'
                        }}>
                          {dayNum}
                        </span>
                        {hasTasks && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: '#10b981',
                            color: '#043224',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      {/* Care task badges inside cell */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {dayTasks.slice(0, 3).map((t, idx) => {
                          const conf = ACTIVITY_ICONS[t.taskType] || ACTIVITY_ICONS.Other;
                          return (
                            <span
                              key={`${t._id || idx}`}
                              title={`${t.taskType} - ${t.status || 'Pending'}`}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: t.status === 'Validated' ? '#10b981' : t.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                                display: 'inline-block'
                              }}
                            />
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)' }}>
                            +{dayTasks.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Details / Filtered Activities Panel */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px'
                }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #f1f5f9)' }}>
                    {selectedDayKey ? `Care Activities on ${selectedDayKey}` : `All Care History (${careTasks.length})`}
                  </h4>
                  {selectedDayKey && (
                    <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                      Filtered to selected date
                    </span>
                  )}
                </div>

                {displayedTasks.length === 0 ? (
                  <div style={{
                    padding: '36px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated, #0f3329)',
                    borderRadius: '14px',
                    border: '1px dashed var(--border, #17473b)',
                    color: 'var(--text-muted, #94a3b8)'
                  }}>
                    <Clock size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No care activities logged for this date.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Click "Log New Care Proof" above to record a watering, pruning, or fertilizing session.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {displayedTasks.map(task => renderTaskCard(task))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: PROOFS GALLERY & AUDIT DOSSIER ── */}
          {activeTab === 'proofs' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #f1f5f9)' }}>
                    Maintenance Proofs & Field Audit Dossier
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--text-muted, #94a3b8)' }}>
                    High-resolution photographic evidence submitted by arborists and citizen guardians.
                  </p>
                </div>
                <span style={{
                  fontSize: '0.84rem',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontWeight: 700
                }}>
                  {careTasks.length} Total Submissions
                </span>
              </div>

              {careTasks.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-elevated, #0f3329)',
                  borderRadius: '16px',
                  border: '1px dashed var(--border, #17473b)'
                }}>
                  <Camera size={40} style={{ color: '#10b981', margin: '0 auto 12px', opacity: 0.6 }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-primary, #f1f5f9)' }}>
                    No Photo Proofs Logged Yet
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Arborists and citizen guardians submit weekly watering and pruning photos here to verify tree health.
                  </p>
                  <button
                    onClick={() => setActiveTab('log')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      background: '#10b981',
                      color: '#043224',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    + Record First Care Proof
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                  {careTasks.slice().reverse().map(task => renderTaskCard(task))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: LOG NEW CARE PROOF FORM ── */}
          {activeTab === 'log' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div style={{
                background: 'var(--bg-elevated, #0f3329)',
                borderRadius: '16px',
                border: '1px solid var(--border, #17473b)',
                padding: '24px'
              }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #f1f5f9)' }}>
                  Record Field Care & Photo Proof
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Log a verified maintenance activity (watering, pruning, health inspection) for {subscription.treeName}.
                </p>

                <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Activity Type & Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                        CARE ACTIVITY TYPE
                      </label>
                      <select
                        value={logForm.taskType}
                        onChange={e => setLogForm({ ...logForm, taskType: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-surface, #0b2921)',
                          color: 'var(--text-primary, #f1f5f9)',
                          border: '1px solid var(--border, #17473b)',
                          fontSize: '0.86rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="Watering">💧 Watering & Hydration</option>
                        <option value="Pruning">✂️ Pruning & Trimming</option>
                        <option value="Fertilizing">🌿 Fertilizing & Nutrition</option>
                        <option value="Mulching">🍂 Mulching & Soil Care</option>
                        <option value="Inspection">🔍 Health & Pest Inspection</option>
                        <option value="Cleaning">🧼 Debris / Basin Cleaning</option>
                        <option value="Other">🌳 Other Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                        DATE PERFORMED
                      </label>
                      <input
                        type="date"
                        value={logForm.customDate}
                        onChange={e => setLogForm({ ...logForm, customDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-surface, #0b2921)',
                          color: 'var(--text-primary, #f1f5f9)',
                          border: '1px solid var(--border, #17473b)',
                          fontSize: '0.86rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Photo Upload Area */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                      PHOTO PROOF ATTACHMENT *
                    </label>
                    {logForm.imageBase64 ? (
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #10b981', maxHeight: '220px', background: '#000' }}>
                        <img
                          src={logForm.imageBase64}
                          alt="Proof preview"
                          style={{ width: '100%', height: '220px', objectFit: 'contain' }}
                        />
                        <button
                          type="button"
                          onClick={() => setLogForm(prev => ({ ...prev, imageBase64: '' }))}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(239, 68, 68, 0.85)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Change Photo
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px 16px',
                        borderRadius: '12px',
                        border: '2px dashed var(--border, #17473b)',
                        background: 'var(--bg-surface, #0b2921)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}>
                        <Camera size={36} color="#10b981" style={{ marginBottom: '8px' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #f1f5f9)' }}>
                          Click to upload field maintenance photo
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                          Supports JPEG, PNG, WebP (Max 8MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Notes / Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                      OBSERVATIONS & FIELD NOTES
                    </label>
                    <textarea
                      rows={3}
                      value={logForm.description}
                      onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                      placeholder="e.g. Watered 15 liters, cleared fallen leaves from basin, inspected for aphids (none found), healthy growth."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface, #0b2921)',
                        color: 'var(--text-primary, #f1f5f9)',
                        border: '1px solid var(--border, #17473b)',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingProof}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#043224',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                    }}
                  >
                    {isSubmittingProof ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {isSubmittingProof ? 'Uploading Proof...' : 'Publish Care Proof'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX MODAL ── */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImg}
              alt="HD Care Proof"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }}
            />
            <button
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for each task item
  function renderTaskCard(task) {
    const iconConf = ACTIVITY_ICONS[task.taskType] || ACTIVITY_ICONS.Other;
    const IconComp = iconConf.icon;
    const photoUrl = task.proofImageUrl || task.proofPhoto;
    const isPending = task.status === 'Pending';
    const isValidated = task.status === 'Validated';
    const isRejected = task.status === 'Rejected';
    const isAuditingThis = auditingTaskId === task._id;

    return (
      <div
        key={task._id || Math.random()}
        style={{
          background: 'var(--bg-elevated, #0f3329)',
          borderRadius: '14px',
          border: '1px solid var(--border, #17473b)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        {/* Photo Container */}
        {photoUrl ? (
          <div
            style={{
              position: 'relative',
              height: '180px',
              background: '#041712',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={() => setLightboxImg(photoUrl)}
          >
            <img
              src={photoUrl}
              alt={task.taskType}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '10px 12px'
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Eye size={12} /> Click to enlarge
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: isValidated ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {task.status || 'Pending'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            height: '100px',
            background: 'var(--bg-subtle, #143e32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted, #94a3b8)',
            gap: '8px',
            fontSize: '0.82rem'
          }}>
            <Camera size={20} /> No photo submitted
          </div>
        )}

        {/* Details Content */}
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: iconConf.color,
              background: iconConf.bg,
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              <IconComp size={14} /> {task.taskType || 'Care Activity'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
              {task.uploadedAt ? new Date(task.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Logged by: <b style={{ color: 'var(--text-primary, #f1f5f9)' }}>{task.uploadedByName || 'Arborist'}</b> {task.uploadedByRole ? `(${task.uploadedByRole})` : ''}
          </div>

          {task.description && (
            <p style={{
              margin: '2px 0 0',
              fontSize: '0.82rem',
              color: 'var(--text-primary, #f1f5f9)',
              lineHeight: 1.4,
              background: 'var(--bg-surface, #0b2921)',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border, #17473b)'
            }}>
              "{task.description}"
            </p>
          )}

          {task.validationNote && (
            <div style={{ fontSize: '0.76rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 8px', borderRadius: '6px' }}>
              <b>Official Audit Note:</b> {task.validationNote}
            </div>
          )}

          {/* Audit Controls (for Officials/Admins) */}
          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border, #17473b)' }}>
            {isAuditingThis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder="Optional audit comment..."
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-surface, #0b2921)',
                    color: 'var(--text-primary, #f1f5f9)',
                    border: '1px solid var(--border, #17473b)'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleValidateProof(task._id, 'Validated')}
                    disabled={isAuditing}
                    style={{
                      flex: 1,
                      padding: '5px',
                      borderRadius: '6px',
                      background: '#10b981',
                      color: '#043224',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleValidateProof(task._id, 'Rejected')}
                    disabled={isAuditing}
                    style={{
                      flex: 1,
                      padding: '5px',
                      borderRadius: '6px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => setAuditingTaskId(null)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: 'transparent',
                      color: 'var(--text-secondary, #94a3b8)',
                      border: '1px solid var(--border, #17473b)',
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Audit Status: <b style={{ color: isValidated ? '#34d399' : isRejected ? '#f87171' : '#fbbf24' }}>{task.status || 'Pending'}</b>
                </span>
                <button
                  onClick={() => {
                    setAuditingTaskId(task._id);
                    setAuditNote(task.validationNote || '');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-subtle, #143e32)',
                    border: '1px solid var(--border, #17473b)',
                    color: 'var(--text-primary, #f1f5f9)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Audit / Review
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Topbar, Sidebar } from './CanopyPages';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  MapPin,
  Send,
  ShieldAlert,
  Info,
  History,
  Activity
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TreeCutterAttendancePage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [timeNow, setTimeNow] = useState(new Date());

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  }, []);

  const cutterName = currentUser.name || currentUser.username || 'Snow';
  const cutterId = currentUser.id || currentUser._id || 'snow-id';

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Today's Attendance State ──
  const [todayAttendance, setTodayAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem(`attendance_${cutterId}_${new Date().toISOString().slice(0,10)}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ── Selected Shift State (Morning, Afternoon, Evening) ──
  const [selectedShift, setSelectedShift] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  });

  // ── Leave Form State ──
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Sick Leave',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    reason: ''
  });

  // ── History & Leaves State (Initializes empty or from localStorage) ──
  const [attendanceHistory, setAttendanceHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(`attendance_history_${cutterId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [leaveApplications, setLeaveApplications] = useState(() => {
    try {
      const savedLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
      return savedLeaves.filter(l => l.userId === cutterId || (l.userName && l.userName.toLowerCase().includes(cutterName.toLowerCase())));
    } catch {
      return [];
    }
  });

  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // Default to attendance tab

  // Fetch Attendance & Leaves History
  const fetchRecords = async () => {
    try {
      // 1. Fetch Leaves
      const resLeaves = await fetch(`${API_URL}/api/attendance/leaves?userId=${cutterId}`);
      if (resLeaves.ok) {
        const data = await resLeaves.json();
        if (data.leaves && data.leaves.length > 0) {
          setLeaveApplications(data.leaves);
        } else {
          const savedLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
          const userLeaves = savedLeaves.filter(l => l.userId === cutterId || (l.userName && l.userName.toLowerCase().includes(cutterName.toLowerCase())));
          setLeaveApplications(userLeaves);
        }
      } else {
        const savedLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
        const userLeaves = savedLeaves.filter(l => l.userId === cutterId || (l.userName && l.userName.toLowerCase().includes(cutterName.toLowerCase())));
        setLeaveApplications(userLeaves);
      }

      // 2. Fetch Attendance
      const resAtt = await fetch(`${API_URL}/api/attendance/me?userId=${cutterId}`);
      if (resAtt.ok) {
        const dataAtt = await resAtt.json();
        if (dataAtt.attendances && dataAtt.attendances.length > 0) {
          setAttendanceHistory(dataAtt.attendances);
        } else {
          const savedHistory = JSON.parse(localStorage.getItem(`attendance_history_${cutterId}`) || '[]');
          setAttendanceHistory(savedHistory);
        }
      } else {
        const savedHistory = JSON.parse(localStorage.getItem(`attendance_history_${cutterId}`) || '[]');
        setAttendanceHistory(savedHistory);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      const savedLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
      const userLeaves = savedLeaves.filter(l => l.userId === cutterId || (l.userName && l.userName.toLowerCase().includes(cutterName.toLowerCase())));
      setLeaveApplications(userLeaves);
      const savedHistory = JSON.parse(localStorage.getItem(`attendance_history_${cutterId}`) || '[]');
      setAttendanceHistory(savedHistory);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Calculate Active Leave Status
  const activeLeave = useMemo(() => {
    const todayStr = timeNow.toISOString().slice(0, 10);
    return leaveApplications.find(l => {
      if (l.status === 'Rejected') return false;
      const start = l.startDate;
      const end = l.endDate;
      return todayStr >= start && todayStr <= end;
    });
  }, [leaveApplications, timeNow]);

  // Mark Daily Attendance (Check-In)
  const handleCheckIn = async () => {
    if (activeLeave) {
      Swal.fire({
        icon: 'warning',
        title: 'Currently On Approved Leave',
        text: `You have an active leave registered (${activeLeave.startDate} to ${activeLeave.endDate}).`,
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const checkInRecord = {
      _id: `att-${Date.now()}`,
      userId: cutterId,
      userName: cutterName,
      userRole: 'Tree Cutter',
      date: timeNow.toISOString().slice(0, 10),
      shift: selectedShift,
      checkInTime: timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      checkOutTime: null,
      status: 'Present',
      location: 'Udupi Central Operations Field'
    };

    try {
      const res = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInRecord)
      });
      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data.attendance || checkInRecord);
      } else {
        setTodayAttendance(checkInRecord);
      }
    } catch {
      setTodayAttendance(checkInRecord);
    }

    localStorage.setItem(`attendance_${cutterId}_${checkInRecord.date}`, JSON.stringify(checkInRecord));
    
    setAttendanceHistory(prev => {
      const filtered = prev.filter(a => a.date !== checkInRecord.date);
      const updated = [checkInRecord, ...filtered];
      localStorage.setItem(`attendance_history_${cutterId}`, JSON.stringify(updated));
      return updated;
    });

    Swal.fire({
      icon: 'success',
      title: `${selectedShift} Shift Check-In Marked!`,
      text: `Checked in at ${checkInRecord.checkInTime} for ${selectedShift} shift. Have a safe working day!`,
      confirmButtonColor: '#10b981'
    });
  };

  // Mark Shift Check-Out
  const handleCheckOut = () => {
    if (!todayAttendance) return;
    const updated = {
      ...todayAttendance,
      checkOutTime: timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Completed Shift'
    };
    setTodayAttendance(updated);
    localStorage.setItem(`attendance_${cutterId}_${todayAttendance.date}`, JSON.stringify(updated));
    
    setAttendanceHistory(prev => {
      const updatedList = prev.map(a => a.date === updated.date ? updated : a);
      localStorage.setItem(`attendance_history_${cutterId}`, JSON.stringify(updatedList));
      return updatedList;
    });

    Swal.fire({
      icon: 'info',
      title: 'Shift Completed & Checked Out',
      text: `Checked out at ${updated.checkOutTime}. Thank you for your field service!`,
      confirmButtonColor: '#10b981'
    });
  };

  // Submit Leave Application
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      Swal.fire('Error', 'Please select both start and end dates.', 'error');
      return;
    }

    if (leaveForm.startDate > leaveForm.endDate) {
      Swal.fire('Invalid Dates', 'Start date cannot be after end date.', 'error');
      return;
    }

    setSubmittingLeave(true);

    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    const newLeave = {
      _id: `leave-${Date.now()}`,
      userId: cutterId,
      userName: cutterName,
      userRole: 'Tree Cutter',
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: diffDays,
      reason: leaveForm.reason.trim() || `${leaveForm.leaveType} application for ${cutterName}`,
      status: 'Approved', // Auto-activated for field cutters so assignment blocking is instant
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/api/attendance/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeave)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.leave) newLeave._id = data.leave._id;
      }
    } catch (err) {
      console.error('Leave post error:', err);
    }

    // Save to local storage for instant sync across tabs & admin modules
    const savedLeaves = JSON.parse(localStorage.getItem('officialLeaves') || '[]');
    savedLeaves.unshift(newLeave);
    localStorage.setItem('officialLeaves', JSON.stringify(savedLeaves));

    setLeaveApplications(prev => [newLeave, ...prev]);
    setSubmittingLeave(false);
    setLeaveForm({
      leaveType: 'Sick Leave',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      reason: ''
    });

    Swal.fire({
      icon: 'success',
      title: 'Leave Application Registered!',
      html: `<b>Leave Period:</b> ${newLeave.startDate} to ${newLeave.endDate} (${diffDays} days)<br/><br/>Your status is marked as <b>ON LEAVE / UNAVAILABLE</b>. Admin and Officials cannot assign work orders during this period.`,
      confirmButtonColor: '#10b981'
    });
  };

  return (
    <div className="cutter-dashboard-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-page, #051d18)', color: 'var(--text-primary, #f1f5f9)' }}>
      {/* Navigation Drawer & Topbar */}
      <Sidebar active="Attendance" isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(false)} />
      <Topbar title="Tree Cutter Attendance & Leave Portal" search="Search attendance records..." onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 24px 60px' }}>
        
        {/* Top Header Hero */}
        <section className="task-hero-card" style={{ marginBottom: '24px' }}>
          <div className="task-hero-copy">
            <span className="task-pill" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>Arborist Self-Service</span>
            <h2 style={{ margin: '8px 0 4px', fontSize: '1.4rem' }}>Daily Attendance & Leave Management</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Mark daily shift check-ins, submit leave requests for unavailable dates, and view your attendance log.
            </p>
          </div>
          <div className="task-hero-stats">
            <div className="task-stat-chip">
              <span>Today's Status</span>
              <strong style={{ color: activeLeave ? '#ef4444' : todayAttendance ? '#10b981' : '#f59e0b' }}>
                {activeLeave ? 'On Leave' : todayAttendance ? 'Present' : 'Not Checked In'}
              </strong>
            </div>
            <div className="task-stat-chip">
              <span>Total Leaves</span>
              <strong>{leaveApplications.length}</strong>
            </div>
            <div className="task-stat-chip">
              <span>Shift Time</span>
              <strong>{timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
          </div>
        </section>

        {/* Active Leave Alert Banner */}
        {activeLeave && (
          <div style={{
            margin: '0 0 24px', padding: '16px 20px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
            color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <ShieldAlert size={26} color="#ef4444" />
            <div>
              <b style={{ fontSize: '1.05rem', color: '#ffffff', display: 'block' }}>You Are Currently Marked ON LEAVE / UNAVAILABLE</b>
              <span style={{ fontSize: '0.85rem' }}>
                Leave Period: <b>{activeLeave.startDate}</b> to <b>{activeLeave.endDate}</b> ({activeLeave.leaveType}). Admins & Officials are blocked from assigning tasks to you during this period.
              </span>
            </div>
          </div>
        )}

        {/* 2-Column Main Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }} className="task-workspace-grid">

          {/* ── CARD 1: Daily Shift Attendance Check-In ── */}
          <div className="cg-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#10b981" /> Today's Shift Attendance
              </h3>
              <span style={{ fontSize: '0.82rem', background: 'var(--bg-elevated)', color: 'var(--brand-accent)', padding: '4px 10px', borderRadius: '999px', fontWeight: 700 }}>
                {timeNow.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Arborist Specialist:</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{cutterName}</strong>
              </div>
              {/* Shift Session Selector (Morning, Afternoon, Evening) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Shift Session:</span>
                <select
                  value={todayAttendance?.shift || selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  disabled={Boolean(todayAttendance)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    cursor: todayAttendance ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="Morning">🌅 Morning Shift (08:00 AM - 01:00 PM)</option>
                  <option value="Afternoon">☀️ Afternoon Shift (01:00 PM - 05:00 PM)</option>
                  <option value="Evening">🌙 Evening Shift (05:00 PM - 09:00 PM)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Check-In Status:</span>
                <span style={{
                  fontSize: '0.82rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 800,
                  background: todayAttendance ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                  color: todayAttendance ? '#10b981' : '#f59e0b'
                }}>
                  {todayAttendance ? `✓ Checked In (${todayAttendance.shift || selectedShift}) at ${todayAttendance.checkInTime}` : 'Not Checked In Yet'}
                </span>
              </div>
              {todayAttendance?.checkOutTime && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Check-Out Status:</span>
                  <span style={{ fontSize: '0.82rem', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
                    Checked Out at {todayAttendance.checkOutTime}
                  </span>
                </div>
              )}
            </div>

            {/* Attendance Action Buttons */}
            {!todayAttendance ? (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={Boolean(activeLeave)}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: activeLeave ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.95rem',
                  cursor: activeLeave ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: activeLeave ? 'none' : '0 4px 16px rgba(16,185,129,0.35)'
                }}
              >
                <UserCheck size={18} /> Mark Present & Check In ({selectedShift} Shift)
              </button>
            ) : !todayAttendance.checkOutTime ? (
              <button
                type="button"
                onClick={handleCheckOut}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.35)'
                }}
              >
                <UserX size={18} /> Complete Shift & Check Out
              </button>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', background: 'rgba(16,185,129,0.15)', borderRadius: '10px', color: '#34d399', fontWeight: 700, fontSize: '0.88rem' }}>
                ✓ Today's {todayAttendance.shift || selectedShift} shift completed and logged.
              </div>
            )}
          </div>

          {/* ── CARD 2: Apply Leave / Mark Unavailable Period ── */}
          <div className="cg-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#f59e0b" /> Mark Leave / Set Unavailable Dates
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                Set your leave start and end dates. Work order dispatch is automatically blocked during this period.
              </span>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Start Date
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  End Date
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Leave Type / Category
                <select
                  value={leaveForm.leaveType}
                  onChange={e => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="Sick Leave">Sick / Medical Leave</option>
                  <option value="Personal Leave">Personal Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Off-Duty / Vacation">Off-Duty / Vacation</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reason / Field Remarks
                <textarea
                  rows={2}
                  placeholder="e.g. Medical recovery / Personal emergency..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </label>

              <button
                type="submit"
                disabled={submittingLeave}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.3)'
                }}
              >
                <Send size={16} /> {submittingLeave ? 'Submitting Leave...' : 'Submit Leave & Mark Unavailable'}
              </button>
            </form>
          </div>

        </div>

        {/* ── CARD 3: Attendance & Leave History Records ── */}
        <div className="cg-panel" style={{ padding: '20px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} color="#10b981" /> Attendance & Leave Log History
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('leaves')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: activeTab === 'leaves' ? '#10b981' : 'var(--bg-elevated)',
                  color: activeTab === 'leaves' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Leave Applications ({leaveApplications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: activeTab === 'attendance' ? '#10b981' : 'var(--bg-elevated)',
                  color: activeTab === 'attendance' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Check-In History ({attendanceHistory.length})
              </button>
            </div>
          </div>

          {activeTab === 'leaves' ? (
            leaveApplications.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No leave applications submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaveApplications.map(leave => (
                  <div key={leave._id} style={{
                    padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <b style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{leave.leaveType}</b>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 700 }}>
                          {leave.totalDays} Day(s)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        📅 <b>{leave.startDate}</b> to <b>{leave.endDate}</b> • Reason: {leave.reason || 'Not specified'}
                      </span>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800,
                      background: leave.status === 'Approved' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: leave.status === 'Approved' ? '#34d399' : '#ef4444',
                      border: `1px solid ${leave.status === 'Approved' ? '#10b981' : '#ef4444'}`
                    }}>
                      ✓ {leave.status} (Task Block Active)
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            attendanceHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No check-in history logged.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {attendanceHistory.map((att, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <b style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>Date: {att.date} ({att.shift} Shift)</b>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📍 {att.location || 'Field Site'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800, display: 'block' }}>
                        In: {att.checkInTime} {att.checkOutTime ? `• Out: ${att.checkOutTime}` : ''}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--brand-accent)', fontWeight: 700 }}>{att.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </main>
    </div>
  );
}

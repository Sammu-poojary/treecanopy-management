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
  Activity,
  Lock,
  Sun,
  Moon,
  Sparkles,
  Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Official Shift Schedule Configuration (IST Timings)
const SHIFT_SCHEDULE = [
  {
    id: 'Morning',
    name: 'Morning Shift',
    startHour: 9,
    startMinute: 0,
    endHour: 12,
    endMinute: 0,
    timeRange: '09:00 AM – 12:00 PM',
    icon: Sun,
    iconColor: '#f59e0b',
    desc: 'Primary field pruning, hazard scouting & branch trimming'
  },
  {
    id: 'Afternoon',
    name: 'Afternoon Shift',
    startHour: 12,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    timeRange: '12:00 PM – 03:00 PM',
    icon: Sun,
    iconColor: '#10b981',
    desc: 'Mid-day hazard clearance, logs loading & site safety'
  },
  {
    id: 'Evening',
    name: 'Evening Shift',
    startHour: 15,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    timeRange: '03:00 PM – 05:00 PM',
    icon: Moon,
    iconColor: '#6366f1',
    desc: 'Emergency response, equipment check-in & wrap-up'
  }
];

// Helper: Determine shift status from current local time
function getShiftStatusByTime(dateObj) {
  const h = dateObj.getHours();
  const m = dateObj.getMinutes();
  const currentMinutes = h * 60 + m;

  for (const s of SHIFT_SCHEDULE) {
    const startMins = s.startHour * 60 + s.startMinute;
    const endMins = s.endHour * 60 + s.endMinute;
    if (currentMinutes >= startMins && currentMinutes < endMins) {
      return {
        active: true,
        shift: s,
        statusText: `Active (${s.timeRange})`,
        isClosed: false,
        reason: 'Session Open for Live Check-In'
      };
    }
  }

  // Outside operational hours
  if (currentMinutes < 9 * 60) {
    return {
      active: false,
      shift: null,
      statusText: 'Shift Not Started',
      isClosed: true,
      reason: 'Morning shift opens today at 09:00 AM'
    };
  }
  return {
    active: false,
    shift: null,
    statusText: 'Shift Sessions Closed',
    isClosed: true,
    reason: 'All operational shifts closed for today (09:00 AM – 05:00 PM)'
  };
}

// Helper: Format date as YYYY-MM-DD
function getLocalDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  // Live ticking clock (1s interval)
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getLocalDateString(timeNow), [timeNow]);
  const shiftInfo = useMemo(() => getShiftStatusByTime(timeNow), [timeNow]);

  // ── Leave Form State ──
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Sick Leave',
    startDate: getLocalDateString(new Date()),
    endDate: getLocalDateString(new Date(Date.now() + 86400000)),
    reason: ''
  });

  // ── History & Leaves State ──
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
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'

  // Fetch Attendance & Leaves History from API
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
      }

      // 2. Fetch Attendance
      const resAtt = await fetch(`${API_URL}/api/attendance/me?userId=${cutterId}`);
      if (resAtt.ok) {
        const dataAtt = await resAtt.json();
        const recs = dataAtt.records || dataAtt.attendances;
        if (recs && recs.length > 0) {
          setAttendanceHistory(recs);
          localStorage.setItem(`attendance_history_${cutterId}`, JSON.stringify(recs));
        }
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Today's attendance records for this cutter
  const todayRecords = useMemo(() => {
    return attendanceHistory.filter(a => a.date === todayStr);
  }, [attendanceHistory, todayStr]);

  // Attendance for the currently active shift (if any)
  const activeShiftRecord = useMemo(() => {
    if (!shiftInfo.active || !shiftInfo.shift) return null;
    return todayRecords.find(a => a.shift === shiftInfo.shift.id) || null;
  }, [shiftInfo, todayRecords]);

  // Most recent attendance record today (for check-out if open)
  const latestTodayRecord = useMemo(() => {
    if (todayRecords.length === 0) return null;
    return todayRecords[0];
  }, [todayRecords]);

  // Calculate Active Leave Status
  const activeLeave = useMemo(() => {
    return leaveApplications.find(l => {
      if (l.status === 'Rejected') return false;
      const start = l.startDate;
      const end = l.endDate;
      return todayStr >= start && todayStr <= end;
    });
  }, [leaveApplications, todayStr]);

  // Mark Daily Attendance (Check-In) — strictly time-based
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

    const currentShiftDetails = getShiftStatusByTime(new Date());
    if (!currentShiftDetails.active || !currentShiftDetails.shift) {
      Swal.fire({
        icon: 'error',
        title: 'Outside Operating Hours',
        text: currentShiftDetails.reason || 'Shift sessions are closed. Check-in is only permitted during active shift windows (09:00 AM – 05:00 PM).',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const activeShift = currentShiftDetails.shift;
    const checkInTimeStr = timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const checkInPayload = {
      userId: cutterId,
      userName: cutterName,
      role: 'Tree Cutter',
      userRole: 'Tree Cutter',
      date: todayStr,
      shift: activeShift.id,
      checkInTime: checkInTimeStr,
      status: 'Present',
      location: 'Udupi Central Operations Field'
    };

    setMarkingAttendance(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInPayload)
      });
      const data = await res.json();

      if (res.ok) {
        const savedRecord = data.attendance || { ...checkInPayload, _id: `att-${Date.now()}` };
        setAttendanceHistory(prev => {
          const filtered = prev.filter(a => !(a.date === savedRecord.date && a.shift === savedRecord.shift));
          const updated = [savedRecord, ...filtered];
          localStorage.setItem(`attendance_history_${cutterId}`, JSON.stringify(updated));
          return updated;
        });

        Swal.fire({
          icon: 'success',
          title: `${activeShift.name} Check-In Marked!`,
          html: `Checked in successfully at <b>${savedRecord.checkInTime}</b> for <b>${activeShift.name}</b> (${activeShift.timeRange}).<br/><br/>Have a safe and productive session!`,
          confirmButtonColor: '#10b981'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Check-In Rejected',
          text: data.msg || 'Cannot mark attendance for this shift session.',
          confirmButtonColor: '#10b981'
        });
      }
    } catch (err) {
      console.error('Attendance mark error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to reach the attendance server. Please verify your connection.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setMarkingAttendance(false);
    }
  };

  // Mark Shift Check-Out
  const handleCheckOut = async (recordToCheckout) => {
    const target = recordToCheckout || activeShiftRecord || latestTodayRecord;
    if (!target) return;

    const checkOutTimeStr = timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setCheckingOut(true);

    try {
      const res = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cutterId,
          date: target.date,
          shift: target.shift,
          checkOutTime: checkOutTimeStr
        })
      });

      const updated = {
        ...target,
        checkOutTime: checkOutTimeStr,
        status: 'Completed Shift'
      };

      setAttendanceHistory(prev => {
        const updatedList = prev.map(a => (a.date === updated.date && a.shift === updated.shift) ? updated : a);
        localStorage.setItem(`attendance_history_${cutterId}`, JSON.stringify(updatedList));
        return updatedList;
      });

      Swal.fire({
        icon: 'info',
        title: 'Shift Completed & Checked Out',
        html: `Checked out at <b>${checkOutTimeStr}</b> for <b>${target.shift} Shift</b>.<br/>Thank you for your dedicated field service!`,
        confirmButtonColor: '#10b981'
      });
    } catch (err) {
      console.error('Error recording checkout:', err);
      Swal.fire({
        icon: 'error',
        title: 'Check-Out Error',
        text: 'Failed to record checkout. Please try again.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setCheckingOut(false);
    }
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
      status: 'Approved',
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
      startDate: getLocalDateString(new Date()),
      endDate: getLocalDateString(new Date(Date.now() + 86400000)),
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
              Attendance is strictly time-based. Shifts automatically activate according to municipal operating hours.
            </p>
          </div>
          <div className="task-hero-stats">
            <div className="task-stat-chip">
              <span>Today's Status</span>
              <strong style={{ color: activeLeave ? '#ef4444' : todayRecords.length > 0 ? '#10b981' : '#f59e0b' }}>
                {activeLeave ? 'On Leave' : todayRecords.length > 0 ? 'Present' : 'Not Checked In'}
              </strong>
            </div>
            <div className="task-stat-chip">
              <span>Current Session</span>
              <strong style={{ color: shiftInfo.active ? '#10b981' : '#94a3b8' }}>
                {shiftInfo.active ? shiftInfo.shift.name : 'Closed'}
              </strong>
            </div>
            <div className="task-stat-chip">
              <span>Live Clock (IST)</span>
              <strong>{timeNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
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
                Leave Period: <b>{activeLeave.startDate}</b> to <b>{activeLeave.endDate}</b> ({activeLeave.leaveType}). Work orders and shift check-ins are disabled during approved leave.
              </span>
            </div>
          </div>
        )}

        {/* 2-Column Main Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }} className="task-workspace-grid">

          {/* ── CARD 1: Time-Based Shift Attendance (NO DROPDOWN) ── */}
          <div className="cg-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#10b981" /> Today's Shift Attendance
              </h3>
              <span style={{ fontSize: '0.82rem', background: 'var(--bg-elevated)', color: 'var(--brand-accent)', padding: '4px 10px', borderRadius: '999px', fontWeight: 700 }}>
                {timeNow.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Current Active Shift Information Badge */}
            <div style={{
              padding: '16px', borderRadius: '14px',
              background: shiftInfo.active ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${shiftInfo.active ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Arborist Specialist:</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{cutterName}</strong>
              </div>

              {/* Real-time Time-Based Shift Indicator (Replaces Dropdown) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Current Active Shift:</span>
                {shiftInfo.active ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 800,
                    background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                    {shiftInfo.shift.name} ({shiftInfo.shift.timeRange})
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700,
                    background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)'
                  }}>
                    <Lock size={14} /> Outside Shift Hours (Closed)
                  </span>
                )}
              </div>

              {/* Status breakdown for the active shift session */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>Session Check-In Status:</span>
                <span style={{
                  fontSize: '0.82rem', padding: '4px 12px', borderRadius: '6px', fontWeight: 800,
                  background: activeShiftRecord
                    ? (activeShiftRecord.checkOutTime ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)')
                    : (shiftInfo.active ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)'),
                  color: activeShiftRecord
                    ? (activeShiftRecord.checkOutTime ? '#60a5fa' : '#34d399')
                    : (shiftInfo.active ? '#f59e0b' : '#94a3b8')
                }}>
                  {activeShiftRecord
                    ? (activeShiftRecord.checkOutTime
                      ? `✓ Completed (Out: ${activeShiftRecord.checkOutTime})`
                      : `✓ Checked In at ${activeShiftRecord.checkInTime}`)
                    : (shiftInfo.active ? 'Not Checked In Yet' : 'No Active Session')}
                </span>
              </div>

              {/* Policy note */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Info size={14} color="#60a5fa" />
                <span>Attendance is locked to the live clock. Manual shift selection is prohibited by municipal policy.</span>
              </div>
            </div>

            {/* 3-Shift Timeline Visualizer Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Today's Shift Operational Windows
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {SHIFT_SCHEDULE.map(s => {
                  const IconComp = s.icon;
                  const isCurrent = shiftInfo.active && shiftInfo.shift?.id === s.id;
                  const record = todayRecords.find(r => r.shift === s.id);
                  const isCheckedIn = Boolean(record);
                  const isCompleted = Boolean(record?.checkOutTime);

                  // Determine card state
                  let statusBadge = 'Upcoming';
                  let badgeBg = 'rgba(255,255,255,0.06)';
                  let badgeColor = 'var(--text-secondary)';

                  const nowMins = timeNow.getHours() * 60 + timeNow.getMinutes();
                  const endMins = s.endHour * 60 + s.endMinute;
                  const startMins = s.startHour * 60 + s.startMinute;

                  if (isCheckedIn) {
                    statusBadge = isCompleted ? 'Completed' : 'Checked In';
                    badgeBg = isCompleted ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)';
                    badgeColor = isCompleted ? '#60a5fa' : '#34d399';
                  } else if (isCurrent) {
                    statusBadge = 'Active Now';
                    badgeBg = 'rgba(16,185,129,0.25)';
                    badgeColor = '#10b981';
                  } else if (nowMins >= endMins) {
                    statusBadge = 'Ended';
                    badgeBg = 'rgba(239,68,68,0.1)';
                    badgeColor = '#ef4444';
                  }

                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isCurrent ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
                        border: isCurrent ? '1.5px solid #10b981' : '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <IconComp size={16} color={s.iconColor} />
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: badgeBg, color: badgeColor, fontWeight: 800 }}>
                          {statusBadge}
                        </span>
                      </div>
                      <div>
                        <b style={{ fontSize: '0.82rem', color: isCurrent ? '#10b981' : 'var(--text-primary)', display: 'block' }}>{s.name}</b>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>{s.timeRange}</span>
                      </div>
                      {record && (
                        <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, marginTop: 'auto', paddingTop: '4px', borderTop: '1px dashed var(--border)' }}>
                          In: {record.checkInTime} {record.checkOutTime ? `| Out: ${record.checkOutTime}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance Action Button Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeLeave ? (
                <button
                  type="button"
                  disabled
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                    background: '#475569', color: '#94a3b8', fontWeight: 800, fontSize: '0.95rem',
                    cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <ShieldAlert size={18} /> Attendance Blocked (Approved Leave Active)
                </button>
              ) : !shiftInfo.active ? (
                // Outside operating hours
                latestTodayRecord && !latestTodayRecord.checkOutTime ? (
                  <button
                    type="button"
                    onClick={() => handleCheckOut(latestTodayRecord)}
                    disabled={checkingOut}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 16px rgba(59,130,246,0.35)'
                    }}
                  >
                    <UserX size={18} /> {checkingOut ? 'Recording Check-Out...' : `Complete ${latestTodayRecord.shift} Shift & Check Out`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                      background: 'rgba(100,116,139,0.25)', color: '#94a3b8', fontWeight: 800, fontSize: '0.92rem',
                      cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      border: '1px solid rgba(148,163,184,0.2)'
                    }}
                  >
                    <Lock size={16} /> Check-In Closed (Operating Hours: 09:00 AM – 05:00 PM)
                  </button>
                )
              ) : !activeShiftRecord ? (
                // Active shift open and not checked in yet
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={markingAttendance}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
                  }}
                >
                  <UserCheck size={18} /> {markingAttendance ? 'Marking Attendance...' : `Mark Present & Check In (${shiftInfo.shift.name})`}
                </button>
              ) : !activeShiftRecord.checkOutTime ? (
                // Checked in for active shift, not yet checked out
                <button
                  type="button"
                  onClick={() => handleCheckOut(activeShiftRecord)}
                  disabled={checkingOut}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 16px rgba(59,130,246,0.35)'
                  }}
                >
                  <UserX size={18} /> {checkingOut ? 'Recording Check-Out...' : `Complete ${shiftInfo.shift.name} & Check Out`}
                </button>
              ) : (
                // Checked in and checked out for active shift
                <div style={{
                  padding: '12px', textAlign: 'center', background: 'rgba(16,185,129,0.15)',
                  borderRadius: '10px', color: '#34d399', fontWeight: 700, fontSize: '0.88rem',
                  border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  <Check size={16} /> Today's {shiftInfo.shift.name} completed and logged (Out: {activeShiftRecord.checkOutTime}).
                </div>
              )}
            </div>
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
                  <div key={att._id || idx} style={{
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


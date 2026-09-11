import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert,
  Inbox
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getTypeIcon = (type) => {
  switch (type) {
    case 'work_completed':
    case 'complaint_closed':
      return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
    case 'status_updated':
    case 'task_assigned':
      return <RefreshCw size={16} style={{ color: '#3b82f6' }} />;
    case 'waste_disposed':
      return <FileText size={16} style={{ color: '#8b5cf6' }} />;
    case 'maintenance_created':
      return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
    case 'attendance_marked':
      return <Clock size={16} style={{ color: '#06b6d4' }} />;
    default:
      return <ShieldAlert size={16} style={{ color: '#10b981' }} />;
  }
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [isClearing, setIsClearing] = useState(false);
  const panelRef = useRef(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const fetchNotifications = async () => {
    if (!currentUser?.id && !currentUser?.role) return;
    try {
      const params = new URLSearchParams({
        userId: currentUser.id || '',
        role: currentUser.role || '',
      });
      const res = await fetch(`${API_URL}/api/notifications?${params}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, role: currentUser.role }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (_) {}
  };

  const clearReadNotifications = async () => {
    setIsClearing(true);
    try {
      await fetch(`${API_URL}/api/notifications/clear-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, role: currentUser.role }),
      });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (_) {}
    finally {
      setIsClearing(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  return (
    <div className="notif-wrapper" ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <button
        className="notif-bell-btn"
        onClick={() => { setOpen(prev => !prev); if (!open) fetchNotifications(); }}
        title="Notifications"
        type="button"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '10px',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'inherit',
          position: 'relative',
          transition: 'all 0.2s ease',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span 
            className="notif-badge"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: '700',
              borderRadius: '999px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Popover Dropdown Panel */}
      {open && (
        <div 
          className="notif-dropdown-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: '380px',
            maxWidth: '90vw',
            background: 'var(--bg-surface, #ffffff)',
            color: 'var(--text-primary, #0f172a)',
            border: '1px solid var(--border, #cbd5e1)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3), 0 8px 16px -6px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'notifSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg-page, #f8fafc)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Notifications</h3>
              {unreadCount > 0 && (
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead} 
                  title="Mark all as read"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                  type="button"
                >
                  <CheckCheck size={15} /> All Read
                </button>
              )}
              <button 
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '6px',
                }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filter Tabs & Quick Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg-surface, #ffffff)',
          }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  background: filter === 'all' ? '#10b981' : 'transparent',
                  color: filter === 'all' ? '#ffffff' : 'var(--text-primary, #64748b)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                type="button"
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                style={{
                  background: filter === 'unread' ? '#10b981' : 'transparent',
                  color: filter === 'unread' ? '#ffffff' : 'var(--text-primary, #64748b)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                type="button"
              >
                Unread ({unreadCount})
              </button>
            </div>

            {notifications.some(n => n.isRead) && (
              <button
                onClick={clearReadNotifications}
                disabled={isClearing}
                title="Remove all read notifications"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                type="button"
              >
                <Trash2 size={13} /> Clear Read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Inbox size={36} style={{ opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  You're all caught up!
                </span>
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div
                  key={n._id}
                  onClick={(e) => !n.isRead && markAsRead(n._id, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border, #f1f5f9)',
                    background: n.isRead ? 'transparent' : 'rgba(16, 185, 129, 0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = n.isRead ? 'rgba(0,0,0,0.03)' : 'rgba(16, 185, 129, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(16, 185, 129, 0.06)';
                  }}
                >
                  {/* Icon Avatar */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: n.isRead ? 'rgba(148, 163, 184, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Body Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: n.isRead ? '600' : '800',
                        color: 'var(--text-primary, #0f172a)',
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: n.isRead ? '#64748b' : 'var(--text-primary, #334155)',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                    }}>
                      {n.message}
                    </p>
                  </div>

                  {/* Actions (Delete Icon) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                    {!n.isRead && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#10b981',
                        flexShrink: 0,
                      }} title="Unread" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(n._id, e)}
                      title="Remove notification"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

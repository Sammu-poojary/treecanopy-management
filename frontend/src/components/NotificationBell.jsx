import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const typeIcons = {
  complaint_submitted: '📋',
  task_assigned: '📌',
  status_updated: '🔄',
  work_completed: '✅',
  waste_disposed: '♻️',
  complaint_closed: '🔒',
  maintenance_created: '🌿',
  attendance_marked: '📅',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || {}; }
    catch { return {}; }
  })();

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const params = new URLSearchParams({
        userId: currentUser.id,
        role: currentUser.role || '',
      });
      const res = await fetch(`${API_URL}/api/notifications?${params}`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="notif-wrapper" ref={panelRef}>
      <button
        className="notif-bell-btn"
        onClick={() => { setOpen(prev => !prev); if (!open) fetchNotifications(); }}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h3>Notifications</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button className="notif-mark-all" onClick={markAllRead} title="Mark all as read">
                  <CheckCheck size={16} /> All read
                </button>
              )}
              <button className="notif-close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} style={{ opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                >
                  <span className="notif-type-icon">{typeIcons[n.type] || '🔔'}</span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

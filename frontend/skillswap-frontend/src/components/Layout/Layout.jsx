/**
 * SkillSwap - Main Layout Component
 * Wraps pages with sidebar and topbar
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI, messageAPI } from '../../services/api';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Welcome back!' },
  '/profile': { title: 'My Profile', subtitle: 'Manage your profile and skills' },
  '/skills': { title: 'Browse Skills', subtitle: 'Discover skills and learners' },
  '/matches': { title: 'Skill Matches', subtitle: 'Users matched to your skills' },
  '/exchanges': { title: 'Exchanges', subtitle: 'Manage your skill exchanges' },
  '/chat': { title: 'Messages', subtitle: 'Chat with your exchange partners' },
  '/reviews': { title: 'Reviews', subtitle: 'Your ratings and feedback' },
  '/admin': { title: 'Admin Panel', subtitle: 'Platform management' },
  '/edit-profile': { title: 'Edit Profile', subtitle: 'Update your information' },
};

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page = pageTitles[location.pathname] || { title: 'SkillSwap', subtitle: '' };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCounts = async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        messageAPI.getUnreadCount(),
        notificationAPI.getAll({ limit: 5 })
      ]);
      setUnreadMessages(msgRes.data.count || 0);
      setUnreadNotifications(notifRes.data.unread || 0);
      setNotifications(notifRes.data.notifications || []);
    } catch (err) {
      // Silently fail - don't disturb UX
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setUnreadNotifications(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {}
  };

  return (
    <div className="app-layout">
      <Sidebar 
        unreadMessages={unreadMessages} 
        unreadNotifications={unreadNotifications} 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="topbar-btn mobile-menu-btn" 
              onClick={() => setSidebarOpen(true)}
              style={{ marginRight: 8 }}
            >
              ☰
            </button>
            <div>
              <div className="topbar-title">{page.title}</div>
              {page.subtitle && <div className="topbar-subtitle">{page.subtitle}</div>}
            </div>
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                id="notification-btn"
                className="topbar-btn"
                onClick={() => setShowNotifDropdown(prev => !prev)}
                title="Notifications"
              >
                🔔
                {unreadNotifications > 0 && (
                  <span className="topbar-badge">{Math.min(unreadNotifications, 99)}</span>
                )}
              </button>

              {showNotifDropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifDropdown(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: '44px', width: '320px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)',
                    zIndex: 100, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>Notifications</strong>
                      {unreadNotifications > 0 && (
                        <button onClick={handleMarkAllRead} style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                          No notifications yet
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: n.is_read ? 'transparent' : 'var(--primary-50)',
                          cursor: 'pointer'
                        }}>
                          <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => { navigate('/dashboard'); setShowNotifDropdown(false); }} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        View all notifications →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <button
              id="messages-btn"
              className="topbar-btn"
              onClick={() => navigate('/chat')}
              title="Messages"
            >
              💬
              {unreadMessages > 0 && (
                <span className="topbar-badge">{Math.min(unreadMessages, 99)}</span>
              )}
            </button>

            {/* User avatar */}
            {user && (
              <button
                className="topbar-btn"
                onClick={() => navigate('/profile')}
                style={{ borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}
              >
                {user.profile_picture ? (
                  <img src={`/uploads/${user.profile_picture}`} alt="avatar" style={{ width: 34, height: 34, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 34, height: 34, background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13
                  }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

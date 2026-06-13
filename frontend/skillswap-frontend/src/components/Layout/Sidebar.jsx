/**
 * SkillSwap - Sidebar Navigation Component
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserAvatar, AvatarPlaceholder } from '../common/Utils';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/profile', icon: '👤', label: 'My Profile' },
  { path: '/skills', icon: '🔍', label: 'Browse Skills' },
  { path: '/matches', icon: '🤝', label: 'My Matches' },
  { path: '/exchanges', icon: '↔️', label: 'Exchanges' },
  { path: '/chat', icon: '💬', label: 'Messages' },
  { path: '/reviews', icon: '⭐', label: 'Reviews' },
];

const adminItems = [
  { path: '/admin', icon: '🛡️', label: 'Admin Panel' },
];

export const Sidebar = ({ unreadMessages = 0, unreadNotifications = 0, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={closeSidebar}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
          }}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">🔄</div>
          <div className="logo-text">Skill<span>Swap</span></div>
          {isOpen && (
            <button 
              className="mobile-close-btn" 
              onClick={closeSidebar}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* User Info */}
        {user && (
          <div className="sidebar-user">
            {user.profile_picture ? (
              <img
                src={`/uploads/${user.profile_picture}`}
                alt={user.name}
                className="avatar sidebar-user-avatar"
                style={{ width: 40, height: 40 }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <AvatarPlaceholder name={user.name} size={40} className="sidebar-user-avatar" />
            )}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.is_admin ? '🛡️ Admin' : `⭐ ${user.rating || '0.0'}`}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon">{item.icon}</span>
              {item.label}
              {item.path === '/chat' && unreadMessages > 0 && (
                <span className="sidebar-badge">{unreadMessages}</span>
              )}
            </NavLink>
          ))}

          {user?.is_admin && (
            <>
              <div className="sidebar-section-label">Administration</div>
              {adminItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="link-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            onClick={toggleTheme}
            className="sidebar-link"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '4px' }}
          >
            <span className="link-icon">{isDark ? '☀️' : '🌙'}</span>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#F87171' }}
          >
            <span className="link-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

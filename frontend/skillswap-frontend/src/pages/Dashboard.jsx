/**
 * SkillSwap - Dashboard Page
 * Main user dashboard with stats, recent exchanges, and activity feed.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Stars, UserAvatar, timeAgo } from '../components/common/Utils';
import { RecommendedUsers } from '../components/ai/RecommendedUsers';

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, trend, onClick }) => (
  <div className="stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {trend != null && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            marginTop: 6,
            color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
        </div>
      )}
    </div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const labels = {
    pending: 'Pending',
    accepted: 'Active',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`badge status-${status}`}>
      {status === 'pending' && '🕐 '}
      {status === 'accepted' && '✅ '}
      {status === 'completed' && '🏆 '}
      {status === 'rejected' && '❌ '}
      {status === 'cancelled' && '🚫 '}
      {labels[status] ?? status}
    </span>
  );
};

// ─── Exchange Request Row ─────────────────────────────────────────────────────
const ExchangeRequestRow = ({ exchange, currentUserId }) => {
  const isRequester = exchange.requester?._id === currentUserId;
  const otherUser = isRequester ? exchange.recipient : exchange.requester;
  const offeredSkill = exchange.skillOffered;
  const wantedSkill = exchange.skillWanted;
  const navigate = useNavigate();

  return (
    <div
      className="exchange-card card-sm"
      style={{ cursor: 'pointer', marginBottom: 0 }}
      onClick={() => navigate('/exchanges')}
    >
      {/* Header row */}
      <div className="exchange-header">
        <div className="exchange-users" style={{ gap: 10 }}>
          <UserAvatar
            src={otherUser?.avatar}
            name={otherUser?.name ?? 'User'}
            size={38}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 140,
              }}
            >
              {otherUser?.name ?? 'Unknown User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {isRequester ? 'You requested' : 'Requested you'}
            </div>
          </div>
        </div>
        <StatusBadge status={exchange.status} />
      </div>

      {/* Skill exchange display */}
      <div className="exchange-skills" style={{ padding: '10px 12px', marginBottom: 10 }}>
        <div className="exchange-skill-box">
          <div className="exchange-skill-name" style={{ fontSize: 13 }}>
            {offeredSkill?.name ?? '—'}
          </div>
          <div className="exchange-skill-label">
            {isRequester ? 'You teach' : 'They teach'}
          </div>
        </div>
        <div className="exchange-icon">⇌</div>
        <div className="exchange-skill-box">
          <div className="exchange-skill-name" style={{ fontSize: 13 }}>
            {wantedSkill?.name ?? '—'}
          </div>
          <div className="exchange-skill-label">
            {isRequester ? 'You learn' : 'They learn'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {exchange.rating != null && <Stars rating={exchange.rating} size={12} />}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {timeAgo(exchange.createdAt)}
        </span>
      </div>
    </div>
  );
};

// ─── Notification icon map ────────────────────────────────────────────────────
const notifIcon = (type) => {
  const map = {
    exchange_request: '🤝',
    exchange_accepted: '✅',
    exchange_rejected: '❌',
    exchange_completed: '🏆',
    new_message: '💬',
    new_review: '⭐',
    system: '🔔',
  };
  return map[type] ?? '🔔';
};

// ─── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ notification }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
    }}
  >
    {/* Icon bubble */}
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius)',
        background: notification.isRead
          ? 'var(--bg-secondary)'
          : 'var(--primary-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        flexShrink: 0,
      }}
    >
      {notifIcon(notification.type)}
    </div>

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: notification.isRead ? 500 : 700,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          marginBottom: 2,
        }}
      >
        {notification.title ?? notification.message}
      </div>
      {notification.message && notification.title && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {notification.message}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        {timeAgo(notification.createdAt)}
      </div>
    </div>

    {/* Unread dot */}
    {!notification.isRead && (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--primary)',
          flexShrink: 0,
          marginTop: 4,
        }}
      />
    )}
  </div>
);

// ─── Quick Action Button ──────────────────────────────────────────────────────
const QuickAction = ({ icon, label, description, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'var(--transition)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      width: '100%',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--primary-200)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'none';
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 'var(--radius)',
        background: color ?? 'var(--primary-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
        {description}
      </div>
    </div>
    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}>
      →
    </span>
  </button>
);

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const Skeleton = ({ height = 20, width = '100%', radius = 6, style = {} }) => (
  <div
    style={{
      height,
      width,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}
  />
);

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Greeting based on hour
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userAPI.getDashboard();
      setDashData(res.data?.data ?? res.data);
    } catch (err) {
      const msg =
        err.response?.data?.message ?? 'Failed to load dashboard. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Loading skeleton UI ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-content">
        {/* Shimmer keyframe */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        {/* Page header skeleton */}
        <div className="page-header" style={{ marginBottom: 28 }}>
          <Skeleton height={30} width={280} radius={8} />
          <Skeleton height={16} width={200} radius={6} style={{ marginTop: 8 }} />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="stat-card">
              <Skeleton height={48} width={48} radius={10} />
              <div style={{ flex: 1 }}>
                <Skeleton height={28} width={60} radius={6} />
                <Skeleton height={12} width={100} radius={4} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Two-column skeleton */}
        <div className="grid-2">
          {[0, 1].map((i) => (
            <div key={i} className="card">
              <Skeleton height={20} width={160} radius={6} style={{ marginBottom: 20 }} />
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}
                >
                  <Skeleton height={38} width={38} radius={50} />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={14} width="70%" radius={4} />
                    <Skeleton height={11} width="50%" radius={4} style={{ marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">Could not load dashboard</div>
          <div className="empty-state-text">{error}</div>
          <button className="btn btn-primary" onClick={fetchDashboard}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Destructure dashboard data ───────────────────────────────────────────────
  const stats = dashData?.stats ?? {};
  const recentExchanges = dashData?.recentExchanges ?? [];
  const notifications = dashData?.recentNotifications ?? dashData?.notifications ?? [];

  const statCards = [
    {
      icon: '⏳',
      label: 'Pending Requests',
      value: stats.pending_requests ?? stats.pendingRequests ?? 0,
      color: 'yellow',
      trend: stats.pendingTrend,
      onClick: () => navigate('/exchanges'),
    },
    {
      icon: '🔄',
      label: 'Active Exchanges',
      value: stats.active_exchanges ?? stats.activeExchanges ?? 0,
      color: 'blue',
      trend: stats.activeTrend,
      onClick: () => navigate('/exchanges'),
    },
    {
      icon: '🏆',
      label: 'Completed',
      value: stats.completed_exchanges ?? stats.completedExchanges ?? 0,
      color: 'green',
      trend: stats.completedTrend,
      onClick: () => navigate('/exchanges'),
    },
    {
      icon: '🎓',
      label: 'Skills Offered',
      value: stats.skills_offered ?? stats.skillsOffered ?? 0,
      color: 'purple',
      onClick: () => navigate('/profile'),
    },
    {
      icon: '🌱',
      label: 'Skills Wanted',
      value: stats.skills_wanted ?? stats.skillsWanted ?? 0,
      color: 'red',
      onClick: () => navigate('/profile'),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="page-subtitle">
            Here's what's happening with your skill exchanges today.
          </p>
        </div>

        {/* Rating summary pill */}
        {stats.averageRating != null && stats.averageRating > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--warning-light)',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
            }}
          >
            <Stars rating={stats.averageRating} size={13} />
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--warning)' }}>
              {Number(stats.averageRating).toFixed(1)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              avg rating
            </span>
          </div>
        )}
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{ marginBottom: 24, padding: '20px 24px' }}
      >
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="card-title">Quick Actions</div>
            <div className="card-subtitle">Jump right into what matters</div>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          <QuickAction
            icon="🔍"
            label="Browse Skills"
            description="Explore skills from the community"
            color="var(--primary-100)"
            onClick={() => navigate('/skills')}
          />
          <QuickAction
            icon="🎯"
            label="View Matches"
            description="See users who match your goals"
            color="#EDE9FE"
            onClick={() => navigate('/matches')}
          />
          <QuickAction
            icon="⚡"
            label="Manage Exchanges"
            description="Review & respond to requests"
            color="var(--success-light)"
            onClick={() => navigate('/exchanges')}
          />
        </div>
      </div>

      {/* ── AI Recommended Users ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <RecommendedUsers />
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────────────────── */}
      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* ── Left: Recent Exchange Requests ─────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Requests</div>
              <div className="card-subtitle">Your latest skill exchange activity</div>
            </div>
            {recentExchanges.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/exchanges')}
              >
                View All
              </button>
            )}
          </div>

          {recentExchanges.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🤝</div>
              <div className="empty-state-title">No exchanges yet</div>
              <div className="empty-state-text">
                Browse skills and send your first exchange request!
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/skills')}
              >
                🔍 Browse Skills
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentExchanges.slice(0, 5).map((exchange) => (
                <ExchangeRequestRow
                  key={exchange._id}
                  exchange={exchange}
                  currentUserId={user?._id ?? user?.id}
                />
              ))}
              {recentExchanges.length > 5 && (
                <button
                  className="btn btn-secondary btn-sm btn-full"
                  onClick={() => navigate('/exchanges')}
                  style={{ marginTop: 4 }}
                >
                  View {recentExchanges.length - 5} more exchanges →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Recent Activity Feed ──────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Your latest notifications</div>
            </div>
            {notifications.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/notifications')}
              >
                View All
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">No activity yet</div>
              <div className="empty-state-text">
                Notifications about exchanges and messages will appear here.
              </div>
            </div>
          ) : (
            <div>
              {notifications.slice(0, 8).map((notif, idx) => (
                <ActivityRow key={notif._id ?? idx} notification={notif} />
              ))}
              {/* Remove bottom border from last item */}
              <style>{`
                .activity-feed > div:last-child {
                  border-bottom: none;
                }
              `}</style>
              {notifications.length > 8 && (
                <button
                  className="btn btn-secondary btn-sm btn-full"
                  onClick={() => navigate('/notifications')}
                  style={{ marginTop: 12 }}
                >
                  View {notifications.length - 8} more notifications →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Motivational Footer Banner ───────────────────────────────────────── */}
      {(stats.completedExchanges ?? 0) > 0 && (
        <div
          style={{
            marginTop: 24,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              🎉 You've completed {stats.completedExchanges} exchange
              {stats.completedExchanges !== 1 ? 's' : ''}!
            </div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Keep learning and sharing — every exchange makes the community stronger.
            </div>
          </div>
          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1.5px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(4px)',
              flexShrink: 0,
            }}
            onClick={() => navigate('/profile')}
          >
            View Profile →
          </button>
        </div>
      )}

    </div>
  );
};

export default Dashboard;

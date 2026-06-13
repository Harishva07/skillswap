/**
 * SkillSwap - Admin Dashboard
 */

import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { timeAgo } from '../../components/common/Utils';
import { Modal } from '../../components/common/Modal';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [topSkills, setTopSkills] = useState([]);
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmModal, setConfirmModal] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'skills') loadSkills();
    if (activeTab === 'exchanges') loadExchanges();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, page, userSearch]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getStats();
      setStats(res.data.stats);
      setTopSkills(res.data.topSkills || []);
    } catch (err) {
      toast('Failed to load stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await adminAPI.getUsers({ search: userSearch, page, limit: 15 });
      setUsers(res.data.users || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      toast('Failed to load users', 'error');
    }
  };

  const loadSkills = async () => {
    try {
      const res = await adminAPI.getSkills();
      setSkills(res.data.skills || []);
    } catch (err) {}
  };

  const loadExchanges = async () => {
    try {
      const res = await adminAPI.getExchanges({ page, limit: 15 });
      setExchanges(res.data.exchanges || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {}
  };

  const loadLogs = async () => {
    try {
      const res = await adminAPI.getLogs();
      setLogs(res.data.logs || []);
    } catch (err) {}
  };

  const handleBlockUser = async (userId, currentlyBlocked) => {
    setConfirmModal({
      title: currentlyBlocked ? 'Unblock User' : 'Block User',
      message: `Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} this user?`,
      onConfirm: async () => {
        try {
          await adminAPI.toggleUserBlock(userId, !currentlyBlocked);
          toast(`User ${currentlyBlocked ? 'unblocked' : 'blocked'}!`, 'success');
          loadUsers();
        } catch (err) {
          toast(err.response?.data?.message || 'Failed', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    setConfirmModal({
      title: '⚠️ Delete User',
      message: 'This action is permanent and cannot be undone. All user data will be deleted.',
      danger: true,
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(userId);
          toast('User deleted', 'success');
          loadUsers();
        } catch (err) {
          toast(err.response?.data?.message || 'Failed', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: '👥', color: 'blue' },
    { label: 'New Today', value: stats.new_users_today, icon: '🆕', color: 'green' },
    { label: 'Total Exchanges', value: stats.total_exchanges, icon: '↔️', color: 'purple' },
    { label: 'Completed', value: stats.completed_exchanges, icon: '🏆', color: 'green' },
    { label: 'Skills', value: stats.total_skills, icon: '🎯', color: 'blue' },
    { label: 'Reviews', value: stats.total_reviews, icon: '⭐', color: 'yellow' },
    { label: 'Messages', value: stats.total_messages, icon: '💬', color: 'blue' },
    { label: 'Blocked Users', value: stats.blocked_users, icon: '🚫', color: 'red' },
  ] : [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">🛡️ Admin Panel</h1>
          <p className="page-subtitle">Platform management and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--danger-light)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13 }}>
          <span>🔴</span>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Admin Mode Active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['overview', '📊 Overview'], ['users', '👥 Users'], ['skills', '🎯 Skills'], ['exchanges', '↔️ Exchanges'], ['logs', '📋 Logs']].map(([tab, label]) => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>

      {loading && activeTab === 'overview' ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="grid-4" style={{ gap: 16, marginBottom: 24 }}>
                {statCards.map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                    <div>
                      <div className="stat-value">{s.value?.toLocaleString() || 0}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Skills */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🔥 Top Skills by Popularity</div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Skill</th>
                        <th>Category</th>
                        <th>Popularity</th>
                        <th>Offering</th>
                        <th>Wanting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSkills.map((s, i) => (
                        <tr key={s.id}>
                          <td><span style={{ fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)' }}>#{i + 1}</span></td>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td><span className="badge badge-blue">{s.category}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((s.popularity / 100) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.popularity}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-green">{s.users_offering}</span></td>
                          <td><span className="badge badge-purple">{s.users_wanting}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="search-bar" style={{ maxWidth: 360 }}>
                  <span className="search-icon">🔍</span>
                  <input placeholder="Search users..." value={userSearch} onChange={e => { setUserSearch(e.target.value); setPage(1); }} />
                </div>
              </div>
              <div className="table-wrapper card" style={{ padding: 0 }}>
                <table>
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Level</th><th>Rating</th><th>Exchanges</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                        <td><span className="badge badge-blue">{u.experience_level}</span></td>
                        <td>{'⭐ ' + (u.rating || '0.0')}</td>
                        <td>{u.total_exchanges}</td>
                        <td>
                          <span className={`badge ${u.is_blocked ? 'badge-red' : 'badge-green'}`}>
                            {u.is_blocked ? '🚫 Blocked' : '✅ Active'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(u.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className={`btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => handleBlockUser(u.id, u.is_blocked)}
                            >
                              {u.is_blocked ? 'Unblock' : 'Block'}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}

          {/* SKILLS */}
          {activeTab === 'skills' && (
            <div className="table-wrapper card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr><th>Skill</th><th>Category</th><th>Popularity</th><th>Offering</th><th>Wanting</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {skills.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="badge badge-blue">{s.category}</span></td>
                      <td>{s.popularity}</td>
                      <td>{s.users_offering}</td>
                      <td>{s.users_wanting}</td>
                      <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>{s.is_active ? '✅ Active' : '🚫 Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EXCHANGES */}
          {activeTab === 'exchanges' && (
            <div>
              <div className="table-wrapper card" style={{ padding: 0 }}>
                <table>
                  <thead>
                    <tr><th>ID</th><th>From</th><th>To</th><th>Offering</th><th>Wanting</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {exchanges.map(ex => (
                      <tr key={ex.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>#{ex.id}</td>
                        <td>{ex.requester_name}</td>
                        <td>{ex.recipient_name}</td>
                        <td><span className="badge badge-blue">{ex.offered_skill}</span></td>
                        <td><span className="badge badge-purple">{ex.wanted_skill}</span></td>
                        <td><span className={`badge status-${ex.status}`}>{ex.status}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(ex.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}

          {/* LOGS */}
          {activeTab === 'logs' && (
            <div className="card">
              <div className="card-header"><div className="card-title">📋 Admin Activity Logs</div></div>
              {logs.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No logs yet</div></div>
              ) : logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🛡️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{log.action.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>by {log.admin_name} • {timeAgo(log.created_at)}</div>
                    {log.details && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{log.details}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirm Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
            <button className={`btn ${confirmModal?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirmModal?.onConfirm}>
              Confirm
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{confirmModal?.message}</p>
      </Modal>
    </div>
  );
};

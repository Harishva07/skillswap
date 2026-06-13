/**
 * SkillSwap - Exchange Requests Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { UserAvatar, timeAgo, capitalize } from '../components/common/Utils';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pending', class: 'status-pending', icon: '⏳' },
  accepted: { label: 'Accepted', class: 'status-accepted', icon: '✅' },
  rejected: { label: 'Rejected', class: 'status-rejected', icon: '❌' },
  completed: { label: 'Completed', class: 'status-completed', icon: '🏆' },
  cancelled: { label: 'Cancelled', class: 'status-cancelled', icon: '🚫' },
};

export const ExchangeRequests = () => {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, sent, received
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchExchanges();
  }, [activeTab, statusFilter, page]);

  const fetchExchanges = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (activeTab !== 'all') params.type = activeTab;
      if (statusFilter) params.status = statusFilter;
      const res = await exchangeAPI.getAll(params);
      setExchanges(res.data.exchanges || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      toast('Failed to load exchanges', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await exchangeAPI.updateStatus(id, status);
      toast(`Exchange ${status}!`, 'success');
      fetchExchanges();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
    }
  };

  const handleDeleteExchange = async (id) => {
    try {
      await exchangeAPI.delete(id);
      toast('Exchange deleted permanently.', 'success');
      fetchExchanges();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  const ExchangeCard = ({ exchange }) => {
    const status = STATUS_CONFIG[exchange.status] || STATUS_CONFIG.pending;
    const isSent = exchange.direction === 'sent';
    const otherUser = isSent
      ? { name: exchange.recipient_name, avatar: exchange.recipient_avatar, id: exchange.recipient_id }
      : { name: exchange.requester_name, avatar: exchange.requester_avatar, id: exchange.requester_id };

    return (
      <div className="exchange-card">
        {/* Header */}
        <div className="exchange-header">
          <div className="exchange-users">
            <UserAvatar src={otherUser.avatar} name={otherUser.name} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {isSent ? '→ To: ' : '← From: '}{otherUser.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(exchange.created_at)}</div>
            </div>
          </div>
          <span className={`badge ${status.class}`}>{status.icon} {status.label}</span>
        </div>

        {/* Skills */}
        <div className="exchange-skills">
          <div className="exchange-skill-box">
            {exchange.offered_skill ? (
              <>
                <div className="exchange-skill-name">🎯 {exchange.offered_skill}</div>
                <div className="exchange-skill-label">Offering</div>
              </>
            ) : (
              <>
                <div className="exchange-skill-name" style={{ color: 'var(--text-muted)' }}>🙌 Mentorship</div>
                <div className="exchange-skill-label">Just Learning</div>
              </>
            )}
          </div>
          <span className="exchange-icon">{exchange.offered_skill ? '⇄' : '→'}</span>
          <div className="exchange-skill-box">
            <div className="exchange-skill-name">📚 {exchange.wanted_skill}</div>
            <div className="exchange-skill-label">Wanting</div>
          </div>
        </div>

        {/* Message */}
        {exchange.message && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 14, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--primary)' }}>
            "{exchange.message}"
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Chat button for accepted exchanges */}
          {exchange.status === 'accepted' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/chat?userId=${otherUser.id}`)}>
              💬 Chat
            </button>
          )}

          {/* Recipient can accept/reject pending */}
          {exchange.status === 'pending' && exchange.direction === 'received' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(exchange.id, 'accepted')}>✅ Accept</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(exchange.id, 'rejected')}>❌ Decline</button>
            </>
          )}

          {/* Requester can cancel pending */}
          {exchange.status === 'pending' && exchange.direction === 'sent' && (
            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(exchange.id, 'cancelled')}>🚫 Cancel</button>
          )}

          {/* Either party can mark as completed */}
          {exchange.status === 'accepted' && (
            <button className="btn btn-outline btn-sm" onClick={() => handleUpdateStatus(exchange.id, 'completed')}>🏆 Mark Complete</button>
          )}

          {/* Review for completed exchanges */}
          {exchange.status === 'completed' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setReviewModal({ exchangeId: exchange.id, userName: otherUser.name })}>⭐ Leave Review</button>
          )}

          {/* Re-request for cancelled/rejected exchanges */}
          {(exchange.status === 'cancelled' || exchange.status === 'rejected') && (
            <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(exchange.id, 'pending')}>
              🔄 Re-request
            </button>
          )}

          {/* Delete Option (Available for all exchanges) */}
          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteExchange(exchange.id)} style={{ marginLeft: 'auto' }}>
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Skill Exchanges</h1>
        <p className="page-subtitle">Manage your skill exchange requests and active sessions</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Direction tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 4, borderRadius: 'var(--radius)' }}>
          {[['all', '🔄 All'], ['sent', '→ Sent'], ['received', '← Received']].map(([val, label]) => (
            <button key={val} onClick={() => { setActiveTab(val); setPage(1); }}
              className={`btn btn-sm ${activeTab === val ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto', padding: '8px 12px' }}>
          <option value="">All Statuses</option>
          <option value="pending">⏳ Pending</option>
          <option value="accepted">✅ Accepted</option>
          <option value="completed">🏆 Completed</option>
          <option value="rejected">❌ Rejected</option>
          <option value="cancelled">🚫 Cancelled</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
      ) : exchanges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-title">No exchanges found</div>
          <div className="empty-state-text">Start by finding matches and sending exchange requests!</div>
          <button className="btn btn-primary" onClick={() => navigate('/matches')}>Find Matches →</button>
        </div>
      ) : (
        <>
          <div className="grid-2" style={{ gap: 16 }}>
            {exchanges.map(ex => <ExchangeCard key={ex.id} exchange={ex} />)}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={`⭐ Review for ${reviewModal?.userName}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting} onClick={async () => {
              setSubmitting(true);
              try {
                const { default: api } = await import('../services/api');
                await api.post('/reviews', { exchange_id: reviewModal.exchangeId, ...reviewForm });
                toast('Review submitted! 🎉', 'success');
                setReviewModal(null);
                setReviewForm({ rating: 5, comment: '' });
              } catch (err) {
                toast(err.response?.data?.message || 'Failed to submit review', 'error');
              } finally {
                setSubmitting(false);
              }
            }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Rating</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(r => (
              <span key={r} onClick={() => setReviewForm(prev => ({ ...prev, rating: r }))}
                style={{ fontSize: 28, cursor: 'pointer', color: r <= reviewForm.rating ? '#FCD34D' : 'var(--gray-200)' }}>★</span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Comment (optional)</label>
          <textarea className="form-textarea" rows={3} placeholder="Share your experience..."
            value={reviewForm.comment} onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

/**
 * SkillSwap - Reviews Page
 */

import { useState, useEffect } from 'react';
import { reviewAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Stars, UserAvatar, timeAgo } from '../components/common/Utils';

export const Reviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myReviews, setMyReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [myRes, receivedRes] = await Promise.all([
        reviewAPI.getMyReviews(),
        reviewAPI.getUserReviews(user.id, { limit: 50 })
      ]);
      setMyReviews(myRes.data.reviews || []);
      setReceivedReviews(receivedRes.data.reviews || []);
      setReviewStats(receivedRes.data.stats);
    } catch (err) {
      toast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ReviewCard = ({ review, showReviewee = false }) => (
    <div className="card card-sm" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <UserAvatar
          src={showReviewee ? review.reviewee_avatar : review.reviewer_avatar}
          name={showReviewee ? review.reviewee_name : review.reviewer_name}
          size={40}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {showReviewee ? review.reviewee_name : review.reviewer_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stars rating={review.rating} size={15} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(review.created_at)}</span>
            </div>
          </div>
          {(review.offered_skill || review.wanted_skill) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              🔄 {review.offered_skill} ↔ {review.wanted_skill}
            </div>
          )}
          {review.comment && (
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              "{review.comment}"
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reviews & Ratings</h1>
        <p className="page-subtitle">See feedback from your skill exchanges</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
      ) : (
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Stats Panel */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="card-title">📊 Your Rating Summary</div>
              </div>
              
              {/* Overall rating */}
              <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {parseFloat(user.rating || 0).toFixed(1)}
                </div>
                <Stars rating={user.rating || 0} size={22} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  Based on {user.total_reviews || 0} review{user.total_reviews !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Rating distribution */}
              {reviewStats?.distribution?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Rating Distribution</div>
                  {[5, 4, 3, 2, 1].map(r => {
                    const found = reviewStats.distribution.find(d => d.rating === r);
                    const count = found ? parseInt(found.count) : 0;
                    const pct = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                    return (
                      <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 20 }}>{r}★</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 24 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Exchanges count */}
            <div className="card card-sm" style={{ display: 'flex', gap: 20 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{user.total_exchanges || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Exchanges</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{myReviews.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reviews Given</div>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div>
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`} onClick={() => setActiveTab('received')}>
                ⭐ Received ({receivedReviews.length})
              </button>
              <button className={`tab-btn ${activeTab === 'given' ? 'active' : ''}`} onClick={() => setActiveTab('given')}>
                📝 Given ({myReviews.length})
              </button>
            </div>

            {activeTab === 'received' && (
              receivedReviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⭐</div>
                  <div className="empty-state-title">No reviews yet</div>
                  <div className="empty-state-text">Complete skill exchanges to receive reviews!</div>
                </div>
              ) : receivedReviews.map(r => <ReviewCard key={r.id} review={r} />)
            )}

            {activeTab === 'given' && (
              myReviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <div className="empty-state-title">No reviews given</div>
                  <div className="empty-state-text">After completing an exchange, you can leave a review!</div>
                </div>
              ) : myReviews.map(r => <ReviewCard key={r.id} review={r} showReviewee />)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

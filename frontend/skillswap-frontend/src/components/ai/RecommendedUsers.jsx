/**
 * SkillSwap AI - RecommendedUsers Component
 * Shows AI-recommended users on the Dashboard with match scores and connect buttons.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { UserAvatar, Stars } from '../common/Utils';

/**
 * RecommendedUsers — Dashboard widget showing top AI-recommended users to connect with.
 */
export function RecommendedUsers() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/ai/recommendations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setRecommendations(data.recommendations || []);
          setMessage(data.message || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span className="ai-label" style={{ marginRight: 8 }}>AI</span>
            Recommended for You
          </h3>
        </div>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <LoadingSpinner size="small" />
        </div>
      </div>
    );
  }

  if (message || recommendations.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <span className="ai-label" style={{ marginRight: 8 }}>AI</span>
            Recommended for You
          </h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <p>{message || 'No recommendations yet. Add skills to get personalized matches!'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/profile')}>
            Add Skills
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <span className="ai-label" style={{ marginRight: 8 }}>AI</span>
          Recommended for You
        </h3>
        <button className="btn btn-sm btn-outline" onClick={() => navigate('/matches')}>
          View All Matches
        </button>
      </div>

      <div className="recommended-users-grid">
        {recommendations.map((user) => (
          <div key={user.id} className="recommended-user-card">
            {/* Match percentage ring */}
            <div className="rec-match-ring">
              <svg viewBox="0 0 36 36" className="rec-ring-svg">
                <path
                  className="rec-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="var(--border)" strokeWidth="3"
                />
                <path
                  className="rec-ring-fill"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="var(--primary)" strokeWidth="3"
                  strokeDasharray={`${user.match_score || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="rec-ring-pct">{Math.round(user.match_score || 0)}%</span>
            </div>

            {/* User info */}
            <div className="rec-user-info">
              <UserAvatar user={user} size={40} />
              <div className="rec-user-details">
                <span className="rec-user-name">{user.name}</span>
                <span className="rec-user-location">{user.location || 'No location'}</span>
                <Stars rating={parseFloat(user.rating) || 0} size="sm" />
              </div>
            </div>

            {/* Match reasons */}
            {user.match_reasons && user.match_reasons.length > 0 && (
              <div className="rec-reasons">
                {user.match_reasons.slice(0, 2).map((reason, i) => (
                  <span key={i} className="rec-reason-chip">✓ {reason}</span>
                ))}
              </div>
            )}

            {/* Skills preview */}
            {user.skills && user.skills.length > 0 && (
              <div className="rec-skills">
                {user.skills.slice(0, 3).map((skill, i) => (
                  <span
                    key={i}
                    className={`badge ${skill.type === 'offered' ? 'badge-primary' : 'badge-secondary'}`}
                  >
                    {skill.name}
                  </span>
                ))}
                {user.skills.length > 3 && (
                  <span className="badge badge-ghost">+{user.skills.length - 3}</span>
                )}
              </div>
            )}

            {/* Connect button */}
            <button
              className="btn btn-primary btn-sm rec-connect-btn"
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              View Profile →
            </button>
          </div>
        ))}
      </div>

      <div className="ai-panel-footer" style={{ padding: '8px 16px' }}>
        ✨ Recommendations update daily based on your skills
      </div>
    </div>
  );
}

export default RecommendedUsers;

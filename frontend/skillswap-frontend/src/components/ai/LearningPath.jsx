/**
 * SkillSwap AI - LearningPath Component
 * Displays AI-generated learning path suggestions after a user adds a skill.
 */

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

const CATEGORY_ICONS = {
  Technology: '💻',
  Design: '🎨',
  Music: '🎵',
  Language: '🌍',
  Arts: '🖼️',
  'Health & Fitness': '💪',
  Lifestyle: '✨',
  Business: '📊',
};

/**
 * LearningPath — Shows learning path suggestions for a skill.
 * @param {Object} props
 * @param {string} props.skillName - The skill just added
 * @param {number} [props.skillId] - Optional skill ID
 * @param {Function} [props.onAddSkill] - Callback when user clicks "Add to Profile"
 * @param {Function} [props.onClose] - Callback to close this component
 */
export function LearningPath({ skillName, skillId, onAddSkill, onClose }) {
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedSkills, setAddedSkills] = useState(new Set());

  useEffect(() => {
    if (!skillName) return;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (skillName) params.set('skill', skillName);
    if (skillId) params.set('skillId', skillId);

    fetch(`/api/ai/learning-path?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setPath(data.learningPath || []);
        } else {
          setError(data.message);
        }
      })
      .catch(() => setError('Failed to load learning path'))
      .finally(() => setLoading(false));
  }, [skillName, skillId]);

  const handleAdd = async (item) => {
    if (!onAddSkill || addedSkills.has(item.name)) return;
    setAddedSkills(prev => new Set([...prev, item.name]));
    await onAddSkill(item);
  };

  if (loading) {
    return (
      <div className="learning-path-card ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-icon">✨</span>
          <span>Generating your learning path...</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <LoadingSpinner size="small" />
        </div>
      </div>
    );
  }

  if (error || path.length === 0) return null;

  return (
    <div className="learning-path-card ai-panel" style={{ animationDelay: '0.1s' }}>
      <div className="ai-panel-header">
        <div>
          <span className="ai-panel-icon">🧠</span>
          <span className="ai-panel-title">AI Learning Path</span>
          <span className="ai-label">AI</span>
        </div>
        {onClose && (
          <button className="ai-panel-close" onClick={onClose} title="Dismiss">✕</button>
        )}
      </div>

      <p className="ai-panel-subtitle">
        Since you added <strong>{skillName}</strong>, here are skills to learn next:
      </p>

      <div className="learning-path-list">
        {path.map((item, idx) => (
          <div
            key={item.name}
            className="learning-path-item"
            style={{ animationDelay: `${idx * 0.07}s` }}
          >
            <div className="learning-path-item-left">
              <span className="learning-path-index">{idx + 1}</span>
              <div>
                <span className="learning-path-icon">
                  {CATEGORY_ICONS[item.category] || '📌'}
                </span>
                <div className="learning-path-info">
                  <span className="learning-path-name">{item.name}</span>
                  <span className="learning-path-category">{item.category}</span>
                </div>
              </div>
            </div>
            {onAddSkill && (
              <button
                className={`btn btn-sm ${addedSkills.has(item.name) ? 'btn-success' : 'btn-outline'}`}
                onClick={() => handleAdd(item)}
                disabled={addedSkills.has(item.name)}
              >
                {addedSkills.has(item.name) ? '✓ Added' : '+ Add'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="ai-panel-footer">
        ✨ Personalized by AI based on your profile
      </div>
    </div>
  );
}

export default LearningPath;

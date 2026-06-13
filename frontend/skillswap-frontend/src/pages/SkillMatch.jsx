/**
 * SkillSwap - Skill Match Page
 * Shows users that best match your skill offering/wanting profile
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, exchangeAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner, ButtonSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { Stars, UserAvatar } from '../components/common/Utils';
import { MatchExplanation } from '../components/ai/MatchExplanation';

// ─── Constants ────────────────────────────────────────────────────────────────

const MATCH_COLOR = (pct) => {
  if (pct >= 80) return '#10b981'; // green
  if (pct >= 60) return '#f59e0b'; // amber
  if (pct >= 40) return '#3b82f6'; // blue
  return '#6b7280';                 // gray
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Circular match percentage ring using SVG */
const MatchRing = ({ percentage = 0 }) => {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const color = MATCH_COLOR(pct);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="match-ring" style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="7"
          className="match-ring-bar"
        />
        {/* Fill */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="match-ring-fill"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* Center label */}
      <div
        className="match-pct"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: '1rem' }}>{pct}%</span>
        <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>match</span>
      </div>
    </div>
  );
};

/** Skill tag pill */
const SkillPill = ({ name, type }) => {
  const styles = type === 'offer'
    ? { background: '#10b98114', color: '#059669', border: '1px solid #10b98130' }
    : { background: '#f59e0b14', color: '#d97706', border: '1px solid #f59e0b30' };
  return (
    <span className="skill-tag" style={{ ...styles, fontSize: '0.72rem', fontWeight: 500 }}>
      {type === 'offer' ? '✅' : '🔍'} {name}
    </span>
  );
};

/** Collapsible skill overlap section */
const SkillOverlapRow = ({ label, skills = [], type, emptyMsg }) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
      {label}
    </p>
    {skills.length === 0 ? (
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{emptyMsg}</span>
    ) : (
      <div className="skills-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {skills.map((s, i) => (
          <SkillPill key={s.id || i} name={s.name || s} type={type} />
        ))}
      </div>
    )}
  </div>
);

/** Individual match user card */
const MatchCard = ({ match, onSendRequest }) => {
  // Support both old (userAPI) and new (aiAPI) response shapes
  const matchedUser = match.user || match;
  const matchPct = match.match_percentage || 0;
  const reasons = match.match_reasons || [];
  const skillMatches = match.skill_matches || [];
  const theyOffer = match.skills_offered || match.they_offer_i_want || [];
  const theyWant = match.skills_wanted || match.i_offer_they_want || [];

  return (
    <div
      className="user-card card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'transform 0.18s, box-shadow 0.18s',
        borderTop: `3px solid ${MATCH_COLOR(matchPct)}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Top: avatar + info + ring */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <UserAvatar src={matchedUser.profile_picture} name={matchedUser.name} size={52} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 2px' }}>
            {matchedUser.name}
          </h3>
          {matchedUser.location && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
              📍 {matchedUser.location}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Stars rating={parseFloat(matchedUser.rating) || 0} size={12} />
            {matchedUser.total_exchanges > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                · {matchedUser.total_exchanges} exchange{matchedUser.total_exchanges !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {matchedUser.bio && (
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              margin: '0.4rem 0 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {matchedUser.bio}
            </p>
          )}
        </div>

        {/* Match ring */}
        <MatchRing percentage={matchPct} />
      </div>

      {/* AI Match Explanation */}
      {(reasons.length > 0 || skillMatches.length > 0) && (
        <MatchExplanation
          reasons={reasons}
          skillMatches={skillMatches}
          matchPercentage={matchPct}
        />
      )}

      {/* Skill Overlaps */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkillOverlapRow
          label="They offer → you want"
          skills={theyOffer.filter(s => s.type === 'offered' || !s.type)}
          type="offer"
          emptyMsg="No direct overlap"
        />
        <SkillOverlapRow
          label="You offer → they want"
          skills={theyWant.filter(s => s.type === 'wanted' || !s.type)}
          type="want"
          emptyMsg="No direct overlap"
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: '0.83rem', padding: '0.5rem' }}
          onClick={() => onSendRequest(match)}
        >
          🤝 Request Exchange
        </button>
        <button
          className="btn btn-outline"
          style={{ flex: 1, fontSize: '0.83rem', padding: '0.5rem' }}
          onClick={() => window.location.href = `/messages?userId=${matchedUser.id}`}
        >
          💬 Send Message
        </button>
      </div>
    </div>
  );
};

// ─── Exchange Request Modal ───────────────────────────────────────────────────

const ExchangeRequestModal = ({ isOpen, onClose, match, mySkills, onSuccess }) => {
  const { toast } = useToast();
  const [offeredSkillId,  setOfferedSkillId]  = useState('');
  const [wantedSkillId,   setWantedSkillId]   = useState('');
  const [message,         setMessage]         = useState('');
  const [submitting,      setSubmitting]       = useState(false);

  // Derive their skills from match data
  const theirOfferedSkills = match?.they_offer_i_want || [];
  const theirAllSkills     = match?.matched_user?.skills_offering || match?.matchedUser?.skills_offering || theirOfferedSkills;

  // Reset when opening a new match
  useEffect(() => {
    if (isOpen) {
      setOfferedSkillId('');
      setWantedSkillId('');
      setMessage('');
    }
  }, [isOpen, match?.user?.id]);

  const matchedUser = match?.user || match?.matchedUser || match || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offeredSkillId) return toast("Please select a skill you're offering, or choose 'None'", 'warning');
    if (!wantedSkillId)  return toast('Please select a skill you want to learn', 'warning');

    setSubmitting(true);
    try {
      await exchangeAPI.create({
        recipient_id:      matchedUser.id,
        offered_skill_id:  offeredSkillId === 'none' ? undefined : Number(offeredSkillId),
        wanted_skill_id:   Number(wantedSkillId),
        message:           message.trim() || undefined,
      });
      toast('Exchange request sent! 🎉', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request. Please try again.';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request Exchange with ${matchedUser.name || matchedUser.username || 'User'}`}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><ButtonSpinner /> Sending…</> : '🤝 Send Request'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        {/* Matched user preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.75rem 1rem',
        }}>
          <UserAvatar src={matchedUser.avatar} name={matchedUser.name || matchedUser.username} size={40} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{matchedUser.name || matchedUser.username}</div>
            {matchedUser.location && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {matchedUser.location}</div>}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <MatchRing percentage={match?.match_percentage || 0} />
          </div>
        </div>

        {/* Skill I offer */}
        <div className="form-group">
          <label className="form-label" htmlFor="offered-skill">
            Skill I'm Offering <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>(Optional)</span>
          </label>
          <select
            id="offered-skill"
            className="form-input"
            value={offeredSkillId}
            onChange={e => setOfferedSkillId(e.target.value)}
          >
            <option value="">— Select a skill you offer —</option>
            <option value="none" style={{ fontWeight: 'bold' }}>❌ None (Just requesting to learn)</option>
            {(mySkills?.offering || []).map(s => (
              <option key={s.id} value={s.skill_id || s.id}>{s.skill?.name || s.name}</option>
            ))}
          </select>
          {(!mySkills?.offering || mySkills.offering.length === 0) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              You haven't added any skills you offer yet. You can still request to learn!
            </p>
          )}
        </div>

        {/* Skill I want */}
        <div className="form-group">
          <label className="form-label" htmlFor="wanted-skill">
            Skill I Want in Return <span style={{ color: 'var(--error, #ef4444)' }}>*</span>
          </label>
          <select
            id="wanted-skill"
            className="form-input"
            value={wantedSkillId}
            onChange={e => setWantedSkillId(e.target.value)}
            required
          >
            <option value="">— Select a skill you want —</option>
            {/* Prioritise matched overlap skills */}
            {theirOfferedSkills.length > 0 && (
              <optgroup label="✅ They offer (great match)">
                {theirOfferedSkills.map(s => (
                  <option key={s.id} value={s.skill_id || s.id}>{s.name || s.skill?.name}</option>
                ))}
              </optgroup>
            )}
            {/* All skills they offer */}
            {theirAllSkills.length > 0 && (
              <optgroup label="All skills they offer">
                {theirAllSkills
                  .filter(s => !theirOfferedSkills.find(o => (o.skill_id || o.id) === (s.skill_id || s.id)))
                  .map(s => (
                    <option key={s.id} value={s.skill_id || s.id}>{s.name || s.skill?.name}</option>
                  ))}
              </optgroup>
            )}
            {/* Fallback: user's wanted skills */}
            {(mySkills?.wanting || []).length > 0 && theirAllSkills.length === 0 && (
              <optgroup label="Skills I want">
                {mySkills.wanting.map(s => (
                  <option key={s.id} value={s.skill_id || s.id}>{s.skill?.name || s.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Personal message */}
        <div className="form-group">
          <label className="form-label" htmlFor="exchange-message">
            Message <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="exchange-message"
            className="form-input"
            rows={3}
            placeholder="Introduce yourself and explain why this exchange would be great…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={500}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
            {message.length}/500
          </div>
        </div>

      </form>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SkillMatch = () => {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const [matches,     setMatches]     = useState([]);
  const [mySkills,    setMySkills]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [sortBy,      setSortBy]      = useState('match_percentage');
  const [filterPct,   setFilterPct]   = useState(0);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchRes, skillsRes] = await Promise.all([
        aiAPI.getAIMatches(),   // Use AI-powered matching
        userAPI.getMySkills(),
      ]);
      const rawMatches = matchRes.data.matches || matchRes.data || [];
      const rawSkills = skillsRes.data?.skills || [];
      setMatches(rawMatches);
      setMySkills({
        offering: rawSkills.filter(s => s.type === 'offered'),
        wanting: rawSkills.filter(s => s.type === 'wanted'),
      });
    } catch (err) {
      // Fallback to basic matching if AI fails
      try {
        const [matchRes, skillsRes] = await Promise.all([
          userAPI.getMatches(),
          userAPI.getMySkills(),
        ]);
        const rawSkills = skillsRes.data?.skills || [];
        setMatches(matchRes.data.matches || []);
        setMySkills({
          offering: rawSkills.filter(s => s.type === 'offered'),
          wanting: rawSkills.filter(s => s.type === 'wanted'),
        });
      } catch (fallbackErr) {
        toast('Failed to load matches', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const hasSkills = mySkills && (
    (mySkills.offering?.length > 0) || (mySkills.wanting?.length > 0)
  );

  const processedMatches = [...matches]
    .filter(m => (m.match_percentage || 0) >= filterPct)
    .sort((a, b) => {
      if (sortBy === 'match_percentage') return (b.match_percentage || 0) - (a.match_percentage || 0);
      if (sortBy === 'rating')           return (b.user?.avg_rating || 0) - (a.user?.avg_rating || 0);
      if (sortBy === 'exchanges')        return (b.user?.total_exchanges || 0) - (a.user?.total_exchanges || 0);
      return 0;
    });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSendRequest = (match) => {
    setActiveMatch(match);
    setModalOpen(true);
  };

  const handleRequestSuccess = () => {
    toast('Exchange request sent successfully!', 'success');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* ── Page Header ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #5b52e0) 100%)',
          borderRadius: 16,
          padding: '2rem 2.5rem',
          color: '#fff',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#fff' }}>
            🤝 Your Skill Matches
            <span style={{ marginLeft: 10, fontSize: '0.9rem', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', verticalAlign: 'middle' }}>✨ AI-Powered</span>
          </h1>
          <p style={{ opacity: 0.88, fontSize: '0.95rem', margin: 0, maxWidth: 600, lineHeight: 1.6 }}>
            Our AI understands semantic skill relationships — React matches Frontend Development,
            Python matches Machine Learning. Match scores include experience level and user activity.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{matches.length}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Total Matches</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {matches.filter(m => (m.match_percentage || 0) >= 70).length}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Strong Matches (≥70%)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {mySkills?.offering?.length || 0}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Skills I Offer</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {mySkills?.wanting?.length || 0}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Skills I Want</div>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── No Skills Empty State ── */}
      {!loading && !hasSkills && (
        <div style={{
          textAlign: 'center', padding: '4rem 1rem',
          background: 'var(--bg-secondary)', borderRadius: 16,
          border: '2px dashed var(--border-color)',
          marginBottom: '2rem',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧩</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No skills on your profile yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 420, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            To find matches, add skills you can <strong>offer</strong> and skills you <strong>want to learn</strong> on your profile.
            Our algorithm will then find users who complement you perfectly.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/profile')}>
            ✏️ Update My Profile
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 1rem', gap: '1rem' }}>
          <LoadingSpinner />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Finding your best matches…</p>
        </div>
      )}

      {/* ── Matches found ── */}
      {!loading && hasSkills && (
        <>
          {/* Controls */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</label>
              <select
                className="form-input"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="match_percentage">Match % (Best first)</option>
                <option value="rating">Rating (Highest first)</option>
                <option value="exchanges">Most Active</option>
              </select>
            </div>

            {/* Min % filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 220 }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Min match: <strong style={{ color: 'var(--text-primary)' }}>{filterPct}%</strong>
              </label>
              <input
                type="range"
                min={0} max={90} step={10}
                value={filterPct}
                onChange={e => setFilterPct(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
            </div>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{processedMatches.length}</strong> of {matches.length} matches
            </span>
          </div>

          {/* No matches after filters */}
          {processedMatches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔭</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No matches at this threshold</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Try lowering the minimum match percentage, or add more skills to your profile.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => setFilterPct(0)}>Remove Filter</button>
                <button className="btn btn-primary" onClick={() => navigate('/profile')}>Add More Skills</button>
              </div>
            </div>
          )}

          {/* Match grid */}
          {processedMatches.length > 0 && (
            <>
              {/* Strong matches section */}
              {processedMatches.some(m => (m.match_percentage || 0) >= 70) && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🌟</span>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Strong Matches</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>≥ 70% compatibility</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.1rem' }}>
                    {processedMatches
                      .filter(m => (m.match_percentage || 0) >= 70)
                      .map(match => (
                        <MatchCard
                          key={match.user?.id || match.matchedUser?.id}
                          match={match}
                          onSendRequest={handleSendRequest}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Other matches */}
              {processedMatches.some(m => (m.match_percentage || 0) < 70) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>💡</span>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Other Potential Matches</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.1rem' }}>
                    {processedMatches
                      .filter(m => (m.match_percentage || 0) < 70)
                      .map(match => (
                        <MatchCard
                          key={match.user?.id || match.matchedUser?.id}
                          match={match}
                          onSendRequest={handleSendRequest}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Exchange Request Modal ── */}
      <ExchangeRequestModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setActiveMatch(null); }}
        match={activeMatch}
        mySkills={mySkills}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
};

export default SkillMatch;

/**
 * SkillSwap - Profile Page
 * Displays current user's profile with hero banner, skills tabs, and reviews
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { Stars, UserAvatar, timeAgo, capitalize } from '../components/common/Utils';
import { userAPI, reviewAPI, skillsAPI } from '../services/api';
import { SkillAutocomplete } from '../components/ai/SkillAutocomplete';
import { LearningPath } from '../components/ai/LearningPath';

// ─── Experience level badge colours ──────────────────────────────────────────
const LEVEL_BADGE = {
  beginner: 'badge badge-green',
  intermediate: 'badge badge-yellow',
  expert: 'badge badge-purple',
};

const LEVEL_EMOJI = { beginner: '🌱', intermediate: '🌿', expert: '🌳' };

// ─── Helper: format date nicely ──────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Sub-component: single review card ───────────────────────────────────────
const ReviewCard = ({ review, isOwn, onEdit }) => {
  const name = review.reviewer_name || review.reviewer?.name || 'Anonymous';
  const avatar = review.reviewer_avatar || review.reviewer?.avatar;
  const dateStr = review.created_at || review.createdAt;

  return (
    <div className="card card-sm" style={{ marginBottom: 12, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <UserAvatar src={avatar} name={name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {name}
              {isOwn && (
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>· You</span>
              )}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dateStr && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(dateStr)}</span>
              )}
              {isOwn && onEdit && (
                <button
                  onClick={onEdit}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontSize: 12, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--primary-50)',
                  }}
                  title="Edit your review"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
          </div>
          <Stars rating={review.rating} size={13} />
        </div>
      </div>
      {review.comment && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          "{review.comment}"
        </p>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { id: profileId } = useParams(); // present when visiting /profile/:id

  // Are we viewing someone else's profile?
  const myId = user?._id || user?.id;
  const isOwnProfile = !profileId || String(profileId) === String(myId);

  // Viewed user (other person's data when not own profile)
  const [viewedUser, setViewedUser] = useState(null);

  // Data state
  const [mySkills, setMySkills]     = useState({ offered: [], wanted: [] });
  const [reviews, setReviews]       = useState([]);

  // UI state
  const [activeTab, setActiveTab]   = useState('offered');
  const [loading, setLoading]       = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Modal state (own profile only)
  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [addType, setAddType]             = useState('offered');
  const [skillSearch, setSkillSearch]     = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [addingSkillId, setAddingSkillId] = useState(null);
  const [removingSkillId, setRemovingSkillId] = useState(null);

  // Learning path state
  const [learningPath, setLearningPath]     = useState(null);
  const [showLearningPath, setShowLearningPath] = useState(false);

  // Review modal state (for other user's profile)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating]       = useState(5);
  const [reviewHover, setReviewHover]         = useState(0);  // hover state for stars
  const [reviewComment, setReviewComment]     = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReview, setExistingReview]   = useState(null); // already submitted review

  // ── Fetch other user's profile ───────────────────────────────────────────
  const fetchOtherUser = useCallback(async () => {
    if (isOwnProfile) return;
    setLoading(true);
    try {
      const res = await userAPI.getById(profileId);
      const data = res.data?.user || res.data;
      setViewedUser(data);
      // Build skills from their profile
      const skills = data?.skills || [];
      const offered = skills.filter(s => s.type === 'offered' || s.skill_type === 'offered');
      const wanted  = skills.filter(s => s.type === 'wanted'  || s.skill_type === 'wanted');
      setMySkills({ offered, wanted });
      // Fetch their reviews
      setReviewsLoading(true);
      try {
        const rRes = await reviewAPI.getUserReviews(profileId);
        setReviews(rRes.data?.reviews || rRes.data || []);
      } catch { /* ignore */ } finally { setReviewsLoading(false); }
      // Check if I already reviewed this person
      try {
        const myRev = await reviewAPI.getMyReviewFor(profileId);
        if (myRev.data?.review) {
          setExistingReview(myRev.data.review);
          setReviewRating(myRev.data.review.rating);
          setReviewComment(myRev.data.review.comment || '');
        }
      } catch { /* ignore */ }
    } catch {
      toast('Failed to load user profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [profileId, isOwnProfile, toast]);

  // ── Fetch own skills ─────────────────────────────────────────────────────
  const fetchMySkills = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const res = await userAPI.getMySkills();
      const data = res.data?.skills || res.data || [];
      const offered = data.filter(s => s.type === 'offered' || s.skill_type === 'offered');
      const wanted  = data.filter(s => s.type === 'wanted'  || s.skill_type === 'wanted');
      setMySkills({ offered, wanted });
    } catch {
      toast('Failed to load skills', 'error');
    }
  }, [toast, isOwnProfile]);

  // ── Fetch own reviews ────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!isOwnProfile || (!user?.id && !user?._id)) return;
    setReviewsLoading(true);
    try {
      const userId = user._id || user.id;
      const res = await reviewAPI.getUserReviews(userId);
      setReviews(res.data?.reviews || res.data || []);
    } catch {
      /* ignore */
    } finally {
      setReviewsLoading(false);
    }
  }, [user, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile) {
      const init = async () => {
        setLoading(true);
        await fetchMySkills();
        setLoading(false);
      };
      init();
      fetchReviews();
    } else {
      fetchOtherUser();
    }
  }, [profileId]); // eslint-disable-line

  // ── Message other user ───────────────────────────────────────────────────
  const handleSendMessage = () => {
    window.location.href = `/chat?userId=${profileId}`;
  };

  // ── Submit / update review ───────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!reviewRating) return;
    setReviewSubmitting(true);
    try {
      if (existingReview) {
        // UPDATE existing review
        await reviewAPI.update(existingReview.id, { rating: reviewRating, comment: reviewComment });
        toast('Review updated! ⭐', 'success');
        setExistingReview({ ...existingReview, rating: reviewRating, comment: reviewComment });
      } else {
        // CREATE new review
        await reviewAPI.createDirect({ reviewee_id: profileId, rating: reviewRating, comment: reviewComment });
        toast('Review submitted! ⭐', 'success');
        // Mark as existing now
        const myRev = await reviewAPI.getMyReviewFor(profileId);
        setExistingReview(myRev.data?.review || null);
      }
      setReviewModalOpen(false);
      // Refresh reviews list
      const rRes = await reviewAPI.getUserReviews(profileId);
      setReviews(rRes.data?.reviews || rRes.data || []);
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };


  // ── Add skill ──────────────────────────────────────────────────────────────────────────
  const handleAddSkill = async (skill) => {
    setAddingSkillId(skill._id || skill.id || 'new');
    try {
      let skillId = skill._id || skill.id;

      // If no ID, resolve via find-or-create on the backend
      if (!skillId) {
        const createRes = await skillsAPI.create({
          name: skill.name.trim(),
          category: skill.category || 'Technology',
          description: '',
        });
        skillId = createRes.data?.skill?.id || createRes.data?.id;
        if (!skillId) {
          toast('Could not resolve skill. Please try again.', 'error');
          return;
        }
      }

      await userAPI.addSkill({ skill_id: skillId, type: addType });
      await fetchMySkills();
      toast(`"${skill.name}" added to ${addType} skills ✅`, 'success');
      setAddModalOpen(false);
      setSkillSearch('');
      setSelectedSkill(null);
      setLearningPath({ skillName: skill.name, skillId });
      setShowLearningPath(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add skill';
      if (msg.toLowerCase().includes('already')) {
        toast(`"${skill.name}" is already in your ${addType} skills.`, 'warning');
        setAddModalOpen(false);
        setSkillSearch('');
        setSelectedSkill(null);
      } else {
        toast(msg, 'error');
      }
    } finally {
      setAddingSkillId(null);
    }
  };

  // ── Remove skill ─────────────────────────────────────────────────────────
  const handleRemoveSkill = async (userSkillId, skillName) => {
    if (!window.confirm(`Remove "${skillName}" from your skills?`)) return;
    setRemovingSkillId(userSkillId);
    try {
      await userAPI.removeSkill(userSkillId);
      await fetchMySkills();
      toast(`"${skillName}" removed`, 'info');
    } catch {
      toast('Failed to remove skill', 'error');
    } finally {
      setRemovingSkillId(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const currentSkills  = activeTab === 'offered' ? mySkills.offered : mySkills.wanted;
  const addedSkillIds  = new Set([
    ...mySkills.offered.map(s => s.skill_id || s.skill?._id || s.skill?.id),
    ...mySkills.wanted.map(s => s.skill_id  || s.skill?._id || s.skill?.id),
  ]);



  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  // Which user to display
  const displayUser = isOwnProfile ? user : (viewedUser || user);

  if (loading && !displayUser) return <LoadingSpinner fullPage />;
  if (!displayUser) return <LoadingSpinner fullPage />;

  return (
    <div className="page-content">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="profile-hero">
        {/* Decorative blob is handled by CSS ::before */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

          {/* Avatar */}
          <div className="profile-avatar-wrapper">
            <UserAvatar
              src={displayUser.avatar || displayUser.profile_picture}
              name={displayUser.name}
              size={100}
              className="avatar"
              style={{ border: '4px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            />
            {isOwnProfile && (
              <Link
                to="/edit-profile"
                className="profile-avatar-edit"
                title="Edit profile picture"
              >
                ✏️
              </Link>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0 }}>
                {displayUser.name}
              </h1>
              {displayUser.experience_level && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '3px 12px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {LEVEL_EMOJI[displayUser.experience_level]} {capitalize(displayUser.experience_level)}
                </span>
              )}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '0 0 8px' }}>
              ✉️ {displayUser.email}
            </p>

            {displayUser.location && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '0 0 10px' }}>
                📍 {displayUser.location}
              </p>
            )}

            {displayUser.bio && (
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px', maxWidth: 520 }}>
                {displayUser.bio}
              </p>
            )}

            {/* Rating */}
            {avgRating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stars rating={parseFloat(avgRating)} size={15} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{avgRating}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Edit Profile Button — own profile only */}
          {isOwnProfile && (
            <div style={{ flexShrink: 0 }}>
              <Link
                to="/edit-profile"
                className="btn"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                ✏️ Edit Profile
              </Link>
            </div>
          )}

          {/* Action buttons for OTHER user's profile */}
          {!isOwnProfile && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onClick={handleSendMessage}
              >
                💬 Send Message
              </button>
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setReviewModalOpen(true)}
              >
                {existingReview ? '✏️ Edit Review' : '⭐ Write Review'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Skills Section ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">{isOwnProfile ? 'My Skills' : `${displayUser.name}'s Skills`}</h2>
            <p className="card-subtitle">{isOwnProfile ? 'Manage what you can teach and what you want to learn' : 'Skills they offer and want to learn'}</p>
          </div>
          {isOwnProfile && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setAddType(activeTab);
                setSkillSearch('');
                setAddModalOpen(true);
              }}
            >
              ＋ Add Skill
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'offered' ? 'active' : ''}`}
            onClick={() => setActiveTab('offered')}
          >
            🎓 Skills Offered
            {mySkills.offered.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--primary-100)',
                  color: 'var(--primary)',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 99,
                }}
              >
                {mySkills.offered.length}
              </span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'wanted' ? 'active' : ''}`}
            onClick={() => setActiveTab('wanted')}
          >
            🌱 Skills Wanted
            {mySkills.wanted.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#EDE9FE',
                  color: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 99,
                }}
              >
                {mySkills.wanted.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <LoadingSpinner />
          </div>
        ) : currentSkills.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <div className="empty-state-icon">{activeTab === 'offered' ? '🎓' : '🌱'}</div>
            <p className="empty-state-title">No {activeTab} skills yet</p>
            <p className="empty-state-text">
              {activeTab === 'offered'
                ? 'Add skills you can teach others'
                : 'Add skills you want to learn'}
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setAddType(activeTab); setSkillSearch(''); setAddModalOpen(true); }}
            >
              ＋ Add {activeTab === 'offered' ? 'Offered' : 'Wanted'} Skill
            </button>
          </div>
        ) : (
          <div className="skills-tags" style={{ gap: 10 }}>
            {currentSkills.map((userSkill) => {
              const skillId  = userSkill._id || userSkill.id;
              const skillName = userSkill.skill?.name || userSkill.name || 'Unnamed';
              const isRemoving = removingSkillId === skillId;
              return (
                <div
                  key={skillId}
                  className={`skill-tag ${activeTab === 'offered' ? 'skill-tag-offered' : 'skill-tag-wanted'}`}
                  style={{ fontSize: 13, padding: '6px 12px', gap: 8, alignItems: 'center' }}
                >
                  <span>{skillName}</span>
                  <button
                    onClick={() => handleRemoveSkill(skillId, skillName)}
                    disabled={isRemoving}
                    title="Remove skill"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isRemoving ? 'not-allowed' : 'pointer',
                      color: 'currentColor',
                      opacity: isRemoving ? 0.4 : 0.7,
                      fontSize: 15,
                      lineHeight: 1,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={`Remove ${skillName}`}
                  >
                    {isRemoving ? '⟳' : '×'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AI Learning Path (shown after adding a skill) ──────────────── */}
      {showLearningPath && learningPath && (
        <LearningPath
          skillName={learningPath.skillName}
          skillId={learningPath.skillId}
          onAddSkill={(item) => {
            handleAddSkill({ id: item.id || null, _id: null, name: item.name, category: item.category });
          }}
          onClose={() => setShowLearningPath(false)}
        />
      )}

      {/* ── Reviews Section ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Reviews</h2>
            <p className="card-subtitle">
              {reviews.length
                ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''} from the community`
                : 'No reviews yet'}
            </p>
          </div>
          {avgRating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {avgRating}
              </span>
              <Stars rating={parseFloat(avgRating)} size={16} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>avg rating</span>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <LoadingSpinner />
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <div className="empty-state-icon">⭐</div>
            <p className="empty-state-title">No reviews yet</p>
            <p className="empty-state-text">Complete skill exchanges to receive reviews from peers</p>
          </div>
        ) : (
          <div>
            {reviews.map((review) => (
              <ReviewCard
                key={review._id || review.id}
                review={review}
                isOwn={String(review.reviewer_id) === String(myId)}
                onEdit={() => setReviewModalOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add Skill Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={`Add ${addType === 'offered' ? '🎓 Offered' : '🌱 Wanted'} Skill`}
        size="md"
      >
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['offered', 'wanted'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${addType === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAddType(t)}
              style={{ flex: 1 }}
            >
              {t === 'offered' ? '🎓 Offered' : '🌱 Wanted'}
            </button>
          ))}
        </div>

        {/* Search — AI Autocomplete */}
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label className="form-label">
            Search Skills <span className="ai-label" style={{ marginLeft: 6 }}>AI</span>
          </label>
          <SkillAutocomplete
            value={skillSearch}
            onChange={(val) => {
              setSkillSearch(val);
              setSelectedSkill(null);
            }}
            onSelect={(skill) => {
              setSkillSearch(skill.name);
              setSelectedSkill(skill);
            }}
            placeholder="Type to search (e.g. React, Guitar, Spanish...)"
          />
        </div>

        {/* Selected skill preview + Add button */}
        {selectedSkill && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'var(--primary-50)',
            border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius)', marginBottom: 12,
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{selectedSkill.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                {selectedSkill.category} {selectedSkill.source === 'ai' ? '· ✨ AI suggestion' : '· In database'}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleAddSkill(selectedSkill)}
              disabled={!!addingSkillId}
            >
              {addingSkillId ? '⏳ Adding...' : '＋ Add'}
            </button>
          </div>
        )}

        {/* Manual add: show when user typed something but didn't pick from dropdown */}
        {skillSearch.trim().length >= 2 && !selectedSkill && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            border: '1.5px dashed var(--border)',
            borderRadius: 'var(--radius)', marginBottom: 12,
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: 'var(--text-primary)' }}>
                ＋ Add "<strong>{skillSearch.trim()}</strong>"
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Manually add this skill to your profile
              </p>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleAddSkill({ name: skillSearch.trim(), id: null, _id: null })}
              disabled={!!addingSkillId}
            >
              {addingSkillId ? '⏳' : '＋ Add'}
            </button>
          </div>
        )}

      </Modal>

      {/* ── Write Review Modal ─────────────────────────────────────────── */}
      {!isOwnProfile && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={existingReview
            ? `Edit Your Review for ${displayUser?.name}`
            : `Write a Review for ${displayUser?.name}`}
          size="small"
        >
          <div style={{ padding: '4px 0' }}>
            {/* Interactive Star Selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
                Your Rating
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const active = star <= (reviewHover || reviewRating);
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(star)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                        fontSize: 36,
                        opacity: active ? 1 : 0.25,
                        transform: active ? 'scale(1.15)' : 'scale(0.95)',
                        transition: 'all 0.12s ease',
                        filter: active ? 'drop-shadow(0 0 6px #f59e0b88)' : 'none',
                      }}
                    >
                      ⭐
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', margin: '8px 0 0' }}>
                {['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Very Good', '🤩 Excellent!'][reviewHover || reviewRating]}
              </p>
            </div>

            {/* Comment */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Comment (optional)</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder={`Share your experience with ${displayUser?.name}...`}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                style={{ resize: 'vertical', minHeight: 90 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setReviewModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || !reviewRating}
              >
                {reviewSubmitting
                  ? '⏳ Saving…'
                  : existingReview ? '✏️ Update Review' : '⭐ Submit Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/**
 * SkillSwap - Skill Search Page
 * Browse, filter and search all skills on the platform
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skillsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { UserAvatar, Stars } from '../components/common/Utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '', label: 'All Categories', icon: '🌐' },
  { value: 'Technology',    label: 'Technology',      icon: '💻' },
  { value: 'Music',         label: 'Music',           icon: '🎵' },
  { value: 'Language',      label: 'Language',        icon: '🗣️' },
  { value: 'Design',        label: 'Design',          icon: '🎨' },
  { value: 'Arts',          label: 'Arts & Crafts',   icon: '✏️' },
  { value: 'Health',        label: 'Health & Fitness',icon: '💪' },
  { value: 'Lifestyle',     label: 'Lifestyle',       icon: '🌿' },
  { value: 'Business',      label: 'Business',        icon: '📈' },
  { value: 'Cooking',       label: 'Cooking',         icon: '🍳' },
  { value: 'Sports',        label: 'Sports',          icon: '⚽' },
  { value: 'Education',     label: 'Education',       icon: '📚' },
  { value: 'Other',         label: 'Other',           icon: '✨' },
];

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular'  },
  { value: 'newest',     label: 'Newest First'  },
  { value: 'offering',   label: 'Most Offered'  },
  { value: 'wanting',    label: 'Most Wanted'   },
  { value: 'name',       label: 'A – Z'         },
];

const CATEGORY_COLORS = {
  Technology: '#3b82f6',
  Music:      '#a855f7',
  Language:   '#f59e0b',
  Design:     '#ec4899',
  Arts:       '#ef4444',
  Health:     '#10b981',
  Lifestyle:  '#84cc16',
  Business:   '#0ea5e9',
  Cooking:    '#f97316',
  Sports:     '#14b8a6',
  Education:  '#6366f1',
  Other:      '#6b7280',
};

const ITEMS_PER_PAGE = 12;

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Category badge pill */
const CategoryBadge = ({ category }) => {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const cat = CATEGORIES.find(c => c.value === category);
  return (
    <span
      className="skill-tag"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        fontWeight: 600,
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
      }}
    >
      {cat ? `${cat.icon} ${cat.label}` : category}
    </span>
  );
};

/** Horizontal popularity bar */
const PopularityBar = ({ value = 0, max = 100, label }) => {
  const pct = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  return (
    <div style={{ marginBottom: 6 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>
        </div>
      )}
      <div style={{ height: 6, borderRadius: 999, background: 'var(--border-color)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: 'linear-gradient(90deg, var(--primary), var(--primary-dark, #6c63ff))',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};

/** Individual skill card */
const SkillCard = ({ skill, maxPop, onClick }) => {
  const popularity = (skill.offering_count || 0) + (skill.wanting_count || 0);
  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        transition: 'transform 0.18s, box-shadow 0.18s',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={() => onClick(skill)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${CATEGORY_COLORS[skill.category] || 'var(--primary)'}, ${CATEGORY_COLORS[skill.category] || 'var(--primary)'}80)`,
        }}
      />

      <div style={{ padding: '1.1rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, flex: 1 }}>
            {skill.name}
          </h3>
          <CategoryBadge category={skill.category} />
        </div>

        {/* Description */}
        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          margin: 0,
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}>
          {skill.description || 'No description provided.'}
        </p>

        {/* Popularity bar */}
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
          <PopularityBar value={popularity} max={maxPop || 10} label="Popularity" />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            className="skill-tag"
            style={{ background: '#10b98114', color: '#10b981', border: '1px solid #10b98130', fontSize: '0.73rem' }}
          >
            ✅ {skill.offering_count || 0} offering
          </div>
          <div
            className="skill-tag"
            style={{ background: '#f59e0b14', color: '#f59e0b', border: '1px solid #f59e0b30', fontSize: '0.73rem' }}
          >
            🔍 {skill.wanting_count || 0} wanting
          </div>
          {skill.avg_rating > 0 && (
            <div
              className="skill-tag"
              style={{ background: '#6366f114', color: '#6366f1', border: '1px solid #6366f130', fontSize: '0.73rem' }}
            >
              ⭐ {Number(skill.avg_rating).toFixed(1)}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          className="btn btn-outline"
          style={{ marginTop: '0.25rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem', width: '100%' }}
          onClick={e => { e.stopPropagation(); onClick(skill); }}
        >
          View Users →
        </button>
      </div>
    </div>
  );
};

/** Skill detail modal showing users offering/wanting the skill */
const SkillDetailModal = ({ skill, onClose }) => {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!skill) return;
    setLoading(true);
    skillsAPI.getById(skill.id)
      .then(res => setUsers(res.data.users || res.data.skill?.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [skill]);

  if (!skill) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{skill.name}</h3>
            <CategoryBadge category={skill.category} />
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {skill.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              {skill.description}
            </p>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🙈</div>
              <p>No users found for this skill yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 380, overflowY: 'auto' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  className="card"
                  style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
                  onClick={() => { navigate(`/profile/${u.id}`); onClose(); }}
                >
                  <UserAvatar src={u.avatar} name={u.name || u.username} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {u.name || u.username}
                    </div>
                    {u.location && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {u.location}</div>
                    )}
                    <Stars rating={u.avg_rating || 0} size={12} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {u.skill_type === 'offered' ? (
                      <span className="skill-tag" style={{ background: '#10b98114', color: '#10b981', border: '1px solid #10b98130', fontSize: '0.7rem' }}>
                        ✅ Offering
                      </span>
                    ) : (
                      <span className="skill-tag" style={{ background: '#f59e0b14', color: '#f59e0b', border: '1px solid #f59e0b30', fontSize: '0.7rem' }}>
                        🔍 Wanting
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SkillSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [skills,       setSkills]       = useState([]);
  const [popularSkills,setPopularSkills]= useState([]);
  const [loading,      setLoading]      = useState(true);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);
  const [selectedSkill,setSelectedSkill]= useState(null);
  const [maxPop,       setMaxPop]       = useState(1);

  // Filters (read from URL params so they survive refresh)
  const [search,       setSearch]       = useState(searchParams.get('q') || '');
  const [category,     setCategory]     = useState(searchParams.get('category') || '');
  const [sortBy,       setSortBy]       = useState(searchParams.get('sort') || 'popular');
  const [currentPage,  setCurrentPage]  = useState(Number(searchParams.get('page')) || 1);

  // Debounce ref
  const searchTimer = useRef(null);

  // ── Fetch skills ────────────────────────────────────────────────────────────
  const fetchSkills = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sort: sortBy,
        ...(search   && { search }),
        ...(category && { category }),
        ...params,
      };
      const res = await skillsAPI.getAll(queryParams);
      const data = res.data;
      const list = data.skills || data.data || [];
      setSkills(list);
      setTotalPages(data.totalPages || data.pages || Math.ceil((data.total || list.length) / ITEMS_PER_PAGE) || 1);
      setTotalCount(data.total || list.length);
      // compute max popularity for bar scaling
      const maxVal = list.reduce((m, s) => {
        const pop = (s.offering_count || 0) + (s.wanting_count || 0);
        return pop > m ? pop : m;
      }, 1);
      setMaxPop(maxVal);
    } catch (err) {
      console.error('fetchSkills error', err);
      toast('Failed to load skills', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, category, sortBy, toast]);

  // ── Fetch popular skills (sidebar / initial highlight) ──────────────────────
  const fetchPopular = useCallback(async () => {
    try {
      const res = await skillsAPI.getPopular();
      setPopularSkills(res.data.skills || res.data || []);
    } catch {
      // non-critical
    }
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  useEffect(() => {
    fetchSkills();
    // sync URL params
    const params = {};
    if (search)          params.q        = search;
    if (category)        params.category = category;
    if (sortBy !== 'popular') params.sort = sortBy;
    if (currentPage > 1) params.page     = currentPage;
    setSearchParams(params, { replace: true });
  }, [fetchSkills, currentPage]); // eslint-disable-line

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      fetchSkills({ search: val, page: 1 });
    }, 400);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setCurrentPage(1);
    fetchSkills({ category: cat, page: 1 });
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    setCurrentPage(1);
    fetchSkills({ sort: val, page: 1 });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setSortBy('popular');
    setCurrentPage(1);
    fetchSkills({ search: '', category: '', sort: 'popular', page: 1 });
    setSearchParams({}, { replace: true });
  };

  const hasFilters = search || category || sortBy !== 'popular';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          🔍 Explore Skills
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.92rem' }}>
          Discover skills offered and wanted by the SkillSwap community
        </p>
      </div>

      {/* ── Popular Skill Pills (quick filter) ── */}
      {popularSkills.length > 0 && !search && !category && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            🔥 Trending Skills
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {popularSkills.slice(0, 10).map(s => (
              <button
                key={s.id}
                className="skill-tag"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  transition: 'all 0.15s',
                }}
                onClick={() => {
                  setSearch(s.name);
                  setCurrentPage(1);
                  fetchSkills({ search: s.name, page: 1 });
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Search Bar + Sort ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{
            position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', color: 'var(--text-muted)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search skills by name…"
            value={search}
            onChange={handleSearchChange}
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setCurrentPage(1); fetchSkills({ search: '', page: 1 }); }}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem',
              }}
            >×</button>
          )}
        </div>

        {/* Sort */}
        <select className="form-input" value={sortBy} onChange={handleSortChange} style={{ minWidth: 155, width: 'auto' }}>
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button className="btn btn-outline" onClick={handleClearFilters} style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Category Filter Buttons ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {CATEGORIES.map(cat => {
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              style={{
                padding: '0.38rem 0.85rem',
                borderRadius: 999,
                border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: active ? 'var(--primary)' : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Results Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          {loading ? 'Loading…' : `${totalCount} skill${totalCount !== 1 ? 's' : ''} found`}
          {category && (
            <> in <strong style={{ color: 'var(--text-primary)' }}>
              {CATEGORIES.find(c => c.value === category)?.label}
            </strong></>
          )}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* ── Loading / Empty / Grid ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1rem', gap: '1rem' }}>
          <LoadingSpinner />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Finding skills…</p>
        </div>
      ) : skills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🫤</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No skills found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {search
              ? `No results for "${search}". Try a different keyword.`
              : 'No skills match your current filters.'}
          </p>
          <button className="btn btn-outline" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="responsive-grid-search" style={{ marginBottom: '2rem' }}>
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              maxPop={maxPop}
              onClick={setSelectedSkill}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* ── Skill Detail Modal ── */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
};

export default SkillSearch;

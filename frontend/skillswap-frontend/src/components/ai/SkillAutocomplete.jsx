/**
 * SkillSwap AI - SkillAutocomplete Component
 * Smart skill input with real-time AI-powered suggestions.
 * Features: debounced search, keyboard navigation, loading states, category badges.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAPI } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Simulated API call (replace with your actual API endpoint)
async function fetchSuggestions(query) {
  try {
    const res = await aiAPI.autocomplete(query, 8);
    return res.data.suggestions || [];
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
}

// Category colors map
const CATEGORY_COLORS = {
  Technology: '#3B82F6',
  Design: '#8B5CF6',
  Music: '#F59E0B',
  Language: '#10B981',
  Arts: '#EC4899',
  'Health & Fitness': '#EF4444',
  Lifestyle: '#F97316',
  Business: '#6366F1',
};

/**
 * SkillAutocomplete — Drop-in replacement for a skill text input.
 * @param {Object} props
 * @param {string} props.value - Controlled input value
 * @param {Function} props.onChange - Called on text change (string)
 * @param {Function} props.onSelect - Called when a suggestion is selected (skill object)
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export function SkillAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search skills (e.g. React, Guitar, Spanish...)',
  className = '',
  disabled = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced fetch
  const fetchDebounced = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(q);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    fetchDebounced(value || '');
    return () => clearTimeout(debounceRef.current);
  }, [value, fetchDebounced]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSelect = (skill) => {
    onSelect?.(skill);
    setOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const color = (category) => CATEGORY_COLORS[category] || '#6B7280';

  return (
    <div className="skill-autocomplete-wrapper" style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div className="skill-autocomplete-input-wrap" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          className={`form-input skill-autocomplete-input ${className}`}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {/* Loading spinner */}
        {loading && (
          <span className="skill-autocomplete-spinner">
            <ButtonSpinnerSmall />
          </span>
        )}
        {/* AI badge */}
        <span className="skill-autocomplete-badge ai-badge" title="AI-powered suggestions">
          ✨ AI
        </span>
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div ref={dropdownRef} className="skill-autocomplete-dropdown" style={{ maxHeight: 380, overflowY: 'auto', zIndex: 9999 }}>
          {suggestions.map((skill, idx) => (
            <div
              key={`${skill.name}-${idx}`}
              className={`skill-autocomplete-item ${activeIndex === idx ? 'active' : ''}`}
              onMouseDown={() => handleSelect(skill)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className="skill-autocomplete-item-main">
                <span className="skill-autocomplete-name">{skill.name}</span>
                {skill.source === 'ai' && (
                  <span className="skill-autocomplete-ai-tag">✨ AI</span>
                )}
              </div>
              <div className="skill-autocomplete-meta">
                <span
                  className="skill-autocomplete-category"
                  style={{ backgroundColor: `${color(skill.category)}22`, color: color(skill.category) }}
                >
                  {skill.category}
                </span>
                {skill.popularity > 0 && (
                  <span className="skill-autocomplete-popularity">
                    🔥 {skill.popularity}
                  </span>
                )}
                {skill.description && (
                  <span className="skill-autocomplete-desc">
                    {skill.description.slice(0, 50)}{skill.description.length > 50 ? '…' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="skill-autocomplete-footer">
            ✨ AI-powered suggestions
          </div>
        </div>
      )}
    </div>
  );
}

function ButtonSpinnerSmall() {
  return (
    <span style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      border: '2px solid var(--primary)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

export default SkillAutocomplete;

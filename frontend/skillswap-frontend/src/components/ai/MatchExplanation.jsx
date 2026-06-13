/**
 * SkillSwap AI - MatchExplanation Component
 * Renders the AI-generated match reasons and skill compatibility chips.
 */

/**
 * MatchExplanation — Shows why two users are a good match.
 * @param {Object} props
 * @param {string[]} props.reasons - Array of match reason strings
 * @param {Array} [props.skillMatches] - Array of {direction, mySkill, theirSkill, similarity}
 * @param {number} props.matchPercentage - 0-100
 */
export function MatchExplanation({ reasons = [], skillMatches = [], matchPercentage = 0 }) {
  if (reasons.length === 0 && skillMatches.length === 0) return null;

  const getScoreColor = (pct) => {
    if (pct >= 80) return '#10B981'; // green
    if (pct >= 60) return '#3B82F6'; // blue
    if (pct >= 40) return '#F59E0B'; // amber
    return '#6B7280';               // gray
  };

  const color = getScoreColor(matchPercentage);

  return (
    <div className="match-explanation">
      {/* Score badge */}
      {matchPercentage > 0 && (
        <div className="match-score-badge" style={{ borderColor: color, color }}>
          <span className="match-score-num">{matchPercentage}%</span>
          <span className="match-score-label">AI Match</span>
        </div>
      )}

      {/* Reason chips */}
      {reasons.length > 0 && (
        <div className="match-reasons">
          {reasons.map((reason, i) => (
            <span key={i} className="match-reason-chip">
              ✓ {reason}
            </span>
          ))}
        </div>
      )}

      {/* Skill compatibility list */}
      {skillMatches.length > 0 && (
        <div className="match-skill-pairs">
          {skillMatches.slice(0, 3).map((match, i) => (
            <div key={i} className="match-skill-pair">
              <span className="match-skill-mine">{match.mySkill}</span>
              <span className="match-arrow">
                {match.direction.includes('I offer') ? '→' : '←'}
              </span>
              <span className="match-skill-theirs">{match.theirSkill}</span>
              {match.similarity < 1.0 && match.similarity > 0.7 && (
                <span className="match-semantic-tag" title="AI semantic match">≈ similar</span>
              )}
            </div>
          ))}
        </div>
      )}

      <span className="match-ai-tag">✨ AI-powered</span>
    </div>
  );
}

export default MatchExplanation;

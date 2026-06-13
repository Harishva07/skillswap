/**
 * SkillSwap AI - AI Controller
 * Handles all AI-powered API endpoints.
 * Routes: /api/ai/*
 */

const db = require('../config/db');
const {
  getSkillSuggestions,
  computeAIMatchScore,
  getAILearningPath,
  refreshAllEmbeddings,
} = require('../services/aiService');
const { suggestCategory } = require('../services/skillGraphService');

/**
 * GET /api/ai/skills/autocomplete?q=Rea&limit=8
 */
const getAutocomplete = async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }
    const suggestions = await getSkillSuggestions(q.trim(), parseInt(limit));
    res.json({ success: true, query: q.trim(), suggestions, count: suggestions.length });
  } catch (error) {
    console.error('AI Autocomplete error:', error);
    res.status(500).json({ success: false, message: 'Failed to get suggestions.' });
  }
};

/**
 * GET /api/ai/matches?page=1&limit=12
 */
const getAIMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [[currentUser]] = await db.execute(
      `SELECT id, experience_level FROM users WHERE id = ?`, [userId]
    );

    const [mySkillRows] = await db.execute(
      `SELECT us.type, us.proficiency, s.id as skill_id, s.name, s.category
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?`,
      [userId]
    );

    if (mySkillRows.length === 0) {
      return res.json({
        success: true, matches: [],
        message: 'Add skills to your profile to get AI-powered matches!',
        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 },
      });
    }

    const mySkills = {
      offered: mySkillRows.filter(s => s.type === 'offered'),
      wanted: mySkillRows.filter(s => s.type === 'wanted'),
      experience_level: currentUser.experience_level,
    };

    if (mySkills.offered.length === 0 || mySkills.wanted.length === 0) {
      return res.json({
        success: true, matches: [],
        message: 'Add both skills you offer and skills you want to see AI matches!',
        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 },
      });
    }

    const [candidates] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.bio, u.location, u.profile_picture,
              u.experience_level, u.rating, u.total_reviews, u.total_exchanges
       FROM users u
       JOIN user_skills us ON u.id = us.user_id
       WHERE u.id != ? AND u.is_blocked = 0
       ORDER BY u.rating DESC, u.total_exchanges DESC
       LIMIT 100`,
      [userId]
    );

    const scoredMatches = [];
    for (const candidate of candidates) {
      const [theirSkillRows] = await db.execute(
        `SELECT us.type, us.proficiency, s.id as skill_id, s.name, s.category
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = ?`,
        [candidate.id]
      );
      const theirSkills = {
        offered: theirSkillRows.filter(s => s.type === 'offered'),
        wanted: theirSkillRows.filter(s => s.type === 'wanted'),
      };
      if (theirSkills.offered.length === 0 || theirSkills.wanted.length === 0) continue;

      const { score, reasons, skillMatches } = await computeAIMatchScore(mySkills, theirSkills, candidate);
      if (score > 0) {
        scoredMatches.push({
          ...candidate,
          match_percentage: score,
          match_reasons: reasons,
          skill_matches: skillMatches,
          skills_offered: theirSkills.offered,
          skills_wanted: theirSkills.wanted,
        });
      }
    }

    scoredMatches.sort((a, b) => b.match_percentage - a.match_percentage);
    const total = scoredMatches.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedMatches = scoredMatches.slice(start, start + limitNum);

    if (pageNum === 1 && paginatedMatches.length > 0) {
      await cacheRecommendations(userId, paginatedMatches.slice(0, 5));
    }

    res.json({
      success: true,
      matches: paginatedMatches,
      ai_powered: true,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('AI Matches error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute AI matches.' });
  }
};

async function cacheRecommendations(userId, topMatches) {
  try {
    await db.execute('DELETE FROM user_recommendations WHERE user_id = ?', [userId]);
    for (const match of topMatches) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.execute(
        `INSERT INTO user_recommendations (user_id, recommended_user_id, match_score, match_reasons, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE match_score = ?, match_reasons = ?, expires_at = ?`,
        [userId, match.id, match.match_percentage, JSON.stringify(match.match_reasons), expiresAt,
         match.match_percentage, JSON.stringify(match.match_reasons), expiresAt]
      );
    }
  } catch (e) {
    console.error('Cache recommendations error:', e.message);
  }
}

/**
 * GET /api/ai/recommendations
 */
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    const [cached] = await db.execute(
      `SELECT ur.match_score, ur.match_reasons,
              u.id, u.name, u.bio, u.location, u.profile_picture,
              u.experience_level, u.rating, u.total_reviews, u.total_exchanges
       FROM user_recommendations ur
       JOIN users u ON ur.recommended_user_id = u.id
       WHERE ur.user_id = ? AND ur.expires_at > NOW() AND u.is_blocked = 0
       ORDER BY ur.match_score DESC
       LIMIT 5`,
      [userId]
    );

    if (cached.length > 0) {
      for (const rec of cached) {
        const [skills] = await db.execute(
          `SELECT s.name, s.category, us.type FROM user_skills us
           JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ? LIMIT 6`, [rec.id]
        );
        rec.skills = skills;
        rec.match_reasons = typeof rec.match_reasons === 'string'
          ? JSON.parse(rec.match_reasons) : rec.match_reasons;
      }
      return res.json({ success: true, recommendations: cached, from_cache: true });
    }

    const [mySkillRows] = await db.execute(
      `SELECT us.type, s.id as skill_id, s.name FROM user_skills us
       JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?`, [userId]
    );

    if (mySkillRows.length === 0) {
      return res.json({ success: true, recommendations: [], message: 'Add skills to your profile to get personalized recommendations!' });
    }

    const myOfferedIds = mySkillRows.filter(s => s.type === 'offered').map(s => s.skill_id);
    const myWantedIds = mySkillRows.filter(s => s.type === 'wanted').map(s => s.skill_id);

    if (myOfferedIds.length === 0 || myWantedIds.length === 0) {
      return res.json({ success: true, recommendations: [], message: 'Add both offered and wanted skills for recommendations.' });
    }

    const [quickMatches] = await db.execute(
      `SELECT DISTINCT u.id, u.name, u.bio, u.location, u.profile_picture,
              u.experience_level, u.rating, u.total_reviews, u.total_exchanges,
              COUNT(DISTINCT CASE WHEN us.type='wanted' AND us.skill_id IN (${myOfferedIds.map(() => '?').join(',')}) THEN us.skill_id END) as want_match,
              COUNT(DISTINCT CASE WHEN us.type='offered' AND us.skill_id IN (${myWantedIds.map(() => '?').join(',')}) THEN us.skill_id END) as offer_match
       FROM users u
       JOIN user_skills us ON u.id = us.user_id
       WHERE u.id != ? AND u.is_blocked = 0
       GROUP BY u.id
       HAVING want_match > 0 AND offer_match > 0
       ORDER BY (want_match + offer_match) DESC, u.rating DESC
       LIMIT 5`,
      [...myOfferedIds, ...myWantedIds, userId]
    );

    for (const match of quickMatches) {
      const [skills] = await db.execute(
        `SELECT s.name, s.category, us.type FROM user_skills us
         JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ? LIMIT 6`, [match.id]
      );
      match.skills = skills;
      const baseScore = Math.min(100, (match.want_match + match.offer_match) * 25 + parseFloat(match.rating || 0) * 5);
      match.match_score = Math.round(baseScore);
      match.match_reasons = [
        match.want_match > 0 ? `Wants ${match.want_match} skill(s) you offer` : null,
        match.offer_match > 0 ? `Offers ${match.offer_match} skill(s) you want` : null,
        match.rating >= 4 ? 'Highly rated user' : null,
      ].filter(Boolean);
    }

    res.json({ success: true, recommendations: quickMatches, from_cache: false });
  } catch (error) {
    console.error('AI Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations.' });
  }
};

/**
 * GET /api/ai/learning-path?skill=React&skillId=1
 */
const getLearningPathSuggestions = async (req, res) => {
  try {
    const { skill, skillId } = req.query;
    const userId = req.user.id;
    let skillName = skill;

    if (skillId && !skillName) {
      const [[skillRow]] = await db.execute('SELECT name FROM skills WHERE id = ?', [skillId]);
      skillName = skillRow?.name;
    }

    if (!skillName) return res.status(400).json({ success: false, message: 'Skill name or ID required.' });

    const [userSkills] = await db.execute(
      `SELECT s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?`, [userId]
    );
    const userSkillNames = userSkills.map(s => s.name);
    const learningPath = await getAILearningPath(skillName, userSkillNames);

    const enriched = [];
    for (const item of learningPath) {
      const [dbSkill] = await db.execute(
        'SELECT id, name, category, description FROM skills WHERE name LIKE ? LIMIT 1',
        [`%${item.name}%`]
      );
      enriched.push({ ...item, id: dbSkill[0]?.id || null, description: dbSkill[0]?.description || null, inDatabase: !!dbSkill[0] });
    }

    res.json({ success: true, skillName, learningPath: enriched, ai_powered: !!process.env.OPENAI_API_KEY });
  } catch (error) {
    console.error('Learning path error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate learning path.' });
  }
};

/**
 * POST /api/ai/embeddings/refresh
 */
const refreshEmbeddings = async (req, res) => {
  try {
    const result = await refreshAllEmbeddings();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Refresh embeddings error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh embeddings.' });
  }
};

/**
 * GET /api/ai/suggest-category?skill=TensorFlow
 */
const suggestSkillCategory = async (req, res) => {
  try {
    const { skill } = req.query;
    if (!skill) return res.status(400).json({ success: false, message: 'Skill name required.' });
    const category = suggestCategory(skill);
    res.json({ success: true, skill, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to suggest category.' });
  }
};

module.exports = {
  getAutocomplete,
  getAIMatches,
  getRecommendations,
  getLearningPathSuggestions,
  refreshEmbeddings,
  suggestSkillCategory,
};

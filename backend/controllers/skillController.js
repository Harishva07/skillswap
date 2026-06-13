/**
 * SkillSwap - Skill Controller
 * Manages the global skills catalog
 */

const db = require('../config/db');

/**
 * GET /api/skills
 * Get all skills with search and filter
 */
const getSkills = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, sort = 'popular' } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * limitNum;

    let whereConditions = ['is_active = 1'];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Use db.query (not db.execute) to avoid ER_WRONG_ARGUMENTS with subqueries
    // Inline LIMIT/OFFSET as safe integer literals
    const sql = `
      SELECT id, name, category, description,
             COALESCE(popularity, 0) AS popularity,
             created_at,
             (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = skills.id AND us.type = 'offered') AS offering_count,
             (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = skills.id AND us.type = 'wanted')  AS wanting_count
      FROM skills
      ${whereClause}
      ORDER BY popularity DESC, name ASC
      LIMIT ${limitNum} OFFSET ${offset}`;

    const countSql = `SELECT COUNT(*) AS total FROM skills ${whereClause}`;

    const [skills]         = await db.query(sql, params);
    const [[countRow]]     = await db.query(countSql, params);
    const [[{ total }]]    = [[countRow]];

    const [categories] = await db.query(
      `SELECT DISTINCT category FROM skills WHERE is_active = 1 AND category IS NOT NULL ORDER BY category`
    );

    res.json({
      success: true,
      skills,
      categories: categories.map(c => c.category),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Get skills error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch skills.' });
  }
};

/**
 * GET /api/skills/popular
 * Get top 10 popular skills
 */
const getPopularSkills = async (req, res) => {
  try {
    const [skills] = await db.execute(
      `SELECT id, name, category, popularity,
              (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = skills.id AND us.type = 'offered') as users_offering,
              (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = skills.id AND us.type = 'wanted') as users_wanting
       FROM skills WHERE is_active = 1
       ORDER BY popularity DESC LIMIT 10`
    );
    res.json({ success: true, skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch popular skills.' });
  }
};

/**
 * GET /api/skills/:id
 * Get a specific skill
 */
const getSkillById = async (req, res) => {
  try {
    let skills;
    try {
      [skills] = await db.execute('SELECT * FROM skills WHERE id = ? AND is_active = 1', [req.params.id]);
    } catch {
      [skills] = await db.execute('SELECT * FROM skills WHERE id = ?', [req.params.id]);
    }
    if (skills.length === 0) return res.status(404).json({ success: false, message: 'Skill not found.' });

    // Get users who offer OR want this skill
    const [users] = await db.query(
      `SELECT u.id, u.name, u.profile_picture as avatar, u.location,
              COALESCE(u.rating, 0) as avg_rating,
              us.type as skill_type
       FROM user_skills us
       JOIN users u ON us.user_id = u.id
       WHERE us.skill_id = ?
       LIMIT 20`,
      [req.params.id]
    );

    res.json({ success: true, skill: skills[0], users });
  } catch (error) {
    console.error('Get skill by id error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch skill.' });
  }
};

/**
 * POST /api/skills
 * Create a new skill (admin only or suggestion)
 */
const createSkill = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required.' });
    }

    // Find or create — if skill already exists return it (no error)
    const [existing] = await db.execute(
      'SELECT id, name, category, description FROM skills WHERE LOWER(name) = LOWER(?)',
      [name.trim()]
    );
    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Skill found.',
        skill: existing[0],
        existed: true,
      });
    }

    const [result] = await db.execute(
      'INSERT INTO skills (name, category, description) VALUES (?, ?, ?)',
      [name.trim(), category, description || null]
    );

    const [skill] = await db.execute('SELECT * FROM skills WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Skill created!', skill: skill[0] });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ success: false, message: 'Failed to create skill.' });
  }
};

/**
 * PUT /api/skills/:id
 * Update a skill (admin only)
 */
const updateSkill = async (req, res) => {
  try {
    const { name, category, description, is_active } = req.body;
    const { id } = req.params;

    await db.execute(
      'UPDATE skills SET name = COALESCE(?, name), category = COALESCE(?, category), description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name, category, description, is_active, id]
    );

    const [skill] = await db.execute('SELECT * FROM skills WHERE id = ?', [id]);
    res.json({ success: true, message: 'Skill updated!', skill: skill[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update skill.' });
  }
};

/**
 * DELETE /api/skills/:id
 * Soft-delete a skill (admin only)
 */
const deleteSkill = async (req, res) => {
  try {
    await db.execute('UPDATE skills SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Skill deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete skill.' });
  }
};

module.exports = { getSkills, getPopularSkills, getSkillById, createSkill, updateSkill, deleteSkill };

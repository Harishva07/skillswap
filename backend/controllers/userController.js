/**
 * SkillSwap - User Controller
 * Handles user profile management and skill matching
 */

const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/users
 * Get all users (with optional search/filter)
 */
const getUsers = async (req, res) => {
  try {
    const { search, location, experience_level, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['u.is_blocked = 0', 'u.id != ?'];
    let params = [req.user.id];

    if (search) {
      whereConditions.push('(u.name LIKE ? OR u.bio LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (location) {
      whereConditions.push('u.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (experience_level) {
      whereConditions.push('u.experience_level = ?');
      params.push(experience_level);
    }

    const whereClause = whereConditions.join(' AND ');

    const [users] = await db.execute(
      `SELECT u.id, u.name, u.email, u.bio, u.location, u.profile_picture, 
              u.experience_level, u.rating, u.total_reviews, u.total_exchanges, u.created_at,
              GROUP_CONCAT(DISTINCT CASE WHEN us.type='offered' THEN s.name END ORDER BY s.name SEPARATOR ',') AS skills_offered,
              GROUP_CONCAT(DISTINCT CASE WHEN us.type='wanted' THEN s.name END ORDER BY s.name SEPARATOR ',') AS skills_wanted
       FROM users u
       LEFT JOIN user_skills us ON u.id = us.user_id
       LEFT JOIN skills s ON us.skill_id = s.id
       WHERE ${whereClause}
       GROUP BY u.id
       ORDER BY u.rating DESC, u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(DISTINCT u.id) as total FROM users u WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      users,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

/**
 * GET /api/users/:id
 * Get a specific user profile
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.execute(
      `SELECT u.id, u.name, u.email, u.bio, u.location, u.profile_picture, 
              u.experience_level, u.rating, u.total_reviews, u.total_exchanges, u.created_at
       FROM users u WHERE u.id = ? AND u.is_blocked = 0`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];

    // Get user's skills
    const [skills] = await db.execute(
      `SELECT us.id, s.id as skill_id, s.name, s.category, us.type, us.proficiency
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?
       ORDER BY us.type, s.name`,
      [id]
    );

    // Get recent reviews
    const [reviews] = await db.execute(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name as reviewer_name, u.profile_picture as reviewer_avatar
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      user: { ...user, skills, reviews }
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user.' });
  }
};

/**
 * PUT /api/users/profile
 * Update current user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, bio, location, experience_level } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    await db.execute(
      `UPDATE users SET name = ?, bio = ?, location = ?, experience_level = ? WHERE id = ?`,
      [name.trim(), bio || null, location || null, experience_level || 'beginner', userId]
    );

    const [users] = await db.execute(
      `SELECT id, name, email, bio, location, profile_picture, experience_level, rating, total_reviews, total_exchanges, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: users[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

/**
 * POST /api/users/avatar
 * Upload profile picture
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const userId = req.user.id;
    const filename = req.file.filename;

    // Get old avatar to delete
    const [users] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);
    const oldAvatar = users[0]?.profile_picture;

    // Update database
    await db.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [filename, userId]);

    // Delete old avatar file if it exists
    if (oldAvatar) {
      const oldPath = path.join(__dirname, '..', 'uploads', oldAvatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.json({
      success: true,
      message: 'Profile picture updated!',
      profile_picture: filename,
      profile_picture_url: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload profile picture.' });
  }
};

/**
 * GET /api/users/matches
 * Get skill matches for the current user
 */
const getMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get current user's offered and wanted skills
    const [mySkills] = await db.execute(
      `SELECT skill_id, type FROM user_skills WHERE user_id = ?`,
      [userId]
    );

    if (mySkills.length === 0) {
      return res.json({ 
        success: true, 
        matches: [], 
        message: 'Add skills to your profile to see matches!',
        pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 }
      });
    }

    const myOfferedSkillIds = mySkills.filter(s => s.type === 'offered').map(s => s.skill_id);
    const myWantedSkillIds = mySkills.filter(s => s.type === 'wanted').map(s => s.skill_id);

    if (myOfferedSkillIds.length === 0 || myWantedSkillIds.length === 0) {
      return res.json({ 
        success: true, 
        matches: [], 
        message: 'Add both skills you offer and skills you want to see matches!',
        pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 }
      });
    }

    const limitNum = parseInt(limit) || 12;
    const offsetNum = parseInt(offset) || 0;
    
    const offeredIdsStr = myOfferedSkillIds.join(',');
    const wantedIdsStr = myWantedSkillIds.join(',');

    // Find users who want what I offer AND offer what I want
    const [matches] = await db.query(
      `SELECT u.id, u.name, u.bio, u.location, u.profile_picture, u.experience_level, u.rating, u.total_reviews,
              COUNT(DISTINCT CASE WHEN us1.type='wanted' AND us1.skill_id IN (${offeredIdsStr}) THEN us1.skill_id END) as match_offered,
              COUNT(DISTINCT CASE WHEN us2.type='offered' AND us2.skill_id IN (${wantedIdsStr}) THEN us2.skill_id END) as match_wanted,
              (COUNT(DISTINCT CASE WHEN us1.type='wanted' AND us1.skill_id IN (${offeredIdsStr}) THEN us1.skill_id END) + 
               COUNT(DISTINCT CASE WHEN us2.type='offered' AND us2.skill_id IN (${wantedIdsStr}) THEN us2.skill_id END)) * 50 as match_percentage
       FROM users u
       JOIN user_skills us1 ON u.id = us1.user_id
       JOIN user_skills us2 ON u.id = us2.user_id
       WHERE u.id != ${userId} AND u.is_blocked = 0
         AND (us1.type = 'wanted' AND us1.skill_id IN (${offeredIdsStr})
              OR us2.type = 'offered' AND us2.skill_id IN (${wantedIdsStr}))
       GROUP BY u.id
       HAVING match_offered > 0 AND match_wanted > 0
       ORDER BY match_percentage DESC, u.rating DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`
    );

    // Fetch skills for each match
    for (const match of matches) {
      const [skills] = await db.execute(
        `SELECT s.name, s.category, us.type, us.proficiency FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = ? ORDER BY us.type, s.name`,
        [match.id]
      );
      match.skills = skills;
      match.match_percentage = Math.min(100, match.match_percentage);
    }

    res.json({
      success: true,
      matches,
      pagination: {
        total: matches.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(matches.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch matches.' });
  }
};

/**
 * GET /api/users/dashboard
 * Get dashboard statistics for current user
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get stats
    const [[stats]] = await db.execute(
      `SELECT 
        (SELECT COUNT(*) FROM exchange_requests WHERE (requester_id = ? OR recipient_id = ?) AND status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM exchange_requests WHERE (requester_id = ? OR recipient_id = ?) AND status = 'accepted') as active_exchanges,
        (SELECT COUNT(*) FROM exchange_requests WHERE (requester_id = ? OR recipient_id = ?) AND status = 'completed') as completed_exchanges,
        (SELECT COUNT(*) FROM user_skills WHERE user_id = ? AND type = 'offered') as skills_offered,
        (SELECT COUNT(*) FROM user_skills WHERE user_id = ? AND type = 'wanted') as skills_wanted,
        (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) as unread_notifications,
        (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND is_read = 0) as unread_messages`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    // Get recent exchange requests
    const [recentRequests] = await db.execute(
      `SELECT er.id, er.status, er.created_at, er.message,
              s1.name as offered_skill, s2.name as wanted_skill,
              CASE WHEN er.requester_id = ? THEN 'sent' ELSE 'received' END as direction,
              CASE WHEN er.requester_id = ? THEN u2.name ELSE u1.name END as other_user_name,
              CASE WHEN er.requester_id = ? THEN u2.profile_picture ELSE u1.profile_picture END as other_user_avatar
       FROM exchange_requests er
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.recipient_id = u2.id
       LEFT JOIN skills s1 ON er.offered_skill_id = s1.id
       JOIN skills s2 ON er.wanted_skill_id = s2.id
       WHERE er.requester_id = ? OR er.recipient_id = ?
       ORDER BY er.created_at DESC LIMIT 5`,
      [userId, userId, userId, userId, userId]
    );

    // Get recent activity (notifications)
    const [recentActivity] = await db.execute(
      `SELECT id, type, title, message, is_read, created_at FROM notifications 
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      stats,
      recentRequests,
      recentActivity
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
  }
};

/**
 * POST /api/users/skills
 * Add a skill to user profile
 */
const addUserSkill = async (req, res) => {
  try {
    const { skill_id, type, proficiency } = req.body;
    const userId = req.user.id;

    if (!skill_id || !type) {
      return res.status(400).json({ success: false, message: 'skill_id and type are required.' });
    }

    if (!['offered', 'wanted'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be "offered" or "wanted".' });
    }

    // Check skill exists
    const [skills] = await db.execute('SELECT id, name FROM skills WHERE id = ? AND is_active = 1', [skill_id]);
    if (skills.length === 0) {
      return res.status(404).json({ success: false, message: 'Skill not found.' });
    }

    // Check for duplicate
    const [existing] = await db.execute(
      'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ? AND type = ?',
      [userId, skill_id, type]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have this skill in this category.' });
    }

    await db.execute(
      'INSERT INTO user_skills (user_id, skill_id, type, proficiency) VALUES (?, ?, ?, ?)',
      [userId, skill_id, type, proficiency || 'beginner']
    );

    // Increment skill popularity
    await db.execute('UPDATE skills SET popularity = popularity + 1 WHERE id = ?', [skill_id]);

    res.status(201).json({ 
      success: true, 
      message: `Skill "${skills[0].name}" added to your ${type} skills!`
    });
  } catch (error) {
    console.error('Add user skill error:', error);
    res.status(500).json({ success: false, message: 'Failed to add skill.' });
  }
};

/**
 * DELETE /api/users/skills/:id
 * Remove a skill from user profile
 */
const removeUserSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [skill] = await db.execute(
      'SELECT id FROM user_skills WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (skill.length === 0) {
      return res.status(404).json({ success: false, message: 'Skill not found in your profile.' });
    }

    await db.execute('DELETE FROM user_skills WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ success: true, message: 'Skill removed from your profile.' });
  } catch (error) {
    console.error('Remove user skill error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove skill.' });
  }
};

/**
 * GET /api/users/skills
 * Get current user's skills
 */
const getMySkills = async (req, res) => {
  try {
    const [skills] = await db.execute(
      `SELECT us.id, s.id as skill_id, s.name, s.category, s.description, us.type, us.proficiency, us.created_at
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?
       ORDER BY us.type, s.category, s.name`,
      [req.user.id]
    );

    res.json({ success: true, skills });
  } catch (error) {
    console.error('Get my skills error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skills.' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
  getMatches,
  getDashboard,
  addUserSkill,
  removeUserSkill,
  getMySkills
};

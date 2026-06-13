/**
 * SkillSwap - Admin Controller
 * Platform administration and analytics
 */

const db = require('../config/db');

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
 */
const getPlatformStats = async (req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_admin = 0) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_admin = 0 AND DATE(created_at) = CURDATE()) as new_users_today,
        (SELECT COUNT(*) FROM skills WHERE is_active = 1) as total_skills,
        (SELECT COUNT(*) FROM exchange_requests) as total_exchanges,
        (SELECT COUNT(*) FROM exchange_requests WHERE status = 'completed') as completed_exchanges,
        (SELECT COUNT(*) FROM exchange_requests WHERE status = 'pending') as pending_exchanges,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM users WHERE is_blocked = 1) as blocked_users,
        (SELECT AVG(rating) FROM reviews) as avg_platform_rating
    `);

    // Top skills
    const [topSkills] = await db.execute(`
      SELECT s.name, s.category, s.popularity,
        (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = s.id AND us.type = 'offered') as users_offering,
        (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = s.id AND us.type = 'wanted') as users_wanting
      FROM skills s WHERE s.is_active = 1
      ORDER BY s.popularity DESC LIMIT 10
    `);

    // Recent registrations per day (last 7 days)
    const [registrationTrend] = await db.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND is_admin = 0
      GROUP BY DATE(created_at) ORDER BY date
    `);

    res.json({ success: true, stats, topSkills, registrationTrend });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

/**
 * GET /api/admin/users
 * Get all users for admin management
 */
const getAllUsers = async (req, res) => {
  try {
    const { search, is_blocked, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['is_admin = 0'];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (is_blocked !== undefined) {
      whereConditions.push('is_blocked = ?');
      params.push(is_blocked === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.join(' AND ');

    const [users] = await db.execute(
      `SELECT id, name, email, location, experience_level, is_blocked, rating, total_reviews, total_exchanges, created_at
       FROM users WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    res.json({ success: true, users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

/**
 * PATCH /api/admin/users/:id/block
 * Block or unblock a user
 */
const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { block } = req.body;

    // Prevent blocking admins
    const [users] = await db.execute('SELECT is_admin FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    if (users[0].is_admin) return res.status(400).json({ success: false, message: 'Cannot block an admin user.' });

    await db.execute('UPDATE users SET is_blocked = ? WHERE id = ?', [block ? 1 : 0, id]);

    // Log admin action
    await db.execute(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, block ? 'block_user' : 'unblock_user', 'user', id, `User ${block ? 'blocked' : 'unblocked'} by admin`]
    );

    res.json({ success: true, message: `User ${block ? 'blocked' : 'unblocked'} successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user account
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.execute('SELECT is_admin FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    if (users[0].is_admin) return res.status(400).json({ success: false, message: 'Cannot delete an admin.' });

    await db.execute('DELETE FROM users WHERE id = ?', [id]);

    await db.execute(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'delete_user', 'user', id]
    );

    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

/**
 * GET /api/admin/skills
 * Get all skills for admin
 */
const getAllSkills = async (req, res) => {
  try {
    const [skills] = await db.execute(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = s.id AND us.type = 'offered') as users_offering,
        (SELECT COUNT(*) FROM user_skills us WHERE us.skill_id = s.id AND us.type = 'wanted') as users_wanting
       FROM skills s ORDER BY s.created_at DESC`
    );
    res.json({ success: true, skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch skills.' });
  }
};

/**
 * GET /api/admin/exchanges
 * Get all exchanges for admin
 */
const getAllExchanges = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [exchanges] = await db.execute(
      `SELECT er.id, er.status, er.created_at,
              u1.name as requester_name, u2.name as recipient_name,
              s1.name as offered_skill, s2.name as wanted_skill
       FROM exchange_requests er
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.recipient_id = u2.id
       JOIN skills s1 ON er.offered_skill_id = s1.id
       JOIN skills s2 ON er.wanted_skill_id = s2.id
       ORDER BY er.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM exchange_requests');

    res.json({ success: true, exchanges, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch exchanges.' });
  }
};

/**
 * GET /api/admin/logs
 * Get admin activity logs
 */
const getAdminLogs = async (req, res) => {
  try {
    const [logs] = await db.execute(
      `SELECT al.*, u.name as admin_name 
       FROM admin_logs al JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT 50`
    );
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs.' });
  }
};

module.exports = { getPlatformStats, getAllUsers, toggleUserBlock, deleteUser, getAllSkills, getAllExchanges, getAdminLogs };

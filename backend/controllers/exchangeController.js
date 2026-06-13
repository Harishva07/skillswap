/**
 * SkillSwap - Exchange Request Controller
 * Manages skill exchange requests between users
 */

const db = require('../config/db');

/**
 * Helper: Create notification and emit socket event
 */
const sendNotification = async (io, connectedUsers, userId, type, title, message, referenceId, referenceType) => {
  const [result] = await db.execute(
    `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, referenceId, referenceType]
  );
  
  const notification = { id: result.insertId, type, title, message, reference_id: referenceId, is_read: 0, created_at: new Date() };
  
  if (io && connectedUsers) {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) io.to(socketId).emit('new_notification', notification);
  }
};

/**
 * GET /api/exchanges
 * Get all exchange requests for current user
 */
const getExchanges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['(er.requester_id = ? OR er.recipient_id = ?)'];
    let params = [userId, userId];

    if (status) {
      whereConditions.push('er.status = ?');
      params.push(status);
    }

    if (type === 'sent') {
      whereConditions = ['er.requester_id = ?'];
      params = [userId];
      if (status) { whereConditions.push('er.status = ?'); params.push(status); }
    } else if (type === 'received') {
      whereConditions = ['er.recipient_id = ?'];
      params = [userId];
      if (status) { whereConditions.push('er.status = ?'); params.push(status); }
    }

    const whereClause = whereConditions.join(' AND ');

    const limitNum = parseInt(limit) || 10;
    const offsetNum = parseInt(offset) || 0;

    const [exchanges] = await db.query(
      `SELECT er.id, er.status, er.message, er.created_at, er.updated_at, er.completed_at,
              s1.id as offered_skill_id, s1.name as offered_skill, s1.category as offered_category,
              s2.id as wanted_skill_id, s2.name as wanted_skill, s2.category as wanted_category,
              u1.id as requester_id, u1.name as requester_name, u1.profile_picture as requester_avatar, u1.rating as requester_rating,
              u2.id as recipient_id, u2.name as recipient_name, u2.profile_picture as recipient_avatar, u2.rating as recipient_rating,
              CASE WHEN er.requester_id = ${userId} THEN 'sent' ELSE 'received' END as direction
       FROM exchange_requests er
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.recipient_id = u2.id
       LEFT JOIN skills s1 ON er.offered_skill_id = s1.id
       JOIN skills s2 ON er.wanted_skill_id = s2.id
       WHERE ${whereClause}
       ORDER BY er.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM exchange_requests er WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      exchanges,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get exchanges error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exchanges.' });
  }
};

/**
 * POST /api/exchanges
 * Send a new exchange request
 */
const createExchange = async (req, res) => {
  try {
    const { recipient_id, offered_skill_id, wanted_skill_id, message } = req.body;
    const requesterId = req.user.id;

    if (!recipient_id || !wanted_skill_id) {
      return res.status(400).json({ success: false, message: 'recipient_id and wanted_skill_id are required.' });
    }

    if (parseInt(recipient_id) === requesterId) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself.' });
    }

    // Check if recipient exists and is not blocked
    const [recipients] = await db.execute('SELECT id, name FROM users WHERE id = ? AND is_blocked = 0', [recipient_id]);
    if (recipients.length === 0) return res.status(404).json({ success: false, message: 'Recipient not found.' });

    // Check for existing pending request between same users
    const [existing] = await db.execute(
      `SELECT id FROM exchange_requests 
       WHERE ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)) 
             AND status IN ('pending', 'accepted')`,
      [requesterId, recipient_id, recipient_id, requesterId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have an active exchange with this user.' });
    }

    // Validate skills exist
    let offeredSkill = null;
    if (offered_skill_id) {
      const [skills] = await db.execute('SELECT id, name FROM skills WHERE id = ?', [offered_skill_id]);
      if (skills.length === 0) return res.status(400).json({ success: false, message: 'Invalid offered skill.' });
      offeredSkill = skills[0];
    }

    const [wantedSkill] = await db.execute('SELECT id, name FROM skills WHERE id = ?', [wanted_skill_id]);
    if (wantedSkill.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid wanted skill.' });
    }

    const [result] = await db.execute(
      `INSERT INTO exchange_requests (requester_id, recipient_id, offered_skill_id, wanted_skill_id, message) VALUES (?, ?, ?, ?, ?)`,
      [requesterId, recipient_id, offered_skill_id || null, wanted_skill_id, message || null]
    );

    // Send notification to recipient
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    
    const notificationMessage = offeredSkill 
      ? `${req.user.name} wants to exchange ${offeredSkill.name} for ${wantedSkill[0].name}`
      : `${req.user.name} sent a request to learn ${wantedSkill[0].name} from you`;

    await sendNotification(
      io, connectedUsers, recipient_id, 'exchange_request',
      'New Exchange Request! 🤝',
      notificationMessage,
      result.insertId, 'exchange'
    );

    res.status(201).json({ success: true, message: 'Exchange request sent!', id: result.insertId });
  } catch (error) {
    console.error('Create exchange error:', error);
    res.status(500).json({ success: false, message: 'Failed to send exchange request.' });
  }
};

/**
 * PATCH /api/exchanges/:id/status
 * Accept, reject, or complete an exchange
 */
const updateExchangeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const [exchanges] = await db.execute(
      `SELECT er.*, s1.name as offered_skill, s2.name as wanted_skill,
              u1.name as requester_name, u2.name as recipient_name
       FROM exchange_requests er
       LEFT JOIN skills s1 ON er.offered_skill_id = s1.id
       JOIN skills s2 ON er.wanted_skill_id = s2.id
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.recipient_id = u2.id
       WHERE er.id = ?`,
      [id]
    );

    if (exchanges.length === 0) return res.status(404).json({ success: false, message: 'Exchange not found.' });
    const exchange = exchanges[0];

    // Authorization checks
    if (status === 'cancelled' && exchange.requester_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the requester can cancel.' });
    }
    if (['accepted', 'rejected'].includes(status) && exchange.recipient_id !== userId) {
      return res.status(403).json({ success: false, message: 'Only the recipient can accept or reject.' });
    }
    if (['pending', 'completed'].includes(status) && ![exchange.requester_id, exchange.recipient_id].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const completedAt = status === 'completed' ? new Date() : null;
    await db.execute(
      'UPDATE exchange_requests SET status = ?, completed_at = ? WHERE id = ?',
      [status, completedAt, id]
    );

    // Update total exchanges count for both users
    if (status === 'completed') {
      await db.execute('UPDATE users SET total_exchanges = total_exchanges + 1 WHERE id IN (?, ?)', 
        [exchange.requester_id, exchange.recipient_id]);
    }

    // Send notification to the other party
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const notifyUserId = userId === exchange.requester_id ? exchange.recipient_id : exchange.requester_id;
    
    const statusMessages = {
      pending: `${req.user.name} sent a new exchange request! 🤝`,
      accepted: `${req.user.name} accepted your exchange request! 🎉`,
      rejected: `${req.user.name} declined your exchange request.`,
      completed: `Exchange marked as completed! Don't forget to leave a review.`,
      cancelled: `Exchange request was cancelled.`
    };

    await sendNotification(io, connectedUsers, notifyUserId, `exchange_${status}`,
      `Exchange ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      statusMessages[status], id, 'exchange');

    res.json({ success: true, message: `Exchange ${status} successfully!` });
  } catch (error) {
    console.error('Update exchange status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update exchange.' });
  }
};

/**
 * GET /api/exchanges/:id
 * Get a specific exchange
 */
const getExchangeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [exchanges] = await db.execute(
      `SELECT er.*, s1.name as offered_skill, s1.category as offered_category,
              s2.name as wanted_skill, s2.category as wanted_category,
              u1.id as requester_id, u1.name as requester_name, u1.profile_picture as requester_avatar,
              u2.id as recipient_id, u2.name as recipient_name, u2.profile_picture as recipient_avatar
       FROM exchange_requests er
       LEFT JOIN skills s1 ON er.offered_skill_id = s1.id
       JOIN skills s2 ON er.wanted_skill_id = s2.id
       JOIN users u1 ON er.requester_id = u1.id
       JOIN users u2 ON er.recipient_id = u2.id
       WHERE er.id = ? AND (er.requester_id = ? OR er.recipient_id = ?)`,
      [id, userId, userId]
    );

    if (exchanges.length === 0) return res.status(404).json({ success: false, message: 'Exchange not found.' });

    res.json({ success: true, exchange: exchanges[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch exchange.' });
  }
};

/**
 * DELETE /api/exchanges/:id
 * Delete a specific exchange
 */
const deleteExchange = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Ensure the user is either the requester or recipient
    const [exchanges] = await db.execute(
      `SELECT id FROM exchange_requests WHERE id = ? AND (requester_id = ? OR recipient_id = ?)`,
      [id, userId, userId]
    );

    if (exchanges.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized or exchange not found.' });
    }

    await db.execute('DELETE FROM exchange_requests WHERE id = ?', [id]);

    res.json({ success: true, message: 'Exchange deleted successfully.' });
  } catch (error) {
    console.error('Delete exchange error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete exchange.' });
  }
};

module.exports = { getExchanges, createExchange, updateExchangeStatus, getExchangeById, deleteExchange };

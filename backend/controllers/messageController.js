/**
 * SkillSwap - Message Controller
 * Handles real-time messaging between users
 */

const db = require('../config/db');

/**
 * GET /api/messages/conversations
 * Get all conversations for current user
 */
const getConversations = async (req, res) => {
  try {
    const userId = parseInt(req.user.id);

    // Step 1 — get all conversation partners
    const [convRows] = await db.query(`
      SELECT
        IF(m.sender_id = ${userId}, m.receiver_id, m.sender_id)  AS other_user_id,
        u.name                                                     AS other_user_name,
        u.profile_picture                                          AS other_user_avatar,
        MAX(m.created_at)                                          AS last_message_time,
        MAX(m.id)                                                  AS last_msg_id
      FROM messages m
      JOIN users u
        ON u.id = IF(m.sender_id = ${userId}, m.receiver_id, m.sender_id)
      WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
      GROUP BY IF(m.sender_id = ${userId}, m.receiver_id, m.sender_id),
               u.name, u.profile_picture
      ORDER BY last_message_time DESC
    `);

    if (convRows.length === 0) {
      return res.json({ success: true, conversations: [] });
    }

    // Step 2 — fetch last message text and unread count for each conversation
    const conversations = await Promise.all(convRows.map(async (row) => {
      const [[lastMsg]] = await db.query(
        `SELECT content FROM messages
         WHERE ((sender_id = ${userId} AND receiver_id = ${row.other_user_id})
             OR (sender_id = ${row.other_user_id} AND receiver_id = ${userId}))
         ORDER BY created_at DESC LIMIT 1`
      );
      const [[unread]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM messages
         WHERE sender_id = ${row.other_user_id}
           AND receiver_id = ${userId}
           AND is_read = 0`
      );
      return {
        ...row,
        last_message: lastMsg?.content || '',
        unread_count: unread?.cnt || 0,
      };
    }));

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations.' });
  }
};

/**
 * GET /api/messages/:userId
 * Get messages between current user and another user
 */
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    const limitNum = Math.min(100, parseInt(req.query.limit) || 50);
    const pageNum  = Math.max(1,   parseInt(req.query.page)  || 1);
    const offset   = (pageNum - 1) * limitNum;

    // Mark messages as read
    await db.execute(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      [otherUserId, currentUserId]
    );

    const [messages] = await db.query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
              u.name as sender_name, u.profile_picture as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    // Get other user info
    const [users] = await db.execute(
      'SELECT id, name, profile_picture, rating FROM users WHERE id = ?',
      [otherUserId]
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      otherUser: users[0] || null
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

/**
 * POST /api/messages
 * Send a message to another user
 */
const sendMessage = async (req, res) => {
  try {
    const { receiver_id, content, exchange_id } = req.body;
    const senderId = req.user.id;

    if (!receiver_id || !content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'receiver_id and content are required.' });
    }

    if (parseInt(receiver_id) === senderId) {
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself.' });
    }

    // Check receiver exists
    const [receivers] = await db.execute('SELECT id, name FROM users WHERE id = ? AND is_blocked = 0', [receiver_id]);
    if (receivers.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, content, exchange_id) VALUES (?, ?, ?, ?)',
      [senderId, receiver_id, content.trim(), exchange_id || null]
    );

    const [messages] = await db.execute(
      `SELECT m.*, u.name as sender_name, u.profile_picture as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const message = messages[0];

    // Emit socket event for real-time delivery
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const receiverSocketId = connectedUsers?.get(receiver_id.toString());
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', message);
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

/**
 * GET /api/messages/unread/count
 * Get unread message count
 */
const getUnreadCount = async (req, res) => {
  try {
    const [[{ count }]] = await db.execute(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get unread count.' });
  }
};

/**
 * DELETE /api/messages/:id
 * Delete a message (sender only)
 */
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const senderId = req.user.id;

    // Get message first to find receiver for socket notification
    const [msgs] = await db.execute(
      'SELECT id, sender_id, receiver_id FROM messages WHERE id = ? AND sender_id = ?',
      [id, senderId]
    );
    if (msgs.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or not yours.' });
    }

    await db.execute('DELETE FROM messages WHERE id = ?', [id]);

    // Notify receiver via socket
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const receiverSocketId = connectedUsers?.get(msgs[0].receiver_id.toString());
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit('message_deleted', { messageId: parseInt(id) });
    }

    res.json({ success: true, message: 'Message deleted.' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount, deleteMessage };

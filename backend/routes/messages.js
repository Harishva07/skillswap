const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getConversations, getMessages, sendMessage, getUnreadCount, deleteMessage } = require('../controllers/messageController');

router.get('/conversations',  auth, getConversations);
router.get('/unread/count',   auth, getUnreadCount);
router.get('/:userId',        auth, getMessages);
router.post('/',              auth, sendMessage);
router.delete('/:id',         auth, deleteMessage);

module.exports = router;

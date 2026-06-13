/**
 * SkillSwap - Main Express Server
 * Entry point for the backend API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const exchangeRoutes = require('./routes/exchanges');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Import database connection
const db = require('./config/db');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time messaging
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users for socket messaging
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Register user — broadcast online status to everyone
  socket.on('register', (userId) => {
    connectedUsers.set(userId.toString(), socket.id);
    socket.userId = userId.toString();
    socket.broadcast.emit('user_online', userId);
    console.log(`👤 User ${userId} is online`);
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    const { receiverId, message } = data;
    const receiverSocketId = connectedUsers.get(receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', message);
    }
  });

  // Handle message deletion — notify other user
  socket.on('delete_message', (data) => {
    const { receiverId, messageId } = data;
    const receiverSocketId = connectedUsers.get(receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message_deleted', { messageId });
    }
  });

  // When recipient opens a chat — notify sender messages were read
  socket.on('mark_read', (data) => {
    const { senderId } = data;
    const senderSocketId = connectedUsers.get(senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit('messages_read', { readerId: socket.userId });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { senderId: data.senderId });
    }
  });

  socket.on('stop_typing', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_stop_typing', { senderId: data.senderId });
    }
  });

  // Handle notification sending
  socket.on('send_notification', (data) => {
    const receiverSocketId = connectedUsers.get(data.userId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_notification', data.notification);
    }
  });

  // ==========================================
  // WEBRTC VIDEO CALL SIGNALING
  // ==========================================

  // 1. Caller initiates a call
  socket.on('call_user', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        callerId: socket.userId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        signalData: data.signalData, // The WebRTC Offer
        isAudioOnly: data.isAudioOnly
      });
    }
  });

  // 2. Receiver answers the call
  socket.on('answer_call', (data) => {
    const callerSocketId = connectedUsers.get(data.callerId.toString());
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_answered', {
        signalData: data.signalData // The WebRTC Answer
      });
    }
  });

  // 3. ICE Candidate exchange
  socket.on('ice_candidate', (data) => {
    const otherSocketId = connectedUsers.get(data.targetId.toString());
    if (otherSocketId) {
      io.to(otherSocketId).emit('ice_candidate', {
        candidate: data.candidate,
        senderId: socket.userId
      });
    }
  });

  // 4. Call rejected or ended
  socket.on('end_call', (data) => {
    const otherSocketId = connectedUsers.get(data.targetId.toString());
    if (otherSocketId) {
      io.to(otherSocketId).emit('call_ended', {
        senderId: socket.userId
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        socket.broadcast.emit('user_offline', userId);
        console.log(`👤 User ${userId} went offline`);
        break;
      }
    }
  });
});

// Make io accessible in routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// =============================================
// MIDDLEWARE
// =============================================

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// =============================================
// ROUTES
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SkillSwap API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found` 
  });
});

// =============================================
// ERROR HANDLING MIDDLEWARE
// =============================================
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.stack);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size too large. Max 5MB allowed.' });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Unexpected file field.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n🚀 SkillSwap API Server Started!');
  console.log('================================');
  console.log(`🌐 Server:   http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🔧 Mode:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io enabled`);
  console.log('================================\n');
});

module.exports = { app, server, io };

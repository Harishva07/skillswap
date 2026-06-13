/**
 * SkillSwap - Chat Page
 * Real-time messaging with delete, read receipts, online status & call feature
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { messageAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { UserAvatar, timeAgo } from '../components/common/Utils';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

import { WebRTCCallModal } from './WebRTCCallModal';

let socket = null;

// ── Main Component ────────────────────────────────────────────────────────────
export const Chat = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMessage, setNewMessage]       = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [isTyping, setIsTyping]           = useState(false);
  const [onlineUsers, setOnlineUsers]     = useState(new Set()); // track online users
  const [callType, setCallType]           = useState(null);
  const [incomingCall, setIncomingCall]   = useState(null);
  const [hoveredMsg, setHoveredMsg]       = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const typingTimer    = useRef(null);
  const selectedUserRef = useRef(null); // stable ref for socket callbacks

  const queryUserId = new URLSearchParams(location.search).get('userId');

  // Keep selectedUserRef in sync
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // ── Socket.io setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('token') } });
    socket.emit('register', user.id);

    // Incoming message
    socket.on('receive_message', (msg) => {
      const sel = selectedUserRef.current;
      if (sel && msg.sender_id === sel.other_user_id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        // Tell sender we read it immediately
        socket.emit('mark_read', { senderId: msg.sender_id });
      } else {
        // Update unread badge in sidebar
        setConversations(prev => prev.map(c =>
          c.other_user_id === msg.sender_id
            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: msg.content }
            : c
        ));
      }
    });

    // Message deleted by other user
    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    // Our messages were read by the other person → show ✓✓
    socket.on('messages_read', ({ readerId }) => {
      const sel = selectedUserRef.current;
      if (sel && String(readerId) === String(sel.other_user_id)) {
        setMessages(prev => prev.map(m =>
          m.sender_id === user.id ? { ...m, is_read: 1 } : m
        ));
      }
    });

    // Online/offline tracking
    socket.on('user_online',  (uid) => setOnlineUsers(prev => new Set([...prev, String(uid)])));
    socket.on('user_offline', (uid) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(String(uid)); return s; }));

    // Typing
    socket.on('user_typing',      () => setIsTyping(true));
    socket.on('user_stop_typing', () => setIsTyping(false));

    // Incoming WebRTC Call
    socket.on('incoming_call', (data) => {
      setIncomingCall(data);
    });

    return () => { socket?.disconnect(); socket = null; };
  }, [user.id]);

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data?.conversations || []);
    } catch {
      toast('Failed to load conversations', 'error');
    } finally {
      setLoadingConvs(false);
    }
  }, [toast]);

  useEffect(() => { loadConversations(); }, []);

  // ── Auto-open from ?userId= ─────────────────────────────────────────────────
  useEffect(() => {
    if (!queryUserId) return;
    const existing = conversations.find(c => String(c.other_user_id) === String(queryUserId));
    if (existing) {
      openChat(existing);
    } else {
      userAPI.getById(queryUserId)
        .then(res => {
          const u = res.data?.user || res.data;
          if (u) {
            const conv = { other_user_id: u.id, other_user_name: u.name, other_user_avatar: u.avatar || u.profile_picture };
            setSelectedUser(conv);
            setMessages([]);
          }
        })
        .catch(() => toast('Failed to load user', 'error'));
    }
  }, [queryUserId, conversations.length]); // eslint-disable-line

  // ── Open conversation ───────────────────────────────────────────────────────
  const openChat = (conv) => {
    setSelectedUser(conv);
    loadMessages(conv.other_user_id);
  };

  const loadMessages = async (otherId) => {
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await messageAPI.getMessages(otherId);
      setMessages(res.data?.messages || []);
      if (res.data?.otherUser) {
        setSelectedUser(prev => ({
          ...prev,
          other_user_id:     res.data.otherUser.id,
          other_user_name:   res.data.otherUser.name,
          other_user_avatar: res.data.otherUser.profile_picture,
        }));
      }
      // Tell sender their messages are read
      if (socket) socket.emit('mark_read', { senderId: otherId });
    } catch {
      toast('Failed to load messages', 'error');
    } finally {
      setLoadingMsgs(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const res = await messageAPI.send({ receiver_id: selectedUser.other_user_id, content });
      const msg = res.data.message;
      setMessages(prev => [...prev, msg]);
      if (socket) socket.emit('send_message', { receiverId: selectedUser.other_user_id, message: msg });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      loadConversations();
    } catch {
      toast('Failed to send message', 'error');
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (msg) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messageAPI.delete(msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      // Notify via socket
      if (socket) socket.emit('delete_message', { receiverId: selectedUser.other_user_id, messageId: msg.id });
    } catch {
      toast('Failed to delete message', 'error');
    }
  };

  // ── Typing ──────────────────────────────────────────────────────────────────
  const handleTyping = () => {
    if (socket && selectedUser) {
      socket.emit('typing', { receiverId: selectedUser.other_user_id, senderId: user.id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('stop_typing', { receiverId: selectedUser.other_user_id, senderId: user.id });
      }, 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isOnline = selectedUser ? onlineUsers.has(String(selectedUser.other_user_id)) : false;

  // Group messages by date
  const groupedMessages = messages.reduce((g, msg) => {
    const day = new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    (g[day] = g[day] || []).push(msg);
    return g;
  }, {});

  return (
    <>
      {(callType || incomingCall) && (
        <WebRTCCallModal
          socket={socket}
          currentUser={user}
          callee={callType ? selectedUser : null}
          incomingCall={incomingCall}
          onEndCall={() => {
            setCallType(null);
            setIncomingCall(null);
          }}
        />
      )}

      <div className="chat-layout" style={{ margin: -24 }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            💬 Messages
            {conversations.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                ({conversations.length})
              </span>
            )}
          </div>

          {loadingConvs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><LoadingSpinner size="sm" /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <p style={{ margin: 0 }}>No conversations yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Go to a user's profile → "Send Message"</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.other_user_id}
                className={`chat-contact ${selectedUser?.other_user_id === conv.other_user_id ? 'active' : ''}`}
                onClick={() => openChat(conv)}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <UserAvatar src={conv.other_user_avatar} name={conv.other_user_name} size={42} />
                  {/* Online dot */}
                  {onlineUsers.has(String(conv.other_user_id)) && (
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 11, height: 11, borderRadius: '50%',
                      background: '#10b981', border: '2px solid var(--bg-secondary)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div className="chat-contact-name">{conv.other_user_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {timeAgo(conv.last_message_time)}
                    </div>
                  </div>
                  <div className="chat-contact-last">{conv.last_message || 'Start a conversation!'}</div>
                  {conv.unread_count > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                      background: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, marginTop: 2,
                    }}>{conv.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <main className="chat-main">
          {!selectedUser ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 72 }}>💬</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Select a conversation</div>
              <div style={{ fontSize: 14 }}>Or visit a user profile and click "Send Message"</div>
            </div>
          ) : (
            <>
              {/* ── Header ──────────────────────────────────────────────── */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ position: 'relative' }}>
                  <UserAvatar src={selectedUser.other_user_avatar} name={selectedUser.other_user_name} size={42} />
                  {isOnline && (
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 12, height: 12, borderRadius: '50%',
                      background: '#10b981', border: '2px solid var(--bg-primary)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {selectedUser.other_user_name}
                  </div>
                  {isTyping ? (
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontStyle: 'italic' }}>typing…</div>
                  ) : (
                    <div style={{ fontSize: 12, color: isOnline ? '#10b981' : 'var(--text-muted)', fontWeight: isOnline ? 600 : 400 }}>
                      {isOnline ? '● Online' : 'Offline'}
                    </div>
                  )}
                </div>

                {/* Call buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { icon: '📞', type: 'audio', title: 'Voice call', hoverBg: '#10b981' },
                    { icon: '📹', type: 'video', title: 'Video call', hoverBg: 'var(--primary)' },
                  ].map(({ icon, type, title, hoverBg }) => (
                    <button
                      key={type}
                      onClick={() => setCallType(type)}
                      title={title}
                      style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    >{icon}</button>
                  ))}
                </div>
              </div>

              {/* ── Messages ─────────────────────────────────────────────── */}
              <div className="chat-messages">
                {loadingMsgs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Start the conversation!</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Say hello to {selectedUser.other_user_name}</div>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([day, dayMsgs]) => (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                      {/* Day separator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{day}</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>

                      {dayMsgs.map(msg => {
                        const isSent = msg.sender_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`message-bubble ${isSent ? 'sent' : 'received'}`}
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setHoveredMsg(msg.id)}
                            onMouseLeave={() => setHoveredMsg(null)}
                          >
                            {!isSent && <UserAvatar src={msg.sender_avatar} name={msg.sender_name} size={28} />}
                            <div style={{ position: 'relative' }}>
                              <div className="message-content">{msg.content}</div>
                              <div className="message-time" style={{ textAlign: isSent ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isSent ? 'flex-end' : 'flex-start', gap: 4 }}>
                                <span>{formatTime(msg.created_at)}</span>
                                {isSent && (
                                  <span style={{ fontSize: 12, color: msg.is_read ? '#10b981' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                                    {msg.is_read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Delete button — only for sender, on hover */}
                            {isSent && hoveredMsg === msg.id && (
                              <>
                                {/* Invisible bridge to prevent hover loss when moving mouse to button */}
                                <div style={{ position: 'absolute', top: 0, bottom: 0, right: '100%', width: 15 }} />
                                <button
                                  onClick={() => handleDelete(msg)}
                                  title="Delete message"
                                  style={{
                                    position: 'absolute',
                                    top: '50%', transform: 'translateY(-50%)',
                                    right: 'calc(100% + 8px)',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    width: 28, height: 28,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                                    zIndex: 10,
                                  }}
                                >🗑</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="message-bubble received">
                    <div className="message-content" style={{ padding: '10px 16px' }}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {[0,1,2].map(i => (
                          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1s ${i*0.2}s infinite` }} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Input ────────────────────────────────────────────────── */}
              <div className="chat-input-area">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder={`Message ${selectedUser.other_user_name}… (Enter to send)`}
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  id="send-message-btn"
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  style={{ height: 42, borderRadius: 'var(--radius)', padding: '0 16px', flexShrink: 0 }}
                >
                  {sending ? '⏳' : '➤ Send'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }
      `}</style>
    </>
  );
};

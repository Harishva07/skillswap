/**
 * SkillSwap - Axios API Service
 * Centralized API communication layer
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =============================================
// AUTH ENDPOINTS
// =============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// =============================================
// USER ENDPOINTS
// =============================================
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMatches: (params) => api.get('/users/matches', { params }),
  getDashboard: () => api.get('/users/dashboard'),
  getMySkills: () => api.get('/users/my-skills'),
  addSkill: (data) => api.post('/users/skills', data),
  removeSkill: (id) => api.delete(`/users/skills/${id}`),
};

// =============================================
// SKILLS ENDPOINTS
// =============================================
export const skillsAPI = {
  getAll: (params) => api.get('/skills', { params }),
  getPopular: () => api.get('/skills/popular'),
  getById: (id) => api.get(`/skills/${id}`),
  create: (data) => api.post('/skills', data),
  update: (id, data) => api.put(`/skills/${id}`, data),
  delete: (id) => api.delete(`/skills/${id}`),
};

// =============================================
// EXCHANGE ENDPOINTS
// =============================================
export const exchangeAPI = {
  getAll: (params) => api.get('/exchanges', { params }),
  getById: (id) => api.get(`/exchanges/${id}`),
  create: (data) => api.post('/exchanges', data),
  updateStatus: (id, status) => api.patch(`/exchanges/${id}/status`, { status }),
  delete: (id) => api.delete(`/exchanges/${id}`),
};

// =============================================
// MESSAGE ENDPOINTS
// =============================================
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, params) => api.get(`/messages/${userId}`, { params }),
  send: (data) => api.post('/messages', data),
  delete: (id) => api.delete(`/messages/${id}`),
  getUnreadCount: () => api.get('/messages/unread/count'),
};

// =============================================
// REVIEW ENDPOINTS
// =============================================
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  createDirect: (data) => api.post('/reviews/direct', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  getMyReviewFor: (userId) => api.get(`/reviews/my-review-for/${userId}`),
  getUserReviews: (userId, params) => api.get(`/reviews/user/${userId}`, { params }),
  getMyReviews: () => api.get('/reviews/my-reviews'),
};

// =============================================
// NOTIFICATION ENDPOINTS
// =============================================
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// =============================================
// ADMIN ENDPOINTS
// =============================================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserBlock: (id, block) => api.patch(`/admin/users/${id}/block`, { block }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getSkills: () => api.get('/admin/skills'),
  getExchanges: (params) => api.get('/admin/exchanges', { params }),
  getLogs: () => api.get('/admin/logs'),
};

// =============================================
// AI ENDPOINTS
// =============================================
export const aiAPI = {
  autocomplete: (q, limit = 8) => api.get('/ai/skills/autocomplete', { params: { q, limit } }),
  getAIMatches: (params) => api.get('/ai/matches', { params }),
  getRecommendations: () => api.get('/ai/recommendations'),
  getLearningPath: (skill, skillId) => api.get('/ai/learning-path', { params: { skill, skillId } }),
  suggestCategory: (skill) => api.get('/ai/suggest-category', { params: { skill } }),
  refreshEmbeddings: () => api.post('/ai/embeddings/refresh'),
};

export default api;

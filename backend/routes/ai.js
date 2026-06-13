/**
 * SkillSwap AI - AI Routes
 * All AI-powered endpoints under /api/ai
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');

const {
  getAutocomplete,
  getAIMatches,
  getRecommendations,
  getLearningPathSuggestions,
  refreshEmbeddings,
  suggestSkillCategory,
} = require('../controllers/aiController');

const autocompleteLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many autocomplete requests. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/skills/autocomplete', auth, autocompleteLimit, getAutocomplete);
router.get('/matches', auth, aiLimit, getAIMatches);
router.get('/recommendations', auth, aiLimit, getRecommendations);
router.get('/learning-path', auth, aiLimit, getLearningPathSuggestions);
router.get('/suggest-category', auth, suggestSkillCategory);
router.post('/embeddings/refresh', auth, adminAuth, refreshEmbeddings);

module.exports = router;

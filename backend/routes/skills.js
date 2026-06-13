const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { getSkills, getPopularSkills, getSkillById, createSkill, updateSkill, deleteSkill } = require('../controllers/skillController');

router.get('/', auth, getSkills);
router.get('/popular', auth, getPopularSkills);
router.get('/:id', auth, getSkillById);
router.post('/', auth, createSkill);            // Any user can suggest
router.put('/:id', auth, adminAuth, updateSkill);   // Admin only
router.delete('/:id', auth, adminAuth, deleteSkill); // Admin only

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getUsers, getUserById, updateProfile, uploadAvatar,
  getMatches, getDashboard, addUserSkill, removeUserSkill, getMySkills
} = require('../controllers/userController');

router.get('/', auth, getUsers);
router.get('/dashboard', auth, getDashboard);
router.get('/matches', auth, getMatches);
router.get('/my-skills', auth, getMySkills);
router.put('/profile', auth, updateProfile);
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);
router.post('/skills', auth, addUserSkill);
router.delete('/skills/:id', auth, removeUserSkill);
router.get('/:id', auth, getUserById);

module.exports = router;

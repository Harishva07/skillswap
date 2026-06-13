const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getPlatformStats, getAllUsers, toggleUserBlock, deleteUser,
  getAllSkills, getAllExchanges, getAdminLogs
} = require('../controllers/adminController');

// All admin routes require auth + adminAuth
router.use(auth, adminAuth);

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/block', toggleUserBlock);
router.delete('/users/:id', deleteUser);
router.get('/skills', getAllSkills);
router.get('/exchanges', getAllExchanges);
router.get('/logs', getAdminLogs);

module.exports = router;

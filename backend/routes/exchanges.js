const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getExchanges, createExchange, updateExchangeStatus, getExchangeById, deleteExchange } = require('../controllers/exchangeController');

router.get('/', auth, getExchanges);
router.post('/', auth, createExchange);
router.get('/:id', auth, getExchangeById);
router.patch('/:id/status', auth, updateExchangeStatus);
router.delete('/:id', auth, deleteExchange);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getWeightLogs, addWeight, deleteWeightLog } = require('../controllers/tracking.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getWeightLogs);
router.post('/', protect, addWeight);
router.delete('/:id', protect, deleteWeightLog);

module.exports = router;
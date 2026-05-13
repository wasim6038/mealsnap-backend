const express = require('express');
const router = express.Router();
const { getWaterLogs, addWater, deleteWaterLog, updateWaterGoal } = require('../controllers/tracking.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getWaterLogs);
router.post('/', protect, addWater);
router.delete('/:id', protect, deleteWaterLog);
router.put('/goal', protect, updateWaterGoal);

module.exports = router;
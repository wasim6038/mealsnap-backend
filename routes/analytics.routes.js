const express = require('express');
const router = express.Router();
const { getAnalytics, getDailyTotals } = require('../controllers/tracking.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAnalytics);
router.get('/daily', protect, getDailyTotals);

module.exports = router;
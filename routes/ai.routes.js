const express = require('express');
const router = express.Router();
const ai = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/chat', protect, ai.chat);
router.post('/meal-plan', protect, ai.generateMealPlan);
router.get('/daily-tip', protect, ai.getDailyTip);
router.post('/analyze-food', protect, ai.analyzeFood);
router.get('/history', protect, ai.getHistory);

module.exports = router;
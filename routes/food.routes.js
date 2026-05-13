const express = require('express');
const router = express.Router();
const food = require('../controllers/food.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/search', protect, food.searchFood);
router.get('/suggestions', protect, food.getSuggestions);
router.get('/:id', protect, food.getFoodById);

module.exports = router;
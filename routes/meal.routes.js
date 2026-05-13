const express = require('express');
const router = express.Router();
const meal = require('../controllers/meal.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, meal.getMeals);
router.get('/summary', protect, meal.getDailySummary);
router.post('/', protect, meal.addMeal);
router.put('/:id', protect, meal.updateMeal);
router.delete('/:id', protect, meal.deleteMeal);
router.put('/:id/favorite', protect, meal.toggleFavorite);

module.exports = router;
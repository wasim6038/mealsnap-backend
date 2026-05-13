const Meal = require('../models/Meal.model');
const User = require('../models/User.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get meals (with date filter)
exports.getMeals = asyncHandler(async (req, res) => {
  const { date, category, page = 1, limit = 50 } = req.query;

  const userId = { user: req.user._id };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    userId.loggedAt = { $gte: start, $lte: end };
  }

  if (category) userId.category = category;

  const total = await Meal.countDocuments(userId);
  const meals = await Meal.find(userId)
    .sort({ loggedAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    count: meals.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    meals,
  });
});

// Add meal
exports.addMeal = asyncHandler(async (req, res) => {
  const meal = await Meal.create({ ...req.body, user: req.user._id });

  // Update streak
  await updateStreak(req.user._id);

  res.status(201).json({ success: true, message: 'Meal logged', meal });
});

// Update meal
exports.updateMeal = asyncHandler(async (req, res, next) => {
  let meal = await Meal.findById(req.params.id);

  if (!meal) return next(new ErrorResponse('Meal not found', 404));
  if (meal.user.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  meal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, message: 'Meal updated', meal });
});

// Delete meal
exports.deleteMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);

  if (!meal) return next(new ErrorResponse('Meal not found', 404));
  if (meal.user.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  await meal.deleteOne();
  res.json({ success: true, message: 'Meal deleted' });
});

// Get today's summary
exports.getDailySummary = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const meals = await Meal.find({
    user: req.user._id,
    loggedAt: { $gte: start, $lte: end },
  });

  const summary = meals.reduce(
    (acc, m) => {
      acc.calories += m.calories;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
      acc.fiber += m.fiber;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  // By category
  const byCategory = {};
  meals.forEach((m) => {
    if (!byCategory[m.category]) byCategory[m.category] = { calories: 0, count: 0 };
    byCategory[m.category].calories += m.calories;
    byCategory[m.category].count += 1;
  });

  const user = req.user;
  summary.remaining = Math.max(0, (user.dailyCalorieTarget || 2000) - summary.calories);
  summary.calorieTarget = user.dailyCalorieTarget;
  summary.proteinTarget = user.dailyProteinTarget;
  summary.carbsTarget = user.dailyCarbsTarget;
  summary.fatTarget = user.dailyFatTarget;
  summary.mealCount = meals.length;
  summary.byCategory = byCategory;

  res.json({ success: true, summary });
});

// Toggle favorite
exports.toggleFavorite = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findOne({ _id: req.params.id, user: req.user._id });
  if (!meal) return next(new ErrorResponse('Meal not found', 404));

  meal.isFavorite = !meal.isFavorite;
  await meal.save();

  res.json({ success: true, message: meal.isFavorite ? 'Added to favorites' : 'Removed from favorites', meal });
});

// ─── Helper: update daily streak ─────────────────────────────────────────────
const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLogged = user.lastLoggedDate ? new Date(user.lastLoggedDate) : null;
  if (lastLogged) lastLogged.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!lastLogged || lastLogged.getTime() < yesterday.getTime()) {
    // Missed a day or first time
    user.currentStreak = 1;
  } else if (lastLogged.getTime() === yesterday.getTime()) {
    // Logged yesterday
    user.currentStreak += 1;
  }
  // If lastLogged === today, don't change streak

  user.longestStreak = Math.max(user.currentStreak, user.longestStreak);
  user.lastLoggedDate = today;
  user.totalPoints += 10; // 10 points per meal logged

  // Level up every 500 points
  user.level = Math.floor(user.totalPoints / 500) + 1;

  await user.save({ validateBeforeSave: false });
};
const mongoose = require('mongoose');
const Meal = require('../models/meal.model');
const { Water, Weight } = require('../models/secondary.models');

/**
 * Get daily/weekly/monthly nutrition analytics for a user
 */
const getDailyAnalytics = async (userId, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const uid = new mongoose.Types.ObjectId(userId);

  // ─── Meal aggregation ─────────────────────────────────────────────────
  const mealStats = await Meal.aggregate([
    { $match: { user: uid, loggedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
        totalCalories: { $sum: '$calories' },
        totalProtein: { $sum: '$protein' },
        totalCarbs: { $sum: '$carbs' },
        totalFat: { $sum: '$fat' },
        mealCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ─── Water aggregation ────────────────────────────────────────────────
  const waterStats = await Water.aggregate([
    { $match: { user: uid, loggedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt' } },
        totalWater: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ─── Category breakdown ───────────────────────────────────────────────
  const categoryBreakdown = await Meal.aggregate([
    { $match: { user: uid, loggedAt: { $gte: since } } },
    {
      $group: {
        _id: '$category',
        totalCalories: { $sum: '$calories' },
        count: { $sum: 1 },
      },
    },
  ]);

  // ─── Summary stats ────────────────────────────────────────────────────
  const totalMeals = mealStats.reduce((acc, d) => acc + d.mealCount, 0);
  const totalCaloriesAll = mealStats.reduce((acc, d) => acc + d.totalCalories, 0);
  const avgCalories = mealStats.length > 0 ? Math.round(totalCaloriesAll / mealStats.length) : 0;

  // ─── Weight change ────────────────────────────────────────────────────
  const weights = await Weight.find({ user: uid, loggedAt: { $gte: since } }).sort({ loggedAt: 1 });
  const weightChange = weights.length >= 2
    ? parseFloat((weights[weights.length - 1].weight - weights[0].weight).toFixed(1))
    : 0;

  return {
    mealStats,
    waterStats,
    categoryBreakdown,
    totalMeals,
    avgCalories,
    weightChange,
    days,
  };
};

/**
 * Get macro totals for a specific date
 */
const getDailyTotals = async (userId, date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const uid = new mongoose.Types.ObjectId(userId);

  const [meals, water] = await Promise.all([
    Meal.aggregate([
      { $match: { user: uid, loggedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          calories: { $sum: '$calories' },
          protein: { $sum: '$protein' },
          carbs: { $sum: '$carbs' },
          fat: { $sum: '$fat' },
          fiber: { $sum: '$fiber' },
          count: { $sum: 1 },
        },
      },
    ]),
    Water.aggregate([
      { $match: { user: uid, loggedAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    calories: meals[0]?.calories || 0,
    protein: meals[0]?.protein || 0,
    carbs: meals[0]?.carbs || 0,
    fat: meals[0]?.fat || 0,
    fiber: meals[0]?.fiber || 0,
    mealCount: meals[0]?.count || 0,
    water: water[0]?.total || 0,
  };
};

module.exports = { getDailyAnalytics, getDailyTotals };
const { Water, Weight } = require('../models/secondary.models');
const User = require('../models/User.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { getDailyAnalytics, getDailyTotals } = require('../services/analytics.service');

// ═════════════ WATER CONTROLLER  ════════════════════
exports.getWaterLogs = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const id = { user: req.user._id };

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    id.loggedAt = { $gte: start, $lte: end };
  }

  const logs = await Water.find(id).sort({ loggedAt: -1 }).limit(100);
  const totalToday = logs.reduce((acc, l) => acc + l.amount, 0);

  res.json({
    success: true,
    logs,
    totalToday,
    goal: req.user.dailyWaterTarget || 2500,
  });
});

exports.addWater = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;

  if (!amount || amount <= 0) {
    throw new ErrorResponse('Amount must be positive', 400);
  }

  const result = await Water.create({ user: req.user._id, amount, note });
  res.status(201).json({ success: true, message: 'Water logged', result });
});

exports.deleteWaterLog = asyncHandler(async (req, res, next) => {
  const result = await Water.findOne({ _id: req.params.id, user: req.user._id });
  if (!result) return next(new ErrorResponse('Result not found', 404));
  await result.deleteOne();
  res.json({ success: true, message: 'Water log deleted' });
});

exports.updateWaterGoal = asyncHandler(async (req, res) => {
  const { goal } = req.body;
  await User.findByIdAndUpdate(req.user._id, { dailyWaterTarget: goal });
  res.json({ success: true, message: 'Water goal updated' });
});

// ═════════════ WEIGHT CONTROLLER  ════════════════════
exports.getWeightLogs = asyncHandler(async (req, res) => {
  const { limit = 30, days } = req.query;
  const id = { user: req.user._id };

  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    id.loggedAt = { $gte: since };
  }

  const result = await Weight.find(id).sort({ loggedAt: -1 }).limit(parseInt(limit));
  res.json({ success: true, count: result.length, result });
});

exports.addWeight = asyncHandler(async (req, res) => {
  const { weight, note } = req.body;

  if (!weight || weight <= 0) {
    throw new ErrorResponse('Weight must be positive', 400);
  }

  // Compute BMI
  const user = req.user;
  let bmi = null;
  if (user.height) {
    const hM = user.height / 100;
    bmi = parseFloat((weight / (hM * hM)).toFixed(1));
  }

  const result = await Weight.create({ user: req.user._id, weight, bmi, note });

  // Update user's current weight
  await User.findByIdAndUpdate(req.user._id, { weight, bmi });

  res.status(201).json({ success: true, message: 'Weight logged', result });
});

exports.deleteWeightLog = asyncHandler(async (req, res, next) => {
  const result = await Weight.findOne({ _id: req.params.id, user: req.user._id });
  if (!result) return next(new ErrorResponse('Result not found', 404));
  await result.deleteOne();
  res.json({ success: true, message: 'Weight log deleted' });
});

// ═════════════ ANALYTICS CONTROLLER  ════════════════════
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { period = 7 } = req.query;
  const data = await getDailyAnalytics(req.user._id, parseInt(period));
  res.json({ success: true, ...data });
});

exports.getDailyTotals = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const totals = await getDailyTotals(req.user._id, date ? new Date(date) : new Date());
  res.json({ success: true, totals });
});
const User = require('../models/user.model');
const Meal = require('../models/meal.model');
const { Water, Weight } = require('../models/secondary.models');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    premiumUsers,
    activeUsers,
    newUsersMonth,
    totalMeals,
    mealsThisMonth,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ plan: 'premium' }),
    User.countDocuments({ lastActive: { $gte: last7 } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Meal.countDocuments(),
    Meal.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  // User signups per day (last 7 days)
  const signupTrend = await User.aggregate([
    { $match: { createdAt: { $gte: last7 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      activeUsers,
      newUsersMonth,
      totalMeals,
      mealsThisMonth,
      signupTrend,
    },
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, plan, isBlocked } = req.query;
  const filter = { role: 'user' };

  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  if (plan) filter.plan = plan;
  if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password -refreshToken -resetPasswordToken')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / limit), users });
});

exports.toggleBlockUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse('User not found', 404));
  if (user.role === 'admin') return next(new ErrorResponse('Cannot block admin', 400));

  user.isBlocked = !user.isBlocked;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: user.isBlocked ? 'User blocked' : 'User unblocked',
    user,
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse('User not found', 404));
  if (user.role === 'admin') return next(new ErrorResponse('Cannot delete admin', 400));

  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

exports.updateUserPlan = asyncHandler(async (req, res, next) => {
  const { plan, planExpiresAt } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { plan, planExpiresAt },
    { new: true }
  );
  if (!user) return next(new ErrorResponse('User not found', 404));
  res.json({ success: true, message: 'Plan updated', user });
});
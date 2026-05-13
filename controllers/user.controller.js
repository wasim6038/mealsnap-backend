const User = require('../models/user.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name', 'gender', 'age', 'height', 'weight', 'targetWeight',
    'goal', 'activityLevel', 'dietType',
    'dailyCalorieTarget', 'dailyProteinTarget', 'dailyCarbsTarget',
    'dailyFatTarget', 'dailyWaterTarget',
    'notifications', 'preferredLanguage',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findById(req.user._id);
  Object.assign(user, updates);
  await user.save();

  res.json({ success: true, message: 'Profile updated', user });
});

exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Please upload an image', 400));

  const avatarUrl = req.file.path || `/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatarUrl },
    { new: true }
  );

  res.json({ success: true, message: 'Avatar updated', avatar: user.avatar });
});

exports.getUserStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'currentStreak longestStreak totalPoints level badges plan lastLoggedDate bmi bmr tdee'
  );
  res.json({ success: true, stats: user });
});

exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(password))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  await User.findByIdAndDelete(req.user._id);
  res.json({ success: true, message: 'Account deleted successfully' });
});
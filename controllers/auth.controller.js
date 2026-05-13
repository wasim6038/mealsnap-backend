const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const sendToken = require('../utils/sendToken');
const { sendEmail, emailTemplates } = require('../services/email.service');

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, gender, age, height, weight, goal, activityLevel } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) return next(new ErrorResponse('Email already registered', 400));

  const user = await User.create({
    name,
    email,
    password,
    gender,
    age,
    height,
    weight,
    goal: goal || 'maintain',
    activityLevel: activityLevel || 'moderately_active',
  });

  // Send welcome email (non-blocking)
  try {
    const template = emailTemplates.welcome(user.name);
    await sendEmail({ to: user.email, ...template });
  } catch { }

  await sendToken(user, 201, res, 'Registration successful');
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (user.isBlocked) {
    return next(new ErrorResponse('Your account has been suspended. Contact support.', 403));
  }

  await sendToken(user, 200, res, 'Login successful');
});

exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  res.json({ success: true, message: 'Logged out successfully' });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// Refresh access token
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new ErrorResponse('Refresh token required', 400));

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return next(new ErrorResponse('Invalid refresh token', 401));
    }

    const newAccessToken = user.getSignedJWT();
    const newRefreshToken = user.getRefreshToken();
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return next(new ErrorResponse('Refresh token expired, please login again', 401));
  }
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    const template = emailTemplates.resetPassword(user.name, resetUrl);
    await sendEmail({ to: user.email, ...template });
    res.json({ success: true, message: 'Password reset email sent' });
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorResponse('Invalid or expired reset token', 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await sendToken(user, 200, res, 'Password reset successful');
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  await sendToken(user, 200, res, 'Password updated successfully');
});
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// ─── Protect routes (require valid JWT) ───────────────────────────────────────
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return next(new ErrorResponse('User not found', 401));
    if (user.isBlocked) return next(new ErrorResponse('Your account has been suspended', 403));

    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch {
    return next(new ErrorResponse('Token is invalid or expired', 401));
  }
});

// ─── Restrict to roles ────────────────────────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Role '${req.user.role}' is not authorized for this route`, 403));
    }
    next();
  };
};

// ─── Optional auth (doesn't fail if no token) ─────────────────────────────────
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch { }
  }
  next();
});
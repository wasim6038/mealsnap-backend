const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: null,
    },

    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    age: { type: Number, min: 10, max: 120 },
    height: { type: Number, min: 50, max: 300 }, // cm
    weight: { type: Number, min: 20, max: 500 },  // kg
    targetWeight: { type: Number },

    goal: {
      type: String,
      enum: ['weight_loss', 'weight_gain', 'maintain'],
      default: 'maintain',
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
      default: 'moderately_active',
    },
    dietType: {
      type: String,
      enum: ['standard', 'vegetarian', 'vegan', 'keto', 'paleo', 'indian'],
      default: 'standard',
    },

    dailyCalorieTarget: { type: Number, default: 2000 },
    dailyProteinTarget: { type: Number, default: 150 },  // g
    dailyCarbsTarget: { type: Number, default: 250 },    // g
    dailyFatTarget: { type: Number, default: 65 },       // g
    dailyWaterTarget: { type: Number, default: 2500 },   // ml

    bmi: { type: Number },
    bmr: { type: Number },
    tdee: { type: Number },

    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLoggedDate: { type: Date },
    totalPoints: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String }],

    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    planExpiresAt: { type: Date },

    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: { type: String, select: false },

    isBlocked: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },

    notifications: {
      mealReminders: { type: Boolean, default: true },
      waterReminders: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
    },
    preferredLanguage: { type: String, default: 'en' },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ─── Pre-save: hash password & compute stats ──────────────────────────────────
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified('weight') || this.isModified('height') || this.isModified('age') || this.isModified('gender')) {
    this._computeStats();
  }

  next();
});

// ─── Compute BMI, BMR, TDEE ───────────────────────────────────────────────────
userSchema.methods._computeStats = function () {
  if (this.height && this.weight) {
    const hM = this.height / 100;
    this.bmi = parseFloat((this.weight / (hM * hM)).toFixed(1));
  }

  if (this.age && this.height && this.weight && this.gender) {
    // Mifflin-St Jeor BMR
    if (this.gender === 'male') {
      this.bmr = Math.round(10 * this.weight + 6.25 * this.height - 5 * this.age + 5);
    } else {
      this.bmr = Math.round(10 * this.weight + 6.25 * this.height - 5 * this.age - 161);
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };
    this.tdee = Math.round(this.bmr * (activityMultipliers[this.activityLevel] || 1.55));

    // Auto-set calorie target based on goal
    if (this.goal === 'weight_loss') this.dailyCalorieTarget = Math.round(this.tdee * 0.8);
    else if (this.goal === 'weight_gain') this.dailyCalorieTarget = Math.round(this.tdee * 1.15);
    else this.dailyCalorieTarget = this.tdee;
  }
};

// ─── Compare password ─────────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Sign JWT ─────────────────────────────────────────────────────────────────
userSchema.methods.getSignedJWT = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

// ─── Password reset token ─────────────────────────────────────────────────────
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
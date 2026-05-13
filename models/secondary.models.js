const mongoose = require('mongoose');

// ─── Water Schema ─────────────────────────────────────────────────────────────
const waterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },  // ml
    loggedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 100 },
  },
  { timestamps: true }
);
waterSchema.index({ user: 1, loggedAt: -1 });

// ─── Weight Schema ─────────────────────────────────────────────────────────────
const weightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weight: { type: Number, required: true, min: 20, max: 500 }, // kg
    bmi: { type: Number },
    loggedAt: { type: Date, default: Date.now },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);
weightSchema.index({ user: 1, loggedAt: -1 });

// ─── Notification Schema ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['meal_reminder', 'water_reminder', 'streak', 'achievement', 'system', 'report'],
      default: 'system',
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// ─── AI Recommendation Schema ────────────────────────────────────────────────────────
const aiRecommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['daily_tip', 'meal_plan', 'diet_analysis', 'chat'], required: true },
    prompt: { type: String },
    response: { type: String, required: true },
    planType: { type: String }, // weight_loss, muscle_gain, vegetarian, vegan, indian
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = {
  Water: mongoose.model('Water', waterSchema),
  Weight: mongoose.model('Weight', weightSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  AIRecommendation: mongoose.model('AIRecommendation', aiRecommendationSchema),
};
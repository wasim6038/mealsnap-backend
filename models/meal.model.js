const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Meal name is required'],
      trim: true,
      maxlength: [100, 'Meal name too long'],
    },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snacks'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'g', enum: ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'serving'] },

    // ─── Nutrition per entry ──────────────────────────────────────────────
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: 0, min: 0 },   // g
    carbs: { type: Number, default: 0, min: 0 },      // g
    fat: { type: Number, default: 0, min: 0 },        // g
    fiber: { type: Number, default: 0, min: 0 },      // g
    sugar: { type: Number, default: 0, min: 0 },      // g
    sodium: { type: Number, default: 0, min: 0 },     // mg

    foodId: { type: String }, // external API food ID
    image: { type: String },
    notes: { type: String, maxlength: 300 },
    loggedAt: { type: Date, default: Date.now },
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Compound index for efficient daily queries ───────────────────────────────
mealSchema.index({ user: 1, loggedAt: -1 });
mealSchema.index({ user: 1, category: 1, loggedAt: -1 });

module.exports = mongoose.model('Meal', mealSchema);
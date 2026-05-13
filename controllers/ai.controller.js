const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AIRecommendation } = require('../models/secondary.models');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { getDailyTotals } = require('../services/analytics.service');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  // model: 'gemini-2.5-flash',
  model: 'gemini-3.1-flash-lite',
});

// ─── Build user context for prompts ──────────────────────────────────────────
const buildUserContext = (user, dailyTotals) => {
  return `User Profile:
- Name: ${user.name}
- Age: ${user.age || 'unknown'}, Gender: ${user.gender || 'unknown'}
- Height: ${user.height || 'unknown'} cm, Weight: ${user.weight || 'unknown'} kg
- Goal: ${user.goal?.replace('_', ' ') || 'maintain weight'}
- Activity level: ${user.activityLevel?.replace('_', ' ') || 'moderately active'}
- Diet type: ${user.dietType || 'standard'}
- Daily calorie target: ${user.dailyCalorieTarget || 2000} kcal
- Daily protein target: ${user.dailyProteinTarget || 150}g
- BMI: ${user.bmi || 'unknown'}, BMR: ${user.bmr || 'unknown'} kcal
- Today consumed: ${dailyTotals.calories} kcal (protein: ${dailyTotals.protein}g, carbs: ${dailyTotals.carbs}g, fat: ${dailyTotals.fat}g)
- Water today: ${dailyTotals.water}ml
- Current streak: ${user.currentStreak || 0} days`;
};

// AI nutrition chat
exports.chat = asyncHandler(async (req, res, next) => {
  const { message, history = [] } = req.body;

  if (!message?.trim()) return next(new ErrorResponse('Message is required', 400));

  const dailyTotals = await getDailyTotals(req.user._id);
  const userContext = buildUserContext(req.user, dailyTotals);

  const prompt = `
    You are NutriAI, an expert nutrition and fitness assistant.

    ${userContext}

    Conversation History:
    ${history.map((m) => `${m.role}: ${m.content}`).join('\n')}

    User: ${message}

    Rules:
    - Be personalized
    - Be concise
    - Keep under 150 words
    - Use emojis sparingly
    - Give evidence-based advice
  `;

  const result = await model.generateContent(prompt);

  const reply = result.response.text();

  // Save to DB
  await AIRecommendation.create({
    user: req.user._id,
    type: 'chat',
    prompt: message,
    response: reply,
  });

  res.json({ success: true, reply });
});

// Generate meal plan
exports.generateMealPlan = asyncHandler(async (req, res) => {
  const { planType = 'weight_loss', days = 1 } = req.body;

  const dailyTotals = await getDailyTotals(req.user._id);
  const userContext = buildUserContext(req.user, dailyTotals);

  const prompt = `Generate a ${days}-day ${planType.replace('_', ' ')} meal plan.
${userContext}

Respond ONLY with a valid JSON array. Each day object has:
{
  "day": 1,
  "meals": [
    { "category": "breakfast|lunch|dinner|snacks", "name": "meal name with emoji", "description": "brief description", "calories": 350, "protein": 25, "carbs": 40, "fat": 12, "tips": "quick tip" }
  ],
  "totalCalories": 1800,
  "summary": "one-line day summary"
}
No markdown, no explanation. Only the JSON array.`;

  const result = await model.generateContent(prompt);

  let plan;
  try {
    const text = result.response?.text?.replace(/```json|```/g, '').trim();
    plan = JSON.parse(text);
  } catch {
    plan = [{ day: 1, meals: [], summary: 'Could not parse plan, please retry.' }];
  }

  await AIRecommendation.create({
    user: req.user._id,
    type: 'meal_plan',
    response: JSON.stringify(plan),
    planType,
  });

  res.json({ success: true, plan, planType });
});

// Get daily tip
exports.getDailyTip = asyncHandler(async (req, res) => {
  const dailyTotals = await getDailyTotals(req.user._id);
  const userContext = buildUserContext(req.user, dailyTotals);

  const prompt = `
  ${userContext}

  Give one personalized nutrition tip.

  Rules:
  - Under 60 words
  - Actionable
  - Personalized
  `;

  const result = await model.generateContent(prompt);

  const tip = result.response.text() || "Stay hydrated and track all your meals today!";

  res.json({ success: true, tip });
});

// Analyze meal photo (OCR/description)
exports.analyzeFood = asyncHandler(async (req, res, next) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) return next(new ErrorResponse('Image data is required', 400));

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const prompt = `
    Analyze this food image.

    Respond ONLY with JSON:
    {
      "name": "food name",
      "estimatedCalories": 350,
      "protein": 25,
      "carbs": 40,
      "fat": 12,
      "servingSize": "200g",
      "confidence": "high",
      "description": "brief description"
    }
  `;

  const result = await model.generateContent([prompt, imagePart]);

  let analysis;
  try {
    const text = result.response?.text?.replace(/```json|```/g, '').trim();
    analysis = JSON.parse(text);
  } catch {
    analysis = { name: 'Unknown food', estimatedCalories: 0, confidence: 'low', description: 'Could not analyze image' };
  }

  res.json({ success: true, analysis });
});

// Get past AI recommendations
exports.getHistory = asyncHandler(async (req, res) => {
  const { type, limit = 10 } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const history = await AIRecommendation.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({ success: true, history });
});
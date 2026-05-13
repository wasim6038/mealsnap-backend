const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Search food from USDA FoodData Central
exports.searchFood = asyncHandler(async (req, res, next) => {
  const { q, pageSize = 10 } = req.query;
  if (!q) return next(new ErrorResponse('Search query is required', 400));

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return next(new ErrorResponse('Food API not configured', 503));
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize}&api_key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  const foods = (data.foods || []).map((f) => ({
    fdcId: f.fdcId,
    name: f.description,
    brand: f.brandOwner || null,
    category: f.foodCategory || null,
    nutrients: extractNutrients(f.foodNutrients || []),
    servingSize: f.servingSize || 100,
    servingSizeUnit: f.servingSizeUnit || 'g',
  }));

  res.json({ success: true, foods, total: data.totalHits });
});

// Get food details by FDC ID
exports.getFoodById = asyncHandler(async (req, res, next) => {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return next(new ErrorResponse('Food API not configured', 503));

  const url = `https://api.nal.usda.gov/fdc/v1/food/${req.params.id}?api_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return next(new ErrorResponse('Food not found', 404));

  const data = await response.json();
  res.json({
    success: true,
    food: {
      fdcId: data.fdcId,
      name: data.description,
      nutrients: extractNutrients(data.foodNutrients || []),
    },
  });
});

// Get suggested/popular foods
exports.getSuggestions = asyncHandler(async (req, res) => {
  res.json({ success: true, foods: getPopularFoods() });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NUTRIENT_MAP = {
  1008: 'calories',
  1003: 'protein',
  1005: 'carbs',
  1004: 'fat',
  1079: 'fiber',
  2000: 'sugar',
  1093: 'sodium',
};

const extractNutrients = (nutrients) => {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  nutrients.forEach((n) => {
    const key = NUTRIENT_MAP[n.nutrientId];
    if (key) result[key] = parseFloat((n.value || 0).toFixed(2));
  });
  return result;
};

const getPopularFoods = () => [
  { name: 'Chicken breast (grilled)', nutrients: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Brown rice (cooked)', nutrients: { calories: 216, protein: 5, carbs: 45, fat: 1.8 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Whole egg (boiled)', nutrients: { calories: 155, protein: 13, carbs: 1, fat: 11 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Banana', nutrients: { calories: 89, protein: 1, carbs: 23, fat: 0.3 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Greek yogurt (plain)', nutrients: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Almonds', nutrients: { calories: 579, protein: 21, carbs: 22, fat: 50 }, servingSize: 28, servingSizeUnit: 'g' },
  { name: 'Oatmeal (cooked)', nutrients: { calories: 68, protein: 2.4, carbs: 12, fat: 1.4 }, servingSize: 100, servingSizeUnit: 'g' },
  { name: 'Paneer (cottage cheese)', nutrients: { calories: 265, protein: 18, carbs: 3.6, fat: 20 }, servingSize: 100, servingSizeUnit: 'g' },
];
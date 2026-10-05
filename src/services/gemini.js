// Gemini AI Service – client-side Gemini 2.5 Flash integration with fallback
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

let genAIInstance = null;
function getGenAI() {
  if (!GEMINI_KEY) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env.local file.');
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(GEMINI_KEY);
  }
  return genAIInstance;
}

/**
 * Call Gemini with automatic model pool fallback and transient error retry
 */
export async function callGemini(contents, systemInstruction = '') {
  const genAI = getGenAI();

  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined,
      });
      const result = await model.generateContent(contents);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} error:`, err?.message || err);
      lastError = err;
      // If server busy/spiking (503/429), back off briefly before next candidate
      const isTransient = /503|429|demand|unavailable|overloaded/i.test(err?.message || '');
      if (isTransient) {
        await new Promise(r => setTimeout(r, 900));
      }
    }
  }

  throw new Error(`Gemini request failed: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Helper to extract and parse JSON from Gemini text response
 */
export function extractJSON(text, fallback = null) {
  if (!text) return fallback;
  try {
    // 1. Check for markdown json code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]);
    }
    // 2. Check for object { ... }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    // 3. Check for array [ ... ]
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error('[Gemini] JSON parse error:', err, 'Raw text was:', text);
    if (fallback !== null) return fallback;
    throw new Error('Failed to parse AI response into structured data.');
  }
}

/**
 * Analyze a product (food, cosmetic/personal care, or health supplement)
 */
export async function analyzeProductAI({ query, type = 'foods', imageBase64 = null }) {
  const parts = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
    parts.push({
      text: `Identify the exact product shown in this image. Then analyze it as a ${type} product.
Return ONLY valid JSON in this exact structure with no extra commentary:
{
  "name": "Exact Brand and Product Name",
  "healthGrade": "A",
  "summary": "Clear, concise 2-3 sentence summary evaluating safety, nutritional/ingredient quality, and key takeaways.",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "type": "Natural",
      "risk": "Brief health implication or benefits/concerns",
      "classification": "safe"
    }
  ],
  "alternatives": [
    {
      "name": "Healthier Alternative Name",
      "reason": "Why this is a better or cleaner choice"
    }
  ]
}
Note: healthGrade must be strictly one of: "A", "B", "C", "D", or "F".
classification must be strictly one of: "safe", "limited", or "harmful".
type must be strictly "Natural" or "Artificial".`,
    });
  } else {
    parts.push({
      text: `Analyze the ${type} product "${query}".
Return ONLY valid JSON in this exact structure with no extra commentary:
{
  "name": "${query}",
  "healthGrade": "A",
  "summary": "Clear, concise 2-3 sentence summary evaluating safety, nutritional/ingredient quality, and key takeaways.",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "type": "Natural",
      "risk": "Brief health implication or benefits/concerns",
      "classification": "safe"
    }
  ],
  "alternatives": [
    {
      "name": "Healthier Alternative Name",
      "reason": "Why this is a better or cleaner choice"
    }
  ]
}
Note: healthGrade must be strictly one of: "A", "B", "C", "D", or "F".
classification must be strictly one of: "safe", "limited", or "harmful".
type must be strictly "Natural" or "Artificial".`,
    });
  }

  const rawText = await callGemini(parts);
  const parsed = extractJSON(rawText);
  return parsed;
}

/**
 * Identify food items on a plate or image (multi-item detection)
 */
export async function identifyFoodItemsAI(imageBase64) {
  const parts = [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    },
    {
      text: `You are an expert culinary and nutrition specialist with deep knowledge of global and Indian cuisines.
Identify all distinct food items present on this plate or in this image.
Return ONLY a valid JSON array of strings, for example: ["Masala Dosa", "Sambar", "Coconut Chutney"].
No markdown, no explanation, only the JSON array.`,
    },
  ];

  const rawText = await callGemini(parts);
  const items = extractJSON(rawText, ['Healthy Meal Plate']);
  return Array.isArray(items) ? items : [items];
}

/**
 * Analyze nutrition for a specific food item or full plate
 */
export async function analyzeFoodNutritionAI(foodName, serving = '100 grams', isPlate = false) {
  const prompt = isPlate
    ? `Analyze the complete meal plate containing: "${foodName}".
Return ONLY valid JSON in this exact structure:
{
  "name": "Full Plate Analysis: ${foodName}",
  "healthGrade": "B",
  "summary": "Balanced meal overview highlighting macronutrient distribution and satiety.",
  "ingredients": [
    { "name": "Main Item", "type": "Natural", "risk": "Provides sustained carbohydrates and micronutrients", "classification": "safe" }
  ],
  "nutrition": {
    "serving": "${serving}",
    "calories": 480,
    "protein": 14,
    "carbs": 68,
    "fat": 16,
    "sodium": "650mg"
  },
  "alternatives": [
    { "name": "Lighter variation", "reason": "Reduces oil and increases vegetable fiber" }
  ]
}`
    : `Analyze nutritional profile for "${foodName}" for a portion of ${serving}.
Return ONLY valid JSON in this exact structure:
{
  "name": "${foodName}",
  "healthGrade": "A",
  "summary": "Nutritional summary evaluating calorie density, macronutrients, and health benefits.",
  "ingredients": [
    { "name": "Key component", "type": "Natural", "risk": "Nutrient-dense source", "classification": "safe" }
  ],
  "nutrition": {
    "serving": "${serving}",
    "calories": 210,
    "protein": 7,
    "carbs": 28,
    "fat": 8,
    "sodium": "320mg"
  },
  "alternatives": [
    { "name": "Healthier alternative", "reason": "Higher protein or lower glycemic index" }
  ]
}`;

  const rawText = await callGemini([{ text: prompt }]);
  return extractJSON(rawText);
}

/**
 * Generate AI Insight for meals (Coach advice, Improvements, Recipe ideas)
 */
export async function getAIInsightAI(foodName, insightType, nutrition) {
  const prompts = {
    coach: `As an empathetic AI Health Coach, give personalized advice (3-4 concise, uplifting sentences) about having "${foodName}" with this nutritional profile: ${JSON.stringify(nutrition)}. Offer practical eating tips.`,
    improve: `Suggest 3 realistic, healthy improvements or tweaks for a meal featuring "${foodName}". Keep each suggestion 1-2 punchy sentences.`,
    recipe: `Provide a quick, nutritious recipe or serving idea centered around "${foodName}". Include 3-4 bullet steps and healthy swaps.`,
  };

  const prompt = prompts[insightType] || prompts.coach;
  return await callGemini([{ text: prompt }]);
}

/**
 * Chat with NutriScan Assistant
 */
export async function sendChatMessageAI(messages) {
  const SYSTEM_CONTEXT = `You are NutriScan Assistant, an AI expert in nutrition, food science, cosmetic ingredient safety, and wellness.
You help users understand food labels, additives, cosmetic toxicity, macros, and healthy lifestyle choices.
You are friendly, concise, and evidence-based. Format your responses with clear markdown bullets where helpful.`;

  const genAI = getGenAI();

  // The last message is the current user message
  const lastMsg = messages[messages.length - 1];
  const lastText = (lastMsg?.content || '').trim();
  if (!lastText) return '';

  // Prepare prior history (strictly must start with 'user' and alternate)
  const priorMessages = messages.slice(0, messages.length - 1);
  const history = [];

  let firstUserFound = false;
  for (const msg of priorMessages) {
    const isUser = msg.role === 'user';
    if (!firstUserFound) {
      if (isUser) {
        firstUserFound = true;
        history.push({ role: 'user', parts: [{ text: msg.content }] });
      }
      continue;
    }

    const currentRole = isUser ? 'user' : 'model';
    const lastRoleInHistory = history[history.length - 1]?.role;

    if (currentRole !== lastRoleInHistory) {
      history.push({ role: currentRole, parts: [{ text: msg.content }] });
    }
  }

  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_CONTEXT,
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastText);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn(`[Gemini Chat] Model ${modelName} error:`, err?.message || err);
      lastError = err;
      const isTransient = /503|429|demand|unavailable|overloaded/i.test(err?.message || '');
      if (isTransient) {
        await new Promise(r => setTimeout(r, 900));
      }
    }
  }

  throw new Error(`Chat request failed: ${lastError?.message || 'Unknown error'}`);
}

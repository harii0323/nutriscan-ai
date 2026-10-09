// Gemini AI Client Service - Protected Backend API Gateway
// Client secrets and direct SDK execution removed in compliance with production security standards.
// All requests are proxied through authenticated Cloud Functions / backend endpoints.

import { auth } from '../firebaseConfig.js';

// Resolve backend URL from environment or default to relative '/api'
const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '') || '/api';

/**
 * Retrieve authorization headers with Firebase ID token if user is signed in
 */
async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // If auth state is inaccessible, proceed without header
  }
  return headers;
}

/**
 * Handle API error response with friendly user messages for standard HTTP codes
 */
async function parseErrorResponse(res, fallbackMessage) {
  const errData = await res.json().catch(() => ({}));
  if (res.status === 401) {
    return new Error(errData.error || 'Authentication required. Please sign in to access AI analysis.');
  }
  if (res.status === 403) {
    return new Error(errData.error || 'Access to this resource is forbidden.');
  }
  if (res.status === 429) {
    return new Error(errData.error || 'Rate limit reached. Please wait a moment before trying again.');
  }
  if (res.status >= 500) {
    return new Error(errData.error || 'AI service is temporarily unavailable. Please try again in a few moments.');
  }
  return new Error(errData.error || fallbackMessage || `Request failed with status ${res.status}`);
}

/**
 * Robust JSON extraction helper from AI string output
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
 * Proxies request to backend endpoint /analyzeProduct
 */
export async function analyzeProductAI({ query, type = 'foods', imageBase64 = null }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/analyzeProduct`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, type, imageBase64 }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Product analysis failed.');
  }

  return await res.json();
}

/**
 * Identify food items on a plate or image (multi-item detection)
 * Proxies request to backend endpoint /identifyFoodItems (or /identifyFood)
 */
export async function identifyFoodItemsAI(imageBase64) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/identifyFoodItems`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageBase64 }),
  });

  if (!res.ok) {
    // Fallback to /identifyFood if alternate route
    const fallbackRes = await fetch(`${BACKEND_URL}/identifyFood`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64 }),
    }).catch(() => null);

    if (fallbackRes && fallbackRes.ok) {
      const data = await fallbackRes.json();
      return Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : ['Healthy Meal Plate']);
    }

    throw await parseErrorResponse(res, 'Food item identification failed.');
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [data?.items || 'Healthy Meal Plate'];
}

/**
 * Analyze nutrition for a specific food item or full plate
 * Proxies request to backend endpoint /analyzeNutrition
 */
export async function analyzeFoodNutritionAI(foodName, serving = '100 grams', isPlate = false) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/analyzeNutrition`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ foodName, serving, isPlate }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Nutrition analysis failed.');
  }

  return await res.json();
}

/**
 * Generate AI Insight for meals (Coach advice, Improvements, Recipe ideas)
 * Proxies request to backend endpoint /aiInsight
 */
export async function getAIInsightAI(foodName, insightType, nutrition) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/aiInsight`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ foodName, insightType, nutrition }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'AI insight generation failed.');
  }

  const data = await res.json();
  return data.insight || data.message || String(data);
}

/**
 * Chat with NutriScan Assistant
 * Proxies request to backend endpoint /chat
 */
export async function sendChatMessageAI(messages) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Chat assistant failed.');
  }

  const data = await res.json();
  return data.message || data.reply || '';
}

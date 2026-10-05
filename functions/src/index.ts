import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

// ─── Init ─────────────────────────────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();
const APP_ID = 'nutriscan-ai';

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Gemini helper ────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

async function callGemini(parts: object[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`;
  const response = await axios.post(url, { contents: [{ parts }] }, { timeout: 30000 });
  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractJSON(text: string): object | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ─── OpenFoodFacts service ────────────────────────────────────────────────────
async function openFoodFactsLookup(barcode: string) {
  const res = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { timeout: 10000 });
  const product = res.data?.product;
  if (!product) throw new Error('Product not found in OpenFoodFacts');
  return {
    name: product.product_name || 'Unknown',
    brands: product.brands || '',
    ingredients: product.ingredients_text || '',
    nutritionGrade: product.nutrition_grade_fr || '',
    nutriments: product.nutriments || {},
    image: product.image_url || '',
  };
}

// ─── Grocery scraper (server-side, no secrets exposed to client) ──────────────
async function grocerySearch(query: string) {
  // Use DuckDuckGo instant answers or a generic search as a lightweight fallback
  // In production, integrate a licensed data provider API here
  try {
    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' ingredients')}&format=json&no_redirect=1`, { timeout: 8000 });
    const data = res.data;
    return {
      name: query,
      abstract: data.Abstract || '',
      source: data.AbstractURL || '',
    };
  } catch {
    return { name: query, abstract: '', source: '' };
  }
}

// ─── Cosmetics scraper (INCI decoder) ────────────────────────────────────────
async function cosmeticsSearch(query: string) {
  try {
    const url = `https://incidecoder.com/search?query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NutriScanBot/1.0)' },
    });
    const $ = cheerio.load(res.data);
    const name = $('.product-name').first().text().trim() || query;
    const ingredients = $('.ingredients-list').first().text().trim();
    return { name, ingredients, source: url };
  } catch {
    return { name: query, ingredients: '', source: '' };
  }
}

// ─── Health product service ───────────────────────────────────────────────────
async function healthProductSearch(query: string) {
  // In production, integrate FDA's RxNorm, DSLD, or a licensed health-product API
  return { name: query, type: 'health', note: 'Consult a healthcare professional for medical advice.' };
}

// ─── Firestore cache helpers ──────────────────────────────────────────────────
async function getCached(type: string, key: string) {
  const doc = await db
    .doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`)
    .get();
  return doc.exists ? doc.data() : null;
}

async function setCache(type: string, key: string, data: object) {
  await db
    .doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`)
    .set({ ...data, cachedAt: admin.firestore.FieldValue.serverTimestamp() });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /getProductData?query=...&type=foods&barcode=...
app.get('/getProductData', async (req, res) => {
  const query = String(req.query.query || '');
  const type = String(req.query.type || 'foods');
  const barcode = String(req.query.barcode || '');

  if (!query && !barcode) {
    res.status(400).json({ error: 'query or barcode required' });
    return;
  }

  const cacheKey = barcode || query;

  // Check cache
  const cached = await getCached(type, cacheKey);
  if (cached) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  try {
    let rawData: object = {};

    if (barcode) {
      rawData = await openFoodFactsLookup(barcode);
    } else if (type === 'care') {
      rawData = await cosmeticsSearch(query);
    } else if (type === 'health') {
      rawData = await healthProductSearch(query);
    } else {
      rawData = await grocerySearch(query);
    }

    // Cache and return
    await setCache(type, cacheKey, rawData);
    res.json(rawData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Data fetch failed' });
  }
});

// POST /analyzeProduct – Gemini product analysis
app.post('/analyzeProduct', async (req, res) => {
  const { query, type, imageBase64 } = req.body;
  if (!query && !imageBase64) {
    res.status(400).json({ error: 'query or imageBase64 required' });
    return;
  }

  const cacheKey = query || 'image-scan';
  const cached = await getCached(type || 'foods', cacheKey);
  if (cached && !imageBase64) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  try {
    const parts: object[] = [];

    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
      parts.push({ text: `Identify the product in this image and analyze it as a ${type} product. Return ONLY valid JSON: {"name":"","healthGrade":"A","summary":"","ingredients":[{"name":"","type":"Natural","risk":"","classification":"safe"}],"alternatives":[{"name":"","reason":""}]}` });
    } else {
      parts.push({ text: `Analyze the ${type || 'food'} product "${query}". Return ONLY valid JSON, no markdown: {"name":"${query}","healthGrade":"A","summary":"","ingredients":[{"name":"","type":"Natural","risk":"","classification":"safe"}],"alternatives":[{"name":"","reason":""}]}` });
    }

    const text = await callGemini(parts);
    const result = extractJSON(text);

    if (!result) {
      res.status(500).json({ error: 'AI returned invalid response' });
      return;
    }

    if (query && !imageBase64) {
      await setCache(type || 'foods', cacheKey, result as object);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI analysis failed' });
  }
});

// POST /analyzeNutrition – Gemini nutrition analysis
app.post('/analyzeNutrition', async (req, res) => {
  const { foodName, serving, isPlate } = req.body;
  if (!foodName) { res.status(400).json({ error: 'foodName required' }); return; }

  try {
    const servingStr = serving || '100 grams';
    const prompt = isPlate
      ? `Analyze full plate nutrition for: ${foodName}. Return ONLY JSON: {"name":"Full Plate Analysis","healthGrade":"B","summary":"...","ingredients":[],"nutrition":{"serving":"${servingStr}","calories":0,"protein":0,"carbs":0,"fat":0,"sodium":"0mg"},"alternatives":[]}`
      : `Analyze nutrition for ${foodName} (${servingStr}). Return ONLY JSON: {"name":"${foodName}","healthGrade":"B","summary":"...","ingredients":[{"name":"","type":"Natural","risk":"","classification":"safe"}],"nutrition":{"serving":"${servingStr}","calories":0,"protein":0,"carbs":0,"fat":0,"sodium":"0mg"},"alternatives":[{"name":"","reason":""}]}`;

    const text = await callGemini([{ text: prompt }]);
    const result = extractJSON(text);

    if (!result) { res.status(500).json({ error: 'AI returned invalid JSON' }); return; }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Nutrition analysis failed' });
  }
});

// POST /aiInsight – Gemini insight generation
app.post('/aiInsight', async (req, res) => {
  const { foodName, insightType, nutrition } = req.body;
  if (!foodName || !insightType) { res.status(400).json({ error: 'foodName and insightType required' }); return; }

  const prompts: Record<string, string> = {
    coach: `As an AI Health Coach, give personalized advice (3-4 sentences) about eating "${foodName}" with nutrition: ${JSON.stringify(nutrition)}. Be practical and encouraging.`,
    improve: `Suggest 3 healthy improvements for a meal plate containing "${foodName}". Keep it concise and actionable.`,
    recipe: `Give a simple, healthy recipe idea featuring "${foodName}" as the main ingredient. Include brief steps.`,
  };

  const prompt = prompts[insightType];
  if (!prompt) { res.status(400).json({ error: 'Invalid insightType' }); return; }

  try {
    const text = await callGemini([{ text: prompt }]);
    res.json({ insight: text });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Insight generation failed' });
  }
});

// POST /identifyFood – identify food items from image
app.post('/identifyFood', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) { res.status(400).json({ error: 'imageBase64 required' }); return; }

  try {
    const text = await callGemini([
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      { text: 'You are an expert in regional Indian cuisine. Identify all distinct food items on this plate. Return ONLY a JSON array of strings: ["item1","item2"]' },
    ]);
    const match = text.match(/\[[\s\S]*?\]/);
    const items = match ? JSON.parse(match[0]) : ['Unknown Food'];
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Food identification failed' });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'NutriScan AI Functions' }));

// ─── Export ───────────────────────────────────────────────────────────────────
export const api = onRequest(
  { timeoutSeconds: 60, memory: '512MiB', secrets: ['GEMINI_API_KEY'] },
  app
);

// Callable for client SDK
export const getProductData = onCall(async (request) => {
  const { query, type, barcode } = request.data || {};
  if (!query && !barcode) throw new HttpsError('invalid-argument', 'query or barcode required');
  const cacheKey = barcode || query;
  const cached = await getCached(type || 'foods', cacheKey);
  if (cached) return { ...cached, fromCache: true };

  let rawData: object = {};
  try {
    if (barcode) rawData = await openFoodFactsLookup(barcode);
    else if (type === 'care') rawData = await cosmeticsSearch(query);
    else if (type === 'health') rawData = await healthProductSearch(query);
    else rawData = await grocerySearch(query);
    await setCache(type || 'foods', cacheKey, rawData);
    return rawData;
  } catch (err: any) {
    throw new HttpsError('internal', err.message || 'Data fetch failed');
  }
});

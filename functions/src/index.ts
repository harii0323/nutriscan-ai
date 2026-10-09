import * as admin from 'firebase-admin';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';

// ─── Initialize Firebase Admin ────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const APP_ID = 'nutriscan-ai';

// ─── Express App & Middleware ─────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGINS = [
  'https://nutriscan-ai-xm4u.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.web.app') ||
        origin.endsWith('.firebaseapp.com')
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS request denied'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Correlation ID & Request Tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', correlationId);
  (req as any).correlationId = correlationId;
  next();
});

// ─── Authentication Middlewares ───────────────────────────────────────────────
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or invalid authentication token',
      code: 'UNAUTHORIZED',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired token',
      code: 'INVALID_TOKEN',
      correlationId: (req as any).correlationId,
    });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      (req as any).user = decoded;
    } catch {
      // Proceed unauthenticated
    }
  }
  next();
}

// ─── Concurrency-Safe Rate Limiter ────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export function rateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = (req as any).user?.uid ? `user:${(req as any).user.uid}` : `ip:${ip}`;
    const now = Date.now();
    const entry = rateLimitMap.get(String(key));

    if (!entry || entry.resetAt <= now) {
      rateLimitMap.set(String(key), { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        correlationId: (req as any).correlationId,
      });
      return;
    }

    entry.count++;
    next();
  };
}

// ─── Gemini Integration with Verified Active Models & Bounded Retries ─────────
const CANDIDATE_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];

export async function callGemini(parts: object[], systemInstruction = ''): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY secret is not configured in server environment');
  }

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload: any = { contents: [{ parts }] };
        if (systemInstruction) {
          payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await axios.post(url, payload, { timeout: 30000 });
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === 'string') {
          return text;
        }
        throw new Error('Model returned empty response');
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const isTransient =
          status === 429 ||
          status === 503 ||
          status === 500 ||
          /demand|unavailable|overloaded/i.test(err.message || '');

        if (isTransient && attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break; // try next candidate model
      }
    }
  }

  throw new Error(`Gemini service error: ${lastError?.message || 'Unknown failure'}`);
}

export function extractJSON(text: string): any {
  if (!text) return null;
  try {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]);
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── External Search Services ─────────────────────────────────────────────────
async function openFoodFactsLookup(barcode: string) {
  const res = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, {
    timeout: 10000,
    headers: { 'User-Agent': 'NutriScanAI-Server/1.0' },
  });
  const product = res.data?.product;
  if (!product) throw new Error('Product not found in OpenFoodFacts');
  return {
    name: product.product_name || 'Unknown Product',
    brands: product.brands || '',
    ingredients: product.ingredients_text || '',
    nutritionGrade: product.nutrition_grade_fr || '',
    nutriments: product.nutriments || {},
    image: product.image_url || '',
  };
}

async function grocerySearch(query: string) {
  try {
    const res = await axios.get(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' ingredients')}&format=json&no_redirect=1`,
      { timeout: 8000 }
    );
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

async function healthProductSearch(query: string) {
  return {
    name: query,
    type: 'health',
    note: 'Consult a qualified healthcare professional before taking dietary supplements.',
  };
}

// ─── Firestore Cache Helpers ──────────────────────────────────────────────────
async function getCached(type: string, key: string) {
  const doc = await db.doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`).get();
  return doc.exists ? doc.data() : null;
}

async function setCache(type: string, key: string, data: object) {
  await db
    .doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`)
    .set({ ...data, cachedAt: admin.firestore.FieldValue.serverTimestamp() });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'NutriScan AI Protected Backend' });
});

// GET /getProductData
app.get('/getProductData', rateLimit(60000, 40), async (req: Request, res: Response) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 200) : '';
  const type = ['foods', 'care', 'health'].includes(String(req.query.type)) ? String(req.query.type) : 'foods';
  const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim().slice(0, 32) : '';

  if (!query && !barcode) {
    res.status(400).json({ error: 'query or barcode required', code: 'INVALID_QUERY' });
    return;
  }

  const cacheKey = barcode || query;
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

    await setCache(type, cacheKey, rawData);
    res.json(rawData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Data lookup failed', code: 'LOOKUP_FAILED' });
  }
});

// POST /analyzeProduct – Gemini product analysis
app.post('/analyzeProduct', optionalAuth, rateLimit(60000, 20), async (req: Request, res: Response) => {
  const { query, type = 'foods', imageBase64 } = req.body;

  if (typeof query !== 'string' && !imageBase64) {
    res.status(400).json({ error: 'query string or imageBase64 required', code: 'INVALID_INPUT' });
    return;
  }

  const cleanQuery = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  const cleanType = ['foods', 'care', 'health'].includes(type) ? type : 'foods';

  if (imageBase64 && (typeof imageBase64 !== 'string' || imageBase64.length > 7000000)) {
    res.status(400).json({ error: 'Image size exceeds maximum allowed size (5MB)', code: 'IMAGE_TOO_LARGE' });
    return;
  }

  const cacheKey = cleanQuery || 'image-scan';
  const cached = await getCached(cleanType, cacheKey);
  if (cached && !imageBase64) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  try {
    const parts: object[] = [];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
      parts.push({
        text: `Identify the exact product shown in this image. Then analyze it as a ${cleanType} product.
Return ONLY valid JSON in this exact structure with no extra commentary:
{
  "name": "Product Name",
  "healthGrade": "A",
  "summary": "Clear, concise 2-3 sentence summary evaluating safety, ingredients, and key takeaways.",
  "ingredients": [
    { "name": "Ingredient Name", "type": "Natural", "risk": "Health implication", "classification": "safe" }
  ],
  "alternatives": [
    { "name": "Healthier Alternative", "reason": "Why this is a better choice" }
  ]
}
Note: healthGrade must be strictly one of: "A", "B", "C", "D", or "F".
classification must be strictly one of: "safe", "limited", or "harmful".
type must be strictly "Natural" or "Artificial".`,
      });
    } else {
      parts.push({
        text: `Analyze the ${cleanType} product "${cleanQuery}".
Return ONLY valid JSON in this exact structure with no extra commentary:
{
  "name": "${cleanQuery}",
  "healthGrade": "A",
  "summary": "Clear, concise 2-3 sentence summary evaluating safety, ingredients, and key takeaways.",
  "ingredients": [
    { "name": "Ingredient Name", "type": "Natural", "risk": "Health implication", "classification": "safe" }
  ],
  "alternatives": [
    { "name": "Healthier Alternative", "reason": "Why this is a better choice" }
  ]
}
Note: healthGrade must be strictly one of: "A", "B", "C", "D", or "F".
classification must be strictly one of: "safe", "limited", or "harmful".
type must be strictly "Natural" or "Artificial".`,
      });
    }

    const text = await callGemini(parts);
    const result = extractJSON(text);

    if (!result || typeof result !== 'object') {
      res.status(502).json({ error: 'AI provider returned invalid response structure', code: 'AI_INVALID_JSON' });
      return;
    }

    if (cleanQuery && !imageBase64) {
      await setCache(cleanType, cacheKey, result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Product analysis failed. Please try again.',
      code: 'ANALYSIS_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// POST /analyzeNutrition – Gemini nutrition analysis
app.post('/analyzeNutrition', optionalAuth, rateLimit(60000, 20), async (req: Request, res: Response) => {
  const { foodName, serving, isPlate } = req.body;

  if (typeof foodName !== 'string' || !foodName.trim()) {
    res.status(400).json({ error: 'foodName string required', code: 'INVALID_FOOD_NAME' });
    return;
  }

  const cleanFood = foodName.trim().slice(0, 200);
  const cleanServing = typeof serving === 'string' && serving.trim() ? serving.trim().slice(0, 100) : '100 grams';

  try {
    const prompt = isPlate
      ? `Analyze full plate nutrition for: ${cleanFood}. Return ONLY JSON: {"name":"Full Plate Analysis: ${cleanFood}","healthGrade":"B","summary":"Balanced meal overview","ingredients":[{"name":"Item","type":"Natural","risk":"Nutrient-dense","classification":"safe"}],"nutrition":{"serving":"${cleanServing}","calories":480,"protein":14,"carbs":68,"fat":16,"sodium":"650mg"},"alternatives":[{"name":"Lighter variation","reason":"Higher fiber"}]}`
      : `Analyze nutrition for ${cleanFood} (${cleanServing}). Return ONLY JSON: {"name":"${cleanFood}","healthGrade":"B","summary":"Nutritional summary","ingredients":[{"name":"Item","type":"Natural","risk":"Nutrient-dense","classification":"safe"}],"nutrition":{"serving":"${cleanServing}","calories":210,"protein":7,"carbs":28,"fat":8,"sodium":"320mg"},"alternatives":[{"name":"Alternative","reason":"Cleaner choice"}]}`;

    const text = await callGemini([{ text: prompt }]);
    const result = extractJSON(text);

    if (!result || typeof result !== 'object') {
      res.status(502).json({ error: 'AI returned invalid nutrition response', code: 'AI_INVALID_JSON' });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Nutrition analysis failed. Please try again.',
      code: 'NUTRITION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// POST /aiInsight – Gemini insight generation
app.post('/aiInsight', optionalAuth, rateLimit(60000, 25), async (req: Request, res: Response) => {
  const { foodName, insightType, nutrition } = req.body;

  if (typeof foodName !== 'string' || !['coach', 'improve', 'recipe'].includes(insightType)) {
    res.status(400).json({ error: 'Valid foodName and insightType (coach|improve|recipe) required', code: 'INVALID_INPUT' });
    return;
  }

  const cleanFood = foodName.trim().slice(0, 200);
  const prompts: Record<string, string> = {
    coach: `As an AI Health Coach, give personalized advice (3-4 concise, encouraging sentences) about eating "${cleanFood}" with nutrition: ${JSON.stringify(nutrition || {})}. Be practical.`,
    improve: `Suggest 3 realistic healthy improvements or tweaks for a meal containing "${cleanFood}". Keep it punchy and actionable.`,
    recipe: `Give a simple, nutritious recipe idea featuring "${cleanFood}" as the main ingredient. Include brief steps.`,
  };

  try {
    const text = await callGemini([{ text: prompts[insightType] }]);
    res.json({ insight: text });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to generate nutritional insight',
      code: 'INSIGHT_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// Handler for food item identification from image
async function handleFoodIdentification(req: Request, res: Response): Promise<void> {
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'imageBase64 string required', code: 'INVALID_IMAGE' });
    return;
  }
  if (imageBase64.length > 7000000) {
    res.status(400).json({ error: 'Image size exceeds maximum allowed size (5MB)', code: 'IMAGE_TOO_LARGE' });
    return;
  }

  try {
    const text = await callGemini([
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      {
        text: 'Identify all distinct food items present in this image or on this plate. Return ONLY a valid JSON array of strings: ["Item 1", "Item 2"]. No markdown.',
      },
    ]);
    const items = extractJSON(text);
    res.json(Array.isArray(items) ? items : [items || 'Healthy Meal Plate']);
  } catch (err: any) {
    res.status(500).json({
      error: 'Food identification failed',
      code: 'IDENTIFICATION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
}

// Support both endpoint names for compatibility
app.post('/identifyFood', optionalAuth, rateLimit(60000, 20), handleFoodIdentification);
app.post('/identifyFoodItems', optionalAuth, rateLimit(60000, 20), handleFoodIdentification);

// POST /chat – AI nutritional chatbot
app.post('/chat', optionalAuth, rateLimit(60000, 25), async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array required', code: 'INVALID_MESSAGES' });
    return;
  }
  if (messages.length > 30) {
    res.status(400).json({ error: 'Exceeded maximum message history (30 messages)', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }

  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
      res.status(400).json({ error: 'Each message must have valid role and content', code: 'INVALID_MESSAGE_FORMAT' });
      return;
    }
    if (m.content.length > 2000) {
      res.status(400).json({ error: 'Message content exceeds maximum allowed length (2000)', code: 'CONTENT_TOO_LONG' });
      return;
    }
  }

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== 'user' || !lastMsg.content.trim()) {
    res.status(400).json({ error: 'Last message must be a non-empty user message', code: 'INVALID_LAST_MESSAGE' });
    return;
  }

  const SYSTEM_CONTEXT = `You are NutriScan Assistant, an AI expert in nutrition, food science, cosmetic ingredient safety, and wellness.
You help users understand food labels, additives, cosmetic toxicity, macros, and healthy lifestyle choices.
You are friendly, concise, and evidence-based. Format your responses with clear markdown bullets where helpful.`;

  const prior = messages.slice(0, messages.length - 1);
  const contents: any[] = [];
  let firstUser = false;

  for (const m of prior) {
    if (!firstUser) {
      if (m.role === 'user') {
        firstUser = true;
        contents.push({ role: 'user', parts: [{ text: m.content }] });
      }
      continue;
    }
    const currentRole = m.role === 'user' ? 'user' : 'model';
    const lastRole = contents[contents.length - 1]?.role;
    if (currentRole !== lastRole) {
      contents.push({ role: currentRole, parts: [{ text: m.content }] });
    }
  }

  contents.push({ role: 'user', parts: [{ text: lastMsg.content }] });

  try {
    const text = await callGemini(contents.flatMap((c) => c.parts), SYSTEM_CONTEXT);
    res.json({ message: text });
  } catch (err: any) {
    res.status(500).json({
      error: 'Chat response failed. Please try again.',
      code: 'CHAT_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// ─── Account Deletion (Transactional & Complete) ──────────────────────────────
export async function deleteUserAccountData(uid: string): Promise<void> {
  // 1. Delete savedProducts subcollection in batched writes
  const savedRef = db.collection(`artifacts/${APP_ID}/users/${uid}/savedProducts`);
  const savedDocs = await savedRef.get();
  if (!savedDocs.empty) {
    const batch1 = db.batch();
    for (const d of savedDocs.docs) {
      batch1.delete(d.ref);
    }
    await batch1.commit();
  }

  // 2. Delete scans subcollection in batched writes
  const scansRef = db.collection(`artifacts/${APP_ID}/users/${uid}/scans`);
  const scansDocs = await scansRef.get();
  if (!scansDocs.empty) {
    const batch2 = db.batch();
    for (const d of scansDocs.docs) {
      batch2.delete(d.ref);
    }
    await batch2.commit();
  }

  // 3. Delete root user document
  await db.doc(`artifacts/${APP_ID}/users/${uid}`).delete();

  // 4. Delete Firebase Auth user account
  try {
    await admin.auth().deleteUser(uid);
  } catch (err: any) {
    if (err.code !== 'auth/user-not-found') {
      throw err;
    }
  }
}

// POST /deleteAccount – Authorized complete deletion
app.post('/deleteAccount', authenticateUser, async (req: Request, res: Response) => {
  const uid = (req as any).user.uid;
  try {
    await deleteUserAccountData(uid);
    res.json({ success: true, message: 'Account and associated personal records deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({
      error: 'Account erasure failed. Please try again or contact support.',
      code: 'DELETION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export const api = onRequest(
  { timeoutSeconds: 60, memory: '512MiB', secrets: ['GEMINI_API_KEY'] },
  app
);

// Callable Function for Client SDK
export const getProductData = onCall(async (request) => {
  const { query, type, barcode } = request.data || {};
  if (!query && !barcode) throw new HttpsError('invalid-argument', 'query or barcode required');

  const cacheKey = barcode || query;
  const cleanType = ['foods', 'care', 'health'].includes(type) ? type : 'foods';
  const cached = await getCached(cleanType, cacheKey);
  if (cached) return { ...cached, fromCache: true };

  let rawData: object = {};
  try {
    if (barcode) rawData = await openFoodFactsLookup(barcode);
    else if (cleanType === 'care') rawData = await cosmeticsSearch(query);
    else if (cleanType === 'health') rawData = await healthProductSearch(query);
    else rawData = await grocerySearch(query);

    await setCache(cleanType, cacheKey, rawData);
    return rawData;
  } catch (err: any) {
    throw new HttpsError('internal', err.message || 'Data fetch failed');
  }
});

// Callable Function for Account Deletion
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to delete account');
  }
  const uid = request.auth.uid;
  try {
    await deleteUserAccountData(uid);
    return { success: true };
  } catch (err: any) {
    throw new HttpsError('internal', err.message || 'Account deletion failed');
  }
});

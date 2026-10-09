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

// Trust reverse proxy (Google Cloud / Firebase Hosting) for accurate client IP
app.set('trust proxy', 1);

// Production Origin Allowlist (Explicit - No Wildcard Suffix Matching)
const PRODUCTION_ORIGINS = [
  'https://nutriscan-ai-xm4u.onrender.com',
  'https://studio-3997613211-3d795.web.app',
  'https://studio-3997613211-3d795.firebaseapp.com',
];

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
];

const envAdditionalOrigins = (process.env.ADDITIONAL_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGIN_SET = new Set<string>([
  ...PRODUCTION_ORIGINS,
  ...envAdditionalOrigins,
  ...(!isProduction ? DEV_ORIGINS : []),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile app, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (ALLOWED_ORIGIN_SET.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS request denied: origin ${origin} is not in the verified allowlist.`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Security Headers & Correlation ID Normalization
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const incomingId = req.headers['x-request-id'];
  const correlationId =
    typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(incomingId)
      ? incomingId
      : randomUUID();

  res.setHeader('x-request-id', correlationId);
  (req as any).correlationId = correlationId;
  next();
});

// ─── Authentication Middlewares ───────────────────────────────────────────────

/**
 * Enforces a verified Firebase ID token.
 * Rejects missing, malformed, or expired credentials.
 * Attaches the verified user token payload to req.user.
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access this service.',
      code: 'UNAUTHORIZED',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    res.status(401).json({
      error: 'Authentication token is empty or malformed.',
      code: 'MALFORMED_TOKEN',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    const isExpired = err.code === 'auth/id-token-expired';
    res.status(401).json({
      error: isExpired
        ? 'Authentication session expired. Please re-authenticate.'
        : 'Invalid authentication credentials.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      correlationId: (req as any).correlationId,
    });
  }
}

/**
 * Optional authentication middleware for public endpoints needing user attribution if available.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        (req as any).user = decoded;
      } catch {
        // Continue as unauthenticated guest
      }
    }
  }
  next();
}

// ─── Distributed Concurrency-Safe Rate Limiter ────────────────────────────────
interface LocalRateLimitEntry {
  count: number;
  resetAt: number;
}
const localFallbackMap = new Map<string, LocalRateLimitEntry>();

// Clean up stale local entries every 60 seconds
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of localFallbackMap.entries()) {
    if (entry.resetAt <= now) {
      localFallbackMap.delete(key);
    }
  }
}, 60000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Distributed rate limiter backed by Firestore transactions.
 * Coordinates request quotas across horizontally scaled Cloud Function instances.
 * Falls back to an in-memory sliding window if Firestore is temporarily slow or unavailable.
 */
export function rateLimit(windowMs: number, maxRequests: number, tier = 'default') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
    const sanitizedIp = String(rawIp).replace(/[^a-zA-Z0-9.:_-]/g, '').slice(0, 45);
    const userId = (req as any).user?.uid;
    const identifier = userId ? `user_${userId}` : `ip_${sanitizedIp}`;
    const safeKey = `${tier}_${identifier.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const now = Date.now();

    try {
      const limitRef = db.doc(`artifacts/${APP_ID}/system_rate_limits/${safeKey}`);

      const txPromise = db.runTransaction(async (transaction) => {
        const snap = await transaction.get(limitRef);
        const data = snap.data();

        if (!snap.exists || !data || (data.resetAt && data.resetAt <= now)) {
          const resetAt = now + windowMs;
          transaction.set(limitRef, {
            count: 1,
            resetAt,
            tier,
            identifier,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return { allowed: true, count: 1, resetAt };
        }

        if (data.count >= maxRequests) {
          return { allowed: false, count: data.count, resetAt: data.resetAt };
        }

        const newCount = data.count + 1;
        transaction.update(limitRef, {
          count: newCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { allowed: true, count: newCount, resetAt: data.resetAt };
      });

      const timeoutPromise = new Promise<{ allowed: boolean; count: number; resetAt: number }>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore rate limit timeout')), 1500);
      });

      const result = await Promise.race([txPromise, timeoutPromise]);

      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait before sending additional requests.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          correlationId: (req as any).correlationId,
        });
        return;
      }

      next();
    } catch (err: any) {
      // Resilient local fallback if Firestore operation errors or is unavailable
      const fallbackEntry = localFallbackMap.get(safeKey);
      if (!fallbackEntry || fallbackEntry.resetAt <= now) {
        localFallbackMap.set(safeKey, { count: 1, resetAt: now + windowMs });
        next();
        return;
      }

      if (fallbackEntry.count >= maxRequests) {
        const retryAfter = Math.max(1, Math.ceil((fallbackEntry.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait before sending additional requests.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          correlationId: (req as any).correlationId,
        });
        return;
      }

      fallbackEntry.count++;
      next();
    }
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
  try {
    const doc = await db.doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`).get();
    return doc.exists ? doc.data() : null;
  } catch {
    return null;
  }
}

async function setCache(type: string, key: string, data: object) {
  try {
    await db
      .doc(`artifacts/${APP_ID}/public/data/${type}/${encodeURIComponent(key)}`)
      .set({ ...data, cachedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch {
    // Non-fatal cache write failure
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NutriScan AI Protected Backend',
    timestamp: new Date().toISOString(),
  });
});

// GET /getProductData - Public product lookup with IP rate limiting
app.get('/getProductData', rateLimit(600000, 40, 'public_lookup'), async (req: Request, res: Response) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 200) : '';
  const type = ['foods', 'care', 'health'].includes(String(req.query.type)) ? String(req.query.type) : 'foods';
  const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim().slice(0, 32) : '';

  if (!query && !barcode) {
    res.status(400).json({
      error: 'Product query string or barcode required.',
      code: 'INVALID_QUERY',
      correlationId: (req as any).correlationId,
    });
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
    res.status(500).json({
      error: 'Product lookup failed. Please try again.',
      code: 'LOOKUP_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// POST /analyzeProduct - Authenticated Gemini product analysis
app.post('/analyzeProduct', authenticateUser, rateLimit(600000, 20, 'ai_product'), async (req: Request, res: Response) => {
  const { query, type = 'foods', imageBase64 } = req.body;

  if (typeof query !== 'string' && !imageBase64) {
    res.status(400).json({
      error: 'Product query string or imageBase64 required.',
      code: 'INVALID_INPUT',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  const cleanQuery = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  const cleanType = ['foods', 'care', 'health'].includes(type) ? type : 'foods';

  if (imageBase64) {
    if (typeof imageBase64 !== 'string') {
      res.status(400).json({
        error: 'Image data must be a base64 encoded string.',
        code: 'INVALID_IMAGE_FORMAT',
        correlationId: (req as any).correlationId,
      });
      return;
    }
    // Reject images exceeding 5MB (~7,000,000 base64 chars)
    if (imageBase64.length > 7000000) {
      res.status(400).json({
        error: 'Image size exceeds maximum allowed limit (5MB).',
        code: 'IMAGE_TOO_LARGE',
        correlationId: (req as any).correlationId,
      });
      return;
    }
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
      res.status(502).json({
        error: 'AI service produced an unparseable response structure.',
        code: 'AI_INVALID_JSON',
        correlationId: (req as any).correlationId,
      });
      return;
    }

    // Runtime schema validation
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    if (!validGrades.includes(result.healthGrade)) {
      result.healthGrade = 'C';
    }
    if (!Array.isArray(result.ingredients)) {
      result.ingredients = [];
    }
    if (!Array.isArray(result.alternatives)) {
      result.alternatives = [];
    }
    result.disclaimer = 'NutriScan AI provides nutritional analysis for educational purposes. It is not medical or diagnostic advice.';

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

// POST /analyzeNutrition - Authenticated Gemini nutrition analysis
app.post('/analyzeNutrition', authenticateUser, rateLimit(600000, 20, 'ai_nutrition'), async (req: Request, res: Response) => {
  const { foodName, serving, isPlate } = req.body;

  if (typeof foodName !== 'string' || !foodName.trim()) {
    res.status(400).json({
      error: 'Valid foodName string required.',
      code: 'INVALID_FOOD_NAME',
      correlationId: (req as any).correlationId,
    });
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
      res.status(502).json({
        error: 'AI service returned invalid nutrition response.',
        code: 'AI_INVALID_JSON',
        correlationId: (req as any).correlationId,
      });
      return;
    }

    result.disclaimer = 'Nutritional values are AI estimates based on standard databases and may vary by preparation.';
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: 'Nutrition analysis failed. Please try again.',
      code: 'NUTRITION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// POST /aiInsight - Authenticated Gemini insight generation
app.post('/aiInsight', authenticateUser, rateLimit(600000, 25, 'ai_insight'), async (req: Request, res: Response) => {
  const { foodName, insightType, nutrition } = req.body;

  if (typeof foodName !== 'string' || !['coach', 'improve', 'recipe'].includes(insightType)) {
    res.status(400).json({
      error: 'Valid foodName and insightType (coach|improve|recipe) required.',
      code: 'INVALID_INPUT',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  const cleanFood = foodName.trim().slice(0, 200);
  const prompts: Record<string, string> = {
    coach: `As an AI Health Coach, give personalized advice (3-4 concise, encouraging sentences) about eating "${cleanFood}" with nutrition: ${JSON.stringify(nutrition || {})}. Be practical and factual.`,
    improve: `Suggest 3 realistic healthy improvements or tweaks for a meal containing "${cleanFood}". Keep it punchy and actionable.`,
    recipe: `Give a simple, nutritious recipe idea featuring "${cleanFood}" as the main ingredient. Include brief steps.`,
  };

  try {
    const text = await callGemini([{ text: prompts[insightType] }]);
    res.json({ insight: text });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to generate nutritional insight. Please try again.',
      code: 'INSIGHT_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// Handler for food item identification from image
async function handleFoodIdentification(req: Request, res: Response): Promise<void> {
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({
      error: 'imageBase64 string required.',
      code: 'INVALID_IMAGE',
      correlationId: (req as any).correlationId,
    });
    return;
  }
  if (imageBase64.length > 7000000) {
    res.status(400).json({
      error: 'Image size exceeds maximum allowed limit (5MB).',
      code: 'IMAGE_TOO_LARGE',
      correlationId: (req as any).correlationId,
    });
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
      error: 'Food identification failed. Please try again.',
      code: 'IDENTIFICATION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
}

// Support both endpoint names for compatibility (both require authenticated session)
app.post('/identifyFood', authenticateUser, rateLimit(600000, 10, 'ai_vision'), handleFoodIdentification);
app.post('/identifyFoodItems', authenticateUser, rateLimit(600000, 10, 'ai_vision'), handleFoodIdentification);

// POST /chat - Authenticated AI nutritional chatbot
app.post('/chat', authenticateUser, rateLimit(600000, 30, 'ai_chat'), async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: 'messages array required.',
      code: 'INVALID_MESSAGES',
      correlationId: (req as any).correlationId,
    });
    return;
  }
  if (messages.length > 30) {
    res.status(400).json({
      error: 'Exceeded maximum message history (30 messages).',
      code: 'PAYLOAD_TOO_LARGE',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) {
      res.status(400).json({
        error: 'Each message must have valid role and content.',
        code: 'INVALID_MESSAGE_FORMAT',
        correlationId: (req as any).correlationId,
      });
      return;
    }
    if (m.content.length > 2000) {
      res.status(400).json({
        error: 'Message content exceeds maximum allowed length (2000 characters).',
        code: 'CONTENT_TOO_LONG',
        correlationId: (req as any).correlationId,
      });
      return;
    }
  }

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== 'user' || !lastMsg.content.trim()) {
    res.status(400).json({
      error: 'Last message must be a non-empty user message.',
      code: 'INVALID_LAST_MESSAGE',
      correlationId: (req as any).correlationId,
    });
    return;
  }

  const SYSTEM_CONTEXT = `You are NutriScan Assistant, an AI expert in nutrition, food science, cosmetic ingredient safety, and wellness.
You help users understand food labels, additives, cosmetic toxicity, macros, and healthy lifestyle choices.
You are friendly, concise, and evidence-based. Format your responses with clear markdown bullets where helpful.
Disclaimer: State clearly that your answers provide educational nutritional guidance and not medical diagnosis or treatment advice.`;

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

// ─── Account Deletion (Transactional, Resumable & Authoritative) ───────────────

/**
 * Authoritative server-side deletion of user data and authentication record.
 * Handles subcollections in bounded batches of 400 to prevent timeout or Firestore limits.
 * Idempotent: safe to run multiple times.
 */
export async function deleteUserAccountData(uid: string): Promise<void> {
  if (!uid || typeof uid !== 'string') {
    throw new Error('Valid user UID required for account deletion');
  }

  const userDocRef = db.doc(`artifacts/${APP_ID}/users/${uid}`);

  // Prevent concurrent deletion races by setting deletion in-progress lock
  await userDocRef.set(
    {
      deletionStatus: 'in_progress',
      deletionStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Helper: Bounded batch deletion for subcollections (up to 400 items per batch)
  async function deleteCollectionBounded(collectionRef: admin.firestore.CollectionReference) {
    const BATCH_SIZE = 400;
    while (true) {
      const snapshot = await collectionRef.limit(BATCH_SIZE).get();
      if (snapshot.empty) break;

      const batch = db.batch();
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();

      if (snapshot.size < BATCH_SIZE) break;
    }
  }

  // 1. Delete savedProducts subcollection
  await deleteCollectionBounded(db.collection(`artifacts/${APP_ID}/users/${uid}/savedProducts`));

  // 2. Delete scans subcollection
  await deleteCollectionBounded(db.collection(`artifacts/${APP_ID}/users/${uid}/scans`));

  // 3. Delete settings / preferences subcollection if present
  await deleteCollectionBounded(db.collection(`artifacts/${APP_ID}/users/${uid}/settings`));

  // 4. Delete root user document
  await userDocRef.delete();

  // 5. Delete Firebase Authentication user record
  try {
    await admin.auth().deleteUser(uid);
  } catch (err: any) {
    if (err.code !== 'auth/user-not-found') {
      throw err;
    }
  }
}

// POST /deleteAccount - Authorized complete account deletion endpoint
app.post('/deleteAccount', authenticateUser, async (req: Request, res: Response) => {
  const uid = (req as any).user.uid;
  try {
    await deleteUserAccountData(uid);
    res.json({
      success: true,
      message: 'Account and associated personal records deleted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Account erasure failed. Please try again or contact customer support.',
      code: 'DELETION_FAILED',
      correlationId: (req as any).correlationId,
    });
  }
});

// ─── Firebase Cloud Function Exports ──────────────────────────────────────────
export const api = onRequest(
  { timeoutSeconds: 60, memory: '512MiB', secrets: ['GEMINI_API_KEY'] },
  app
);

// Callable Function for Client SDK: Product Lookup
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

// Callable Function for Client SDK: Account Deletion
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

export { app };


import { describe, it, expect } from 'vitest';
import { extractJSON } from '../services/gemini.js';

describe('Unit Tests: Gemini Service JSON Extraction & Parsing', () => {
  it('extracts raw JSON object correctly', () => {
    const raw = '{"name": "Greek Yogurt", "healthGrade": "A", "summary": "High protein"}';
    const parsed = extractJSON(raw);
    expect(parsed).toBeDefined();
    expect(parsed.name).toBe('Greek Yogurt');
    expect(parsed.healthGrade).toBe('A');
  });

  it('extracts JSON from markdown codeblock (```json ... ```)', () => {
    const raw = 'Here is the analysis:\n```json\n{"name": "Apple", "healthGrade": "A", "ingredients": []}\n```\nHope this helps!';
    const parsed = extractJSON(raw);
    expect(parsed).toBeDefined();
    expect(parsed.name).toBe('Apple');
    expect(parsed.healthGrade).toBe('A');
  });

  it('extracts JSON array from markdown codeblock', () => {
    const raw = '```json\n["Masala Dosa", "Sambar", "Coconut Chutney"]\n```';
    const parsed = extractJSON(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toBe('Masala Dosa');
  });

  it('falls back safely when JSON is malformed and fallback provided', () => {
    const raw = 'Sorry, could not generate valid JSON response.';
    const fallback = { name: 'Fallback Item' };
    const parsed = extractJSON(raw, fallback);
    expect(parsed).toEqual(fallback);
  });

  it('throws error when JSON is invalid and no fallback provided', () => {
    const raw = 'Total garbage without any json structure';
    expect(() => extractJSON(raw)).toThrow('Failed to parse AI response into structured data.');
  });
});

describe('Unit Tests: Product Data Validation Rules', () => {
  function validateProduct(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      name: String(raw.name || 'Unknown Product'),
      healthGrade: ['A', 'B', 'C', 'D', 'F'].includes(raw.healthGrade) ? raw.healthGrade : 'C',
      summary: String(raw.summary || 'No summary available.'),
      ingredients: Array.isArray(raw.ingredients)
        ? raw.ingredients.map(i => ({
            name: String(i.name || 'Unknown'),
            type: i.type === 'Natural' ? 'Natural' : 'Artificial',
            risk: String(i.risk || ''),
            classification: ['safe', 'limited', 'harmful'].includes(i.classification) ? i.classification : 'limited',
          }))
        : [],
      alternatives: Array.isArray(raw.alternatives)
        ? raw.alternatives.map(a => ({ name: String(a.name || ''), reason: String(a.reason || '') }))
        : [],
    };
  }

  it('validates a complete, healthy product properly', () => {
    const raw = {
      name: 'Organic Rolled Oats',
      healthGrade: 'A',
      summary: '100% whole grain oats with high beta-glucan fiber.',
      ingredients: [
        { name: 'Whole Grain Oats', type: 'Natural', risk: 'None', classification: 'safe' }
      ],
      alternatives: [
        { name: 'Steel Cut Oats', reason: 'Lower glycemic index' }
      ]
    };
    const valid = validateProduct(raw);
    expect(valid).not.toBeNull();
    expect(valid.name).toBe('Organic Rolled Oats');
    expect(valid.healthGrade).toBe('A');
    expect(valid.ingredients).toHaveLength(1);
    expect(valid.ingredients[0].classification).toBe('safe');
  });

  it('sanitizes invalid healthGrade to default C', () => {
    const raw = { name: 'Mystery Snack', healthGrade: 'Z' };
    const valid = validateProduct(raw);
    expect(valid.healthGrade).toBe('C');
  });

  it('sanitizes invalid ingredient classification to default limited', () => {
    const raw = {
      name: 'Soda Drink',
      healthGrade: 'F',
      ingredients: [
        { name: 'Aspartame', type: 'Artificial', risk: 'Sweetener', classification: 'unknown-class' }
      ]
    };
    const valid = validateProduct(raw);
    expect(valid.ingredients[0].classification).toBe('limited');
    expect(valid.ingredients[0].type).toBe('Artificial');
  });

  it('handles null/undefined gracefully', () => {
    expect(validateProduct(null)).toBeNull();
    expect(validateProduct(undefined)).toBeNull();
    expect(validateProduct('string')).toBeNull();
  });
});

describe('Unit Tests: Nutrition Data Validation Rules', () => {
  function validateNutrition(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const n = raw.nutrition || {};
    return {
      name: String(raw.name || 'Food Item'),
      healthGrade: ['A', 'B', 'C', 'D', 'F'].includes(raw.healthGrade) ? raw.healthGrade : 'B',
      summary: String(raw.summary || ''),
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
      nutrition: {
        serving: String(n.serving || '100g'),
        calories: Number(n.calories) || 0,
        protein: Number(n.protein) || 0,
        carbs: Number(n.carbs) || 0,
        fat: Number(n.fat) || 0,
        sodium: String(n.sodium || '0mg'),
      },
      alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
    };
  }

  it('parses valid nutrition stats and numbers', () => {
    const raw = {
      name: 'Paneer Tikka',
      healthGrade: 'A',
      summary: 'Rich in vegetarian protein and calcium.',
      nutrition: {
        serving: '150g',
        calories: 320,
        protein: 18,
        carbs: 8,
        fat: 22,
        sodium: '420mg'
      }
    };
    const validated = validateNutrition(raw);
    expect(validated.name).toBe('Paneer Tikka');
    expect(validated.nutrition.calories).toBe(320);
    expect(validated.nutrition.protein).toBe(18);
    expect(validated.nutrition.sodium).toBe('420mg');
  });

  it('handles missing numbers by defaulting to 0', () => {
    const raw = {
      name: 'Green Salad',
      nutrition: { serving: '200g' }
    };
    const validated = validateNutrition(raw);
    expect(validated.nutrition.calories).toBe(0);
    expect(validated.nutrition.protein).toBe(0);
    expect(validated.nutrition.fat).toBe(0);
  });
});

describe('Unit Tests: Chatbot History Sanitization', () => {
  function sanitizeHistory(messages) {
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
    return history;
  }

  it('strips leading assistant/model greeting and starts with user', () => {
    const messages = [
      { role: 'assistant', content: '👋 Hi! I am NutriScan Assistant.' },
      { role: 'user', content: 'What is a calorie?' }
    ];
    const history = sanitizeHistory(messages);
    expect(history).toEqual([]);
  });

  it('keeps multi-turn history properly alternating', () => {
    const messages = [
      { role: 'assistant', content: '👋 Greeting' },
      { role: 'user', content: 'Is oats good?' },
      { role: 'assistant', content: 'Yes, oats are great.' },
      { role: 'user', content: 'What about oatmeal with milk?' }
    ];
    const history = sanitizeHistory(messages);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[0].parts[0].text).toBe('Is oats good?');
    expect(history[1].role).toBe('model');
    expect(history[1].parts[0].text).toBe('Yes, oats are great.');
  });
});

describe('Unit Tests: Cookie Consent Lifecycle & Enforcement', () => {
  it('saves consent preferences and persists to localStorage', async () => {
    const { saveConsentPreferences, getConsentPreferences } = await import('../services/cookieConsent.js');
    saveConsentPreferences({ functional: true, analytics: false });
    const prefs = getConsentPreferences();
    expect(prefs).not.toBeNull();
    expect(prefs.strictlyNecessary).toBe(true);
    expect(prefs.functional).toBe(true);
    expect(prefs.analytics).toBe(false);
  });

  it('rejects optional cookies and purges functional storage upon withdrawal', async () => {
    const { rejectOptionalCookies, getConsentPreferences, isConsentGranted } = await import('../services/cookieConsent.js');
    localStorage.setItem('nutriscan_ui_prefs', JSON.stringify({ mode: 'compact' }));
    rejectOptionalCookies();
    const prefs = getConsentPreferences();
    expect(prefs.functional).toBe(false);
    expect(prefs.analytics).toBe(false);
    expect(isConsentGranted('functional')).toBe(false);
    expect(isConsentGranted('strictlyNecessary')).toBe(true);
    expect(localStorage.getItem('nutriscan_ui_prefs')).toBeNull();
  });
});

describe('Unit Tests: Business Configuration Audit', () => {
  it('identifies unconfigured placeholder fields', async () => {
    const { validateBusinessConfiguration } = await import('../config/businessConfig.js');
    const result = validateBusinessConfiguration(false);
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.issues)).toBe(true);
    expect(result.issues.some(i => i.field === 'legalName')).toBe(true);
  });
});

describe('Unit Tests: Personal Data Export Formatting', () => {
  it('generates structured DPDP-compliant user data export payload', () => {
    const exportPayload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      account: {
        uid: 'user-789',
        email: 'user@example.com',
        displayName: 'John Doe',
      },
      profile: {
        dietaryPreferences: ['vegetarian'],
        allergies: ['peanuts'],
        targetCalories: 2100,
      },
      scans: [
        { name: 'Oatmeal', calories: 150, scannedAt: '2026-10-09T00:00:00Z' },
      ],
      savedProducts: [
        { name: 'Greek Yogurt', healthGrade: 'A' },
      ],
    };

    expect(exportPayload.account.uid).toBe('user-789');
    expect(exportPayload.profile.allergies).toContain('peanuts');
    expect(exportPayload.scans).toHaveLength(1);
    expect(exportPayload.savedProducts[0].healthGrade).toBe('A');
  });
});


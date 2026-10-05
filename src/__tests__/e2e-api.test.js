import { describe, it, expect } from 'vitest';
import {
  analyzeProductAI,
  analyzeFoodNutritionAI,
  getAIInsightAI,
  sendChatMessageAI,
} from '../services/gemini.js';

describe('Live E2E AI Tests: Real Gemini 3.5 Flash API Execution', () => {
  // Set 45s timeout for live AI network calls
  it('analyzes a packaged food product with full nutrition and ingredients', async () => {
    const result = await analyzeProductAI({ query: 'Organic Green Tea', type: 'foods' });
    expect(result).toBeDefined();
    expect(result.name).toBeDefined();
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.healthGrade);
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
  }, 45000);

  it('analyzes food nutrition and returns macronutrients & calories', async () => {
    const result = await analyzeFoodNutritionAI('Boiled Egg', '1 large egg', false);
    expect(result).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.nutrition).toBeDefined();
    expect(result.nutrition.calories).toBeGreaterThan(0);
    expect(result.nutrition.protein).toBeGreaterThan(0);
  }, 45000);

  it('generates an AI health coach insight for a meal', async () => {
    const insight = await getAIInsightAI('Oatmeal with berries', 'coach', { calories: 280, protein: 9 });
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(20);
  }, 45000);

  it('executes a live multi-turn chat question and receives response', async () => {
    const messages = [
      { role: 'user', content: 'What is the recommended daily intake of water for an adult? Answer in 1 short sentence.' }
    ];
    const reply = await sendChatMessageAI(messages);
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(10);
  }, 45000);
});

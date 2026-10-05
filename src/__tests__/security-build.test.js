import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security & Environment Tests', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('ensures .gitignore exists and protects .env.local', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('.env.local');
    expect(content).toContain('node_modules');
    expect(content).toContain('dist');
  });

  it('ensures .env.example exists as a public template without real keys', () => {
    const examplePath = path.join(rootDir, '.env.example');
    expect(fs.existsSync(examplePath)).toBe(true);

    const content = fs.readFileSync(examplePath, 'utf8');
    // Ensure no real Google API keys (starting with AIza) are committed to the public example template
    expect(content).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
    expect(content).toContain('VITE_FIREBASE_API_KEY');
    expect(content).toContain('VITE_GEMINI_API_KEY');
  });

  it('ensures Firestore rules protect user documents and collections', () => {
    const rulesPath = path.join(rootDir, 'firestore.rules');
    expect(fs.existsSync(rulesPath)).toBe(true);

    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).toContain('service cloud.firestore');
    expect(rules).toContain('request.auth != null');
  });

  it('ensures firebase.json specifies secure hosting rewrites and dist folder', () => {
    const fbPath = path.join(rootDir, 'firebase.json');
    expect(fs.existsSync(fbPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
    expect(config.hosting.public).toBe('dist');
    expect(config.hosting.rewrites).toBeDefined();
  });
});

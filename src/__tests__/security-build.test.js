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
    expect(content).toContain('VITE_BACKEND_URL');
    expect(content).not.toContain('VITE_GEMINI_API_KEY');
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

  it('ensures client-side source code contains zero direct Gemini SDK imports or VITE_GEMINI_API_KEY references', () => {
    const geminiServicePath = path.join(rootDir, 'src/services/gemini.js');
    expect(fs.existsSync(geminiServicePath)).toBe(true);

    const serviceCode = fs.readFileSync(geminiServicePath, 'utf8');
    expect(serviceCode).not.toContain('@google/generative-ai');
    expect(serviceCode).not.toContain('VITE_GEMINI_API_KEY');
    expect(serviceCode).not.toContain('generativelanguage.googleapis.com');
  });

  it('ensures package.json dependencies do not include @google/generative-ai in client bundle', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.dependencies['@google/generative-ai']).toBeUndefined();
  });

  it('ensures Firestore rules prevent unauthorized modification of administrative and role fields', () => {
    const rulesPath = path.join(rootDir, 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');
    expect(rules).toContain('notModifyingProtectedFields');
    expect(rules).toContain('isAdmin');
    expect(rules).toContain('role');
  });

  it('ensures backend functions do not contain wildcard suffix CORS checks', () => {
    const fnIndexPath = path.join(rootDir, 'functions/src/index.ts');
    const fnIndex = fs.readFileSync(fnIndexPath, 'utf8');
    expect(fnIndex).not.toContain(".endsWith('.onrender.com')");
    expect(fnIndex).not.toContain(".endsWith('.web.app')");
    expect(fnIndex).not.toContain(".endsWith('.firebaseapp.com')");
  });

  it('ensures no private credentials or Gemini API keys are present across any src/ files', () => {
    const srcDir = path.join(rootDir, 'src');
    function checkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf8');
          expect(content).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
          expect(content).not.toMatch(/AQ\.[0-9A-Za-z-_]{40,}/);
        }
      }
    }
    checkDir(srcDir);
  });
});

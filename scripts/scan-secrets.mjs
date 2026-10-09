// Automated Production Asset & Source Code Secret Scanner
// Ensures zero client-side Gemini secrets or direct SDK invocations exist in production assets.

import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

const FORBIDDEN_PATTERNS = [
  { pattern: /VITE_GEMINI_API_KEY/i, name: 'VITE_GEMINI_API_KEY reference' },
  { pattern: /@google\/generative-ai/i, name: '@google/generative-ai package import' },
  { pattern: /generativelanguage\.googleapis\.com/i, name: 'Direct Google Generative Language API endpoint' },
  { pattern: /AQ\.[0-9A-Za-z-_]{40,}/, name: 'Exposed Gemini API key token' },
];

let totalViolations = 0;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      // Check code and asset files
      if (/\.(js|jsx|ts|tsx|html|css|map)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const { pattern, name } of FORBIDDEN_PATTERNS) {
          if (pattern.test(content)) {
            // Exclude this script itself or test files that specifically test pattern absence
            if (entry.name.includes('scan-secrets') || entry.name.includes('security-build.test')) {
              continue;
            }
            console.error(`🚨 SECURITY VIOLATION: ${name} found in ${path.relative(rootDir, fullPath)}`);
            totalViolations++;
          }
        }
      }
    }
  }
}

console.log('=== NutriScan AI Secret & Security Scanning ===');
console.log('Scanning src/ for forbidden client-side secrets and direct Gemini calls...');
scanDirectory(srcDir);

if (fs.existsSync(distDir)) {
  console.log('Scanning production dist/ assets...');
  scanDirectory(distDir);
} else {
  console.log('ℹ️ dist/ directory not found. Run npm run build first to scan distribution assets.');
}

if (totalViolations > 0) {
  console.error(`\n❌ FAILED: Found ${totalViolations} security violations.`);
  process.exit(1);
} else {
  console.log('✅ PASS: Zero client-side Gemini secrets or direct SDK references detected.');
  process.exit(0);
}

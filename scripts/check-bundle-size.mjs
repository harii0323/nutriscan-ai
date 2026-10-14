// Automated bundle size verification gate
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist/assets');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/assets directory not found. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(distDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));

console.log('=== NutriScan AI Production Bundle Size Verification ===');

let totalSize = 0;
let mainIndexSize = 0;
let largestChunkSize = 0;
let largestChunkName = '';

for (const file of jsFiles) {
  const fullPath = path.join(distDir, file);
  const size = fs.statSync(fullPath).size;
  totalSize += size;

  if (size > largestChunkSize) {
    largestChunkSize = size;
    largestChunkName = file;
  }

  if (file.startsWith('index-')) {
    mainIndexSize = size;
  }

  console.log(`  • ${file.padEnd(35)} ${(size / 1024).toFixed(1).padStart(6)} KB`);
}

console.log('-------------------------------------------------------');
console.log(`Total JS Bundle Size:  ${(totalSize / 1024).toFixed(1)} KB`);
console.log(`Main App Entry Chunk:  ${(mainIndexSize / 1024).toFixed(1)} KB (Max: 350 KB)`);
console.log(`Largest Chunk (${largestChunkName}): ${(largestChunkSize / 1024).toFixed(1)} KB (Max: 500 KB)`);

let failed = false;

if (mainIndexSize > 350 * 1024) {
  console.error(`❌ Main app entry chunk ${(mainIndexSize / 1024).toFixed(1)} KB exceeds 350 KB threshold!`);
  failed = true;
}

if (largestChunkSize > 500 * 1024) {
  console.error(`❌ Largest chunk ${largestChunkName} (${(largestChunkSize / 1024).toFixed(1)} KB) exceeds 500 KB threshold!`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ PASS: All production chunks are within performance budget thresholds.');
  process.exit(0);
}

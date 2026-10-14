import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let commitSha = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    commitSha = 'development';
  }
}

const versionInfo = {
  version: '1.2.0',
  commitSha,
  builtAt: new Date().toISOString(),
};

const publicDir = path.resolve(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  JSON.stringify(versionInfo, null, 2) + '\n',
  'utf8'
);

console.log(`Generated public/version.json (commit: ${commitSha}, builtAt: ${versionInfo.builtAt})`);

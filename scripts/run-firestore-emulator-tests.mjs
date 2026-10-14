// Automation script to manage Firebase Firestore Emulator lifecycle and execute behavioral rule tests
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EMULATOR_PORT = process.env.FIRESTORE_PORT || 8085;
const EMULATOR_HOST = '127.0.0.1';
const CACHE_DIR = path.join(rootDir, '.emulator-cache');
const EMULATOR_VERSION = 'v1.19.8';
const EMULATOR_JAR_NAME = `cloud-firestore-emulator-${EMULATOR_VERSION}.jar`;
const EMULATOR_JAR_PATH = path.join(CACHE_DIR, EMULATOR_JAR_NAME);
const DOWNLOAD_URL = `https://storage.googleapis.com/firebase-preview-drop/emulator/${EMULATOR_JAR_NAME}`;

async function downloadEmulatorIfNeeded() {
  if (fs.existsSync(EMULATOR_JAR_PATH) && fs.statSync(EMULATOR_JAR_PATH).size > 60000000) {
    console.log(`✓ Firestore emulator jar verified at: ${EMULATOR_JAR_PATH}`);
    return;
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  console.log(`Downloading Firebase Firestore Emulator (${EMULATOR_VERSION})...`);
  console.log(`URL: ${DOWNLOAD_URL}`);

  // Use curl with resume if available, otherwise fetch
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const curlPromise = new Promise((resolve, reject) => {
    const cp = spawn(curlCmd, ['-C', '-', '--retry', '5', '--retry-delay', '2', '-fSL', '-o', EMULATOR_JAR_PATH, DOWNLOAD_URL], {
      stdio: 'inherit',
    });
    cp.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl exited with code ${code}`));
    });
    cp.on('error', reject);
  });

  try {
    await curlPromise;
  } catch {
    const res = await fetch(DOWNLOAD_URL);
    if (!res.ok) {
      throw new Error(`Failed to download Firestore emulator: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(EMULATOR_JAR_PATH, Buffer.from(arrayBuffer));
  }

  console.log(`✓ Downloaded Firestore emulator jar (${(fs.statSync(EMULATOR_JAR_PATH).size / 1024 / 1024).toFixed(1)} MB)`);
}

async function waitForPort(host, port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${host}:${port}/`);
      if (res.status === 200 || res.status === 404 || res.status === 400) {
        return true;
      }
    } catch {
      // not yet ready
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for Firestore Emulator on ${host}:${port}`);
}

async function main() {
  let emulatorProcess = null;

  try {
    // 1. Download jar if missing
    await downloadEmulatorIfNeeded();

    // 2. Start emulator process
    console.log(`Starting Firestore Emulator on ${EMULATOR_HOST}:${EMULATOR_PORT}...`);
    emulatorProcess = spawn('java', ['-jar', EMULATOR_JAR_PATH, '--host', EMULATOR_HOST, '--port', String(EMULATOR_PORT)], {
      stdio: 'pipe',
      detached: false,
    });

    emulatorProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('Dev App Server is now running') || msg.includes('INFO:')) {
        // Output from emulator
      }
    });

    emulatorProcess.stderr.on('data', () => {
      // Ignore routine warnings
    });

    emulatorProcess.on('error', (err) => {
      console.error('Failed to spawn java for emulator:', err.message);
    });

    // 3. Wait for emulator to become responsive
    await waitForPort(EMULATOR_HOST, EMULATOR_PORT);
    console.log(`✓ Firestore Emulator is healthy and listening on ${EMULATOR_HOST}:${EMULATOR_PORT}`);

    // 4. Run Vitest with FIRESTORE_EMULATOR_HOST configured
    console.log(`Running behavioral Firestore rules unit tests...`);
    const testEnv = {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: `${EMULATOR_HOST}:${EMULATOR_PORT}`,
    };

    const vitestArgs = ['vitest', 'run', 'src/__tests__/firestore-rules-emulator.test.js'];
    const vitestProcess = spawn('npx', vitestArgs, {
      cwd: rootDir,
      env: testEnv,
      stdio: 'inherit',
      shell: true,
    });

    const exitCode = await new Promise((resolve) => {
      vitestProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error(`❌ Firestore rules tests failed with exit code: ${exitCode}`);
      process.exit(exitCode);
    } else {
      console.log(`✅ All Firestore rules emulator tests passed successfully!`);
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during emulator test execution:', err.message);
    process.exit(1);
  } finally {
    if (emulatorProcess) {
      console.log('Shutting down Firestore Emulator...');
      try {
        emulatorProcess.kill('SIGTERM');
        // On Windows kill tree if needed
        if (process.platform === 'win32' && emulatorProcess.pid) {
          try {
            spawn('taskkill', ['/pid', String(emulatorProcess.pid), '/f', '/t']);
          } catch {}
        }
      } catch {}
    }
  }
}

main();

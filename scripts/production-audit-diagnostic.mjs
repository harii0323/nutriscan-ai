import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { URL } from 'node:url';

const TARGET_HOST = 'nutriscan-ai-xm4u.onrender.com';
const TARGET_URL = `https://${TARGET_HOST}`;

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || TARGET_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'NutriScan-Security-Audit/1.0',
        ...(options.headers || {}),
      },
      timeout: options.timeout || 15000,
    };

    const startTime = Date.now();
    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          duration,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${options.timeout || 15000}ms`));
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0],
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
  };
}

async function runAudit() {
  console.log('================================================================');
  console.log('       NUTRISCAN AI: LIVE PRODUCTION DIAGNOSTICS & AUDIT        ');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const report = {
    dns: null,
    tls: null,
    http: null,
    securityHeaders: null,
    negativeTests: [],
    versionCheck: null,
    latencyBaseline: null,
    stagedLoad: [],
  };

  // 1. DNS Resolution
  console.log('--- 1. DNS Resolution ---');
  try {
    const ipv4 = await dns.resolve4(TARGET_HOST).catch(() => []);
    const ipv6 = await dns.resolve6(TARGET_HOST).catch(() => []);
    report.dns = { status: 'PASS', ipv4, ipv6 };
    console.log(`  IPv4: ${ipv4.join(', ') || 'None'}`);
    console.log(`  IPv6: ${ipv6.join(', ') || 'None'}`);
  } catch (err) {
    report.dns = { status: 'FAIL', error: err.message };
    console.log(`  DNS Resolution Error: ${err.message}`);
  }

  // 2. TLS Certificate Validity
  console.log('\n--- 2. TLS Certificate Inspection ---');
  try {
    const tlsInfo = await new Promise((resolve, reject) => {
      const socket = tls.connect(
        { host: TARGET_HOST, port: 443, servername: TARGET_HOST, timeout: 10000 },
        () => {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          const cipher = socket.getCipher();
          socket.end();
          resolve({
            authorized,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            subject: cert.subject,
            issuer: cert.issuer,
            cipher: cipher.name,
            protocol: socket.getProtocol(),
          });
        }
      );
      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('TLS handshake timeout'));
      });
    });

    const validToDate = new Date(tlsInfo.validTo);
    const daysRemaining = Math.round((validToDate.getTime() - Date.now()) / (1000 * 3600 * 24));
    report.tls = { status: 'PASS', ...tlsInfo, daysRemaining };
    console.log(`  Authorized:     ${tlsInfo.authorized ? 'YES' : 'NO'}`);
    console.log(`  Protocol:       ${tlsInfo.protocol} (${tlsInfo.cipher})`);
    console.log(`  Issuer:         ${tlsInfo.issuer?.O || tlsInfo.issuer?.CN}`);
    console.log(`  Subject CN:     ${tlsInfo.subject?.CN}`);
    console.log(`  Expires:        ${tlsInfo.validTo} (${daysRemaining} days remaining)`);
  } catch (err) {
    report.tls = { status: 'FAIL', error: err.message };
    console.log(`  TLS Error: ${err.message}`);
  }

  // 3. HTTP Connectivity & Redirects
  console.log('\n--- 3. HTTP Connectivity & HTTPS Enforcement ---');
  try {
    const httpRes = await httpRequest({ url: `http://${TARGET_HOST}/`, timeout: 8000 });
    const isRedirect = [301, 302, 307, 308].includes(httpRes.statusCode);
    const location = httpRes.headers['location'] || '';
    const enforcesHttps = isRedirect && location.startsWith('https://');
    console.log(`  HTTP Port 80 Response: Status ${httpRes.statusCode}`);
    console.log(`  HTTPS Redirect:        ${enforcesHttps ? `YES -> ${location}` : `NO (Status: ${httpRes.statusCode})`}`);
  } catch (err) {
    console.log(`  HTTP Port 80 check: ${err.message}`);
  }

  // 4. Homepage Response & Security Headers
  console.log('\n--- 4. Live Homepage & Security Headers ---');
  let homepageBody = '';
  try {
    const res = await httpRequest({ url: `${TARGET_URL}/` });
    homepageBody = res.body;
    console.log(`  Status Code:   ${res.statusCode}`);
    console.log(`  Response Time: ${res.duration}ms`);
    console.log(`  Content-Type:  ${res.headers['content-type']}`);
    console.log(`  Content-Length:${res.headers['content-length'] || res.body.length + ' bytes'}`);
    console.log(`  Server Header: ${res.headers['server'] || '(Suppressed - Good)'}`);

    const secHeaders = {
      'Strict-Transport-Security': res.headers['strict-transport-security'] || 'MISSING',
      'Content-Security-Policy': res.headers['content-security-policy'] || 'MISSING',
      'X-Content-Type-Options': res.headers['x-content-type-options'] || 'MISSING',
      'X-Frame-Options': res.headers['x-frame-options'] || 'MISSING',
      'Referrer-Policy': res.headers['referrer-policy'] || 'MISSING',
      'Permissions-Policy': res.headers['permissions-policy'] || 'MISSING',
    };
    report.securityHeaders = secHeaders;
    console.log('\n  Security Headers Evaluated:');
    for (const [name, val] of Object.entries(secHeaders)) {
      const isOk = val !== 'MISSING';
      console.log(`    ${isOk ? '✅' : '❌'} ${name}: ${val.slice(0, 80)}${val.length > 80 ? '...' : ''}`);
    }
  } catch (err) {
    console.log(`  Homepage Request Failed: ${err.message}`);
  }

  // 5. Static Asset Verification & Caching
  console.log('\n--- 5. Static Assets & Cache-Control ---');
  const jsMatch = homepageBody.match(/\/assets\/[^"'\s>]+\.js/g);
  const detectedJsAsset = jsMatch ? jsMatch[0] : null;

  if (detectedJsAsset) {
    try {
      const jsRes = await httpRequest({ url: `${TARGET_URL}${detectedJsAsset}` });
      console.log(`  Main JS Bundle:   ${detectedJsAsset}`);
      console.log(`    Status:         ${jsRes.statusCode}`);
      console.log(`    Size:           ${Math.round(jsRes.body.length / 1024)} KB`);
      console.log(`    Cache-Control:  ${jsRes.headers['cache-control'] || 'MISSING'}`);
    } catch (err) {
      console.log(`  Error probing JS asset: ${err.message}`);
    }
  }

  // 6. SPA Routing & Fallback
  console.log('\n--- 6. SPA Routing Fallback & Endpoints ---');
  try {
    const spaRes = await httpRequest({ url: `${TARGET_URL}/calories` });
    const isSpaValid = spaRes.statusCode === 200 && spaRes.body.includes('<div id="root">');
    console.log(`  Deep link /calories: Status ${spaRes.statusCode} (${isSpaValid ? 'Valid SPA Fallback' : 'Invalid'})`);
  } catch (err) {
    console.log(`  SPA Fallback Error: ${err.message}`);
  }

  try {
    const healthRes = await httpRequest({ url: `${TARGET_URL}/healthz` });
    console.log(`  /healthz Endpoint:   Status ${healthRes.statusCode} (Body: ${healthRes.body.trim()})`);
  } catch (err) {
    console.log(`  /healthz check: ${err.message}`);
  }

  try {
    const apiFallbackRes = await httpRequest({ url: `${TARGET_URL}/api/unknown-probe` });
    console.log(`  Unknown /api Route:  Status ${apiFallbackRes.statusCode} (Content-Type: ${apiFallbackRes.headers['content-type']})`);
  } catch (err) {
    console.log(`  API Fallback check: ${err.message}`);
  }

  // 7. Deployed Commit Verification
  console.log('\n--- 7. Deployed Commit Verification ---');
  try {
    const versionRes = await httpRequest({ url: `${TARGET_URL}/version.json` });
    if (versionRes.statusCode === 200) {
      const versionData = JSON.parse(versionRes.body);
      console.log(`  version.json found: Commit SHA = ${versionData.commitSha}, BuiltAt = ${versionData.builtAt}`);
      report.versionCheck = versionData;
    } else {
      console.log(`  version.json status: ${versionRes.statusCode} (Not yet deployed to Render)`);
      report.versionCheck = { status: 'NOT_FOUND_ON_RENDER', statusCode: versionRes.statusCode };
    }
  } catch {
    console.log('  version.json not present on current live deployment');
    report.versionCheck = { status: 'NOT_PRESENT' };
  }

  if (detectedJsAsset) {
    console.log(`  Deployed Asset Fingerprint: ${detectedJsAsset}`);
    // Check if index-uJpTFYTQ.js corresponds to 04f95ae
    if (detectedJsAsset.includes('uJpTFYTQ')) {
      console.log('  -> Confirmed: Render is currently serving commit 04f95ae (built before latest local security commits).');
    }
  }

  // 8. Safe Negative Tests (Read-Only)
  console.log('\n--- 8. Safe Negative Tests (Read-Only) ---');
  try {
    // A: CORS check
    const corsRes = await httpRequest({
      url: `${TARGET_URL}/api/`,
      headers: { Origin: 'https://evil-unauthorized-domain.com' },
    });
    const allowOrigin = corsRes.headers['access-control-allow-origin'];
    console.log(`  CORS on unapproved origin: Allow-Origin = ${allowOrigin || '(None - Safe)'}`);

    // B: Oversized payload check
    const bigBody = 'X'.repeat(1024 * 1024); // 1MB payload
    const bigRes = await httpRequest(
      {
        url: `${TARGET_URL}/api/probe`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      bigBody
    );
    console.log(`  Oversized POST (1MB) to /api: Status ${bigRes.statusCode}`);

    // C: Error sanitization
    const errRes = await httpRequest({ url: `${TARGET_URL}/nonexistent-path-abc-123` });
    const hasLeak =
      errRes.body.includes('at ') ||
      errRes.body.includes('node_modules') ||
      errRes.body.includes('FirebaseError') ||
      errRes.body.includes('stack:');
    console.log(`  Error Disclosure Check: ${hasLeak ? 'FAIL (Stack leak detected)' : 'PASS (Clean response)'}`);
  } catch (err) {
    console.log(`  Negative test error: ${err.message}`);
  }

  // 9. Latency Baseline Benchmark (50 samples)
  console.log('\n--- 9. Latency Baseline Benchmark (50 sequential samples) ---');
  const latencies = [];
  const statusCounts = {};
  let errors = 0;
  const benchmarkStart = Date.now();

  for (let i = 0; i < 50; i++) {
    try {
      const sample = await httpRequest({ url: `${TARGET_URL}/`, timeout: 10000 });
      latencies.push(sample.duration);
      statusCounts[sample.statusCode] = (statusCounts[sample.statusCode] || 0) + 1;
    } catch {
      errors++;
    }
  }
  const totalDuration = (Date.now() - benchmarkStart) / 1000;
  const percentiles = calculatePercentiles(latencies);
  report.latencyBaseline = {
    samples: latencies.length,
    errors,
    totalDurationSec: totalDuration.toFixed(2),
    rps: (latencies.length / totalDuration).toFixed(2),
    percentiles,
    statusCounts,
  };

  console.log(`  Samples:     ${latencies.length} (Errors: ${errors}, Rate: ${((errors / 50) * 100).toFixed(1)}%)`);
  console.log(`  Duration:    ${totalDuration.toFixed(2)}s (~${(latencies.length / totalDuration).toFixed(1)} req/s)`);
  console.log(`  Min Latency: ${percentiles.min}ms`);
  console.log(`  p50 (Median):${percentiles.p50}ms`);
  console.log(`  p90 Latency: ${percentiles.p90}ms`);
  console.log(`  p95 Latency: ${percentiles.p95}ms`);
  console.log(`  p99 Latency: ${percentiles.p99}ms`);
  console.log(`  Mean Latency:${percentiles.mean}ms`);
  console.log(`  Status Dist: ${JSON.stringify(statusCounts)}`);

  // 10. Controlled Staged Load Test
  console.log('\n--- 10. Controlled Staged Load Test ---');
  const stages = [
    { name: 'Tier 1 (Baseline Concurrency: 5 concurrent)', concurrency: 5, totalRequests: 20 },
    { name: 'Tier 2 (Light Concurrency: 10 concurrent)', concurrency: 10, totalRequests: 30 },
    { name: 'Tier 3 (Moderate Concurrency: 20 concurrent)', concurrency: 20, totalRequests: 40 },
  ];

  for (const stage of stages) {
    console.log(`\n  Executing ${stage.name}...`);
    const stageLatencies = [];
    const stageStatuses = {};
    let stageErrors = 0;
    const stageStart = Date.now();

    const runWorker = async () => {
      try {
        const res = await httpRequest({ url: `${TARGET_URL}/`, timeout: 12000 });
        stageLatencies.push(res.duration);
        stageStatuses[res.statusCode] = (stageStatuses[res.statusCode] || 0) + 1;
      } catch {
        stageErrors++;
      }
    };

    // Run in chunks matching concurrency
    for (let i = 0; i < stage.totalRequests; i += stage.concurrency) {
      const batch = [];
      const batchSize = Math.min(stage.concurrency, stage.totalRequests - i);
      for (let b = 0; b < batchSize; b++) {
        batch.push(runWorker());
      }
      await Promise.all(batch);
    }

    const stageDurationSec = (Date.now() - stageStart) / 1000;
    const stagePerc = calculatePercentiles(stageLatencies);
    const stageResult = {
      stage: stage.name,
      concurrency: stage.concurrency,
      totalRequests: stage.totalRequests,
      successCount: stageLatencies.length,
      errors: stageErrors,
      errorRate: ((stageErrors / stage.totalRequests) * 100).toFixed(1) + '%',
      durationSec: stageDurationSec.toFixed(2),
      rps: (stageLatencies.length / stageDurationSec).toFixed(1),
      percentiles: stagePerc,
      statusDistribution: stageStatuses,
    };
    report.stagedLoad.push(stageResult);

    console.log(`    Success: ${stageLatencies.length}/${stage.totalRequests} | Errors: ${stageErrors} (${stageResult.errorRate})`);
    console.log(`    RPS:     ${stageResult.rps} req/s over ${stageDurationSec.toFixed(2)}s`);
    console.log(`    p50:     ${stagePerc.p50}ms | p95: ${stagePerc.p95}ms | p99: ${stagePerc.p99}ms | Mean: ${stagePerc.mean}ms`);

    // Cooldown pause between stages
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\n================================================================');
  console.log('              PRODUCTION AUDIT DIAGNOSTIC COMPLETE              ');
  console.log('================================================================');
}

runAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});

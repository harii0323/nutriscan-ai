import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from '../../functions/node_modules/firebase-admin';
import {
  authenticateUser,
  authenticateUserStrict,
  optionalAuth,
  rateLimit,
  limitConcurrency,
  deleteUserAccountData,
  extractJSON,
  app,
  deleteAccount,
} from '../../functions/lib/index.js';

// Top-level helper to dispatch requests through Express app
function dispatchApp(options) {
  return new Promise((resolve) => {
    const headers = { ...(options.headers || {}) };
    const req = {
      method: options.method || 'GET',
      url: options.url || '/',
      headers,
      body: options.body || {},
      query: options.query || {},
      ip: options.ip || '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    const resHeaders = {};
    let statusCode = 200;
    let bodyData = null;

    const res = {
      setHeader(name, val) {
        resHeaders[name.toLowerCase()] = val;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        bodyData = data;
        resolve({ status: statusCode, headers: resHeaders, body: bodyData });
      },
      send(data) {
        bodyData = data;
        resolve({ status: statusCode, headers: resHeaders, body: bodyData });
      },
      end() {
        resolve({ status: statusCode, headers: resHeaders, body: bodyData });
      },
    };

    app.handle(req, res, (err) => {
      if (err) {
        resolve({ status: 500, headers: resHeaders, error: err.message });
      }
    });
  });
}


describe('Backend Security: Authentication Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects request with 401 when Authorization header is completely missing', async () => {
    const req = {
      headers: {},
      correlationId: 'req-test-1',
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    const next = vi.fn();

    await authenticateUser(req, res, next);

    expect(responseStatus).toBe(401);
    expect(responseBody.code).toBe('UNAUTHORIZED');
    expect(responseBody.error).toContain('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with 401 when Authorization header does not use Bearer scheme', async () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      correlationId: 'req-test-2',
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    const next = vi.fn();

    await authenticateUser(req, res, next);

    expect(responseStatus).toBe(401);
    expect(responseBody.code).toBe('UNAUTHORIZED');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with 401 when Bearer token is empty string', async () => {
    const req = {
      headers: { authorization: 'Bearer   ' },
      correlationId: 'req-test-3',
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    const next = vi.fn();

    await authenticateUser(req, res, next);

    expect(responseStatus).toBe(401);
    expect(responseBody.code).toBe('MALFORMED_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with TOKEN_EXPIRED when Firebase reports expired token', async () => {
    const req = {
      headers: { authorization: 'Bearer expired-sample-token' },
      correlationId: 'req-test-4',
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    const next = vi.fn();

    vi.spyOn(admin.auth(), 'verifyIdToken').mockRejectedValue({
      code: 'auth/id-token-expired',
      message: 'Token has expired',
    });

    await authenticateUser(req, res, next);

    expect(responseStatus).toBe(401);
    expect(responseBody.code).toBe('TOKEN_EXPIRED');
    expect(responseBody.error).toContain('expired');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with INVALID_TOKEN when Firebase reports invalid signature', async () => {
    const req = {
      headers: { authorization: 'Bearer invalid-token' },
      correlationId: 'req-test-5',
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    const next = vi.fn();

    vi.spyOn(admin.auth(), 'verifyIdToken').mockRejectedValue(new Error('Invalid token'));

    await authenticateUser(req, res, next);

    expect(responseStatus).toBe(401);
    expect(responseBody.code).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches verified user payload to req.user and proceeds when token is valid', async () => {
    const req = {
      headers: { authorization: 'Bearer valid-id-token' },
      correlationId: 'req-test-6',
    };
    const res = {
      status: vi.fn(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const mockDecoded = {
      uid: 'verified-user-123',
      email: 'verified@example.com',
      auth_time: Date.now(),
    };
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue(mockDecoded);

    await authenticateUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(mockDecoded);
    expect(req.user.uid).toBe('verified-user-123');
  });

  it('allows guest to proceed unauthenticated in optionalAuth when header is absent', async () => {
    const req = { headers: {} };
    const res = {};
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});

describe('Backend Security: Distributed Rate Limiter & Fallback Resiliency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows requests within threshold and blocks when maxRequests exceeded via distributed transaction', async () => {
    let callCount = 0;
    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return { allowed: true, count: callCount, resetAt: Date.now() + 60000 };
      }
      return { allowed: false, count: callCount, resetAt: Date.now() + 60000 };
    });

    const limiter = rateLimit(60000, 2, 'tx_tier');
    const req = {
      ip: '10.0.0.1',
      headers: {},
      socket: { remoteAddress: '10.0.0.1' },
      correlationId: 'rate-tx-test',
    };

    let responseStatus = 0;
    let retryAfterHeader = null;
    let responseJson = null;

    const createRes = () => ({
      setHeader(name, val) {
        if (name === 'Retry-After') retryAfterHeader = val;
      },
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    });

    const next1 = vi.fn();
    await limiter(req, createRes(), next1);
    expect(next1).toHaveBeenCalled();

    const next2 = vi.fn();
    await limiter(req, createRes(), next2);
    expect(next2).toHaveBeenCalled();

    // 3rd request blocked by distributed limiter
    const next3 = vi.fn();
    await limiter(req, createRes(), next3);
    expect(next3).not.toHaveBeenCalled();
    expect(responseStatus).toBe(429);
    expect(responseJson.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(retryAfterHeader).toBeTruthy();
  });

  it('fails safely to local sliding window when Firestore transaction errors or times out', async () => {
    // Simulate Firestore unavailable
    vi.spyOn(admin.firestore(), 'runTransaction').mockRejectedValue(new Error('Firestore connection failure'));

    const limiter = rateLimit(60000, 2, 'fallback_tier');
    const req = {
      ip: '10.0.0.99',
      headers: {},
      socket: { remoteAddress: '10.0.0.99' },
      correlationId: 'rate-fallback-test',
    };

    let responseStatus = 0;
    let retryAfterHeader = null;
    let responseJson = null;

    const createRes = () => ({
      setHeader(name, val) {
        if (name === 'Retry-After') retryAfterHeader = val;
      },
      status(s) {
        responseStatus = s;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    });

    const next1 = vi.fn();
    await limiter(req, createRes(), next1);
    expect(next1).toHaveBeenCalled();

    const next2 = vi.fn();
    await limiter(req, createRes(), next2);
    expect(next2).toHaveBeenCalled();

    // 3rd request blocked by fallback in-memory limiter
    const next3 = vi.fn();
    await limiter(req, createRes(), next3);
    expect(next3).not.toHaveBeenCalled();
    expect(responseStatus).toBe(429);
    expect(responseJson.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(retryAfterHeader).toBeTruthy();
  });
});

describe('Backend Security: Robust JSON Parsing & Schema Validation', () => {
  it('extracts JSON cleanly from markdown code blocks', () => {
    const input = 'Here is the data:\n```json\n{"name":"Product X","healthGrade":"A"}\n```\nEnjoy!';
    const parsed = extractJSON(input);
    expect(parsed).toEqual({ name: 'Product X', healthGrade: 'A' });
  });

  it('extracts bare JSON object when code blocks are absent', () => {
    const input = 'Intro text {"name":"Pure Tea","healthGrade":"B"} trailing text';
    const parsed = extractJSON(input);
    expect(parsed.name).toBe('Pure Tea');
    expect(parsed.healthGrade).toBe('B');
  });

  it('extracts JSON array when model returns list', () => {
    const input = '["Item A", "Item B", "Item C"]';
    const parsed = extractJSON(input);
    expect(parsed).toEqual(['Item A', 'Item B', 'Item C']);
  });

  it('returns null on completely invalid non-JSON output', () => {
    const input = 'Sorry, as an AI I could not process your request.';
    const parsed = extractJSON(input);
    expect(parsed).toBeNull();
  });
});

describe('Backend Security: Account Deletion Idempotency & Bounded Batch Deletion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes bounded batch subcollection cleanup and deletes auth record', async () => {
    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };

    const emptySnapshot = {
      empty: true,
      docs: [],
      size: 0,
    };

    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(emptySnapshot),
      }),
    };

    const batchMock = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue({}),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);
    vi.spyOn(admin.firestore(), 'batch').mockReturnValue(batchMock);
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser').mockResolvedValue({});

    await deleteUserAccountData('test-user-active');

    expect(userDocMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ deletionStatus: 'in_progress' }),
      { merge: true }
    );
    expect(userDocMock.delete).toHaveBeenCalled();
    expect(deleteUserSpy).toHaveBeenCalledWith('test-user-active');
  });

  it('handles auth/user-not-found gracefully without throwing error (idempotency)', async () => {
    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      }),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);
    vi.spyOn(admin.auth(), 'deleteUser').mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(deleteUserAccountData('user-already-deleted')).resolves.not.toThrow();
  });

  it('rejects empty or invalid user ID for account erasure', async () => {
    await expect(deleteUserAccountData('')).rejects.toThrow('Valid user UID required');
    await expect(deleteUserAccountData(null)).rejects.toThrow('Valid user UID required');
  });
});

describe('Backend Security: Route Authentication Enforcement & Public Access Scope', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });


  it('enforces authentication on /analyzeProduct: rejects unauthenticated request with 401', async () => {
    const res = await dispatchApp({
      method: 'POST',
      url: '/analyzeProduct',
      body: { query: 'Green Tea' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('enforces authentication on /analyzeNutrition: rejects unauthenticated request with 401', async () => {
    const res = await dispatchApp({
      method: 'POST',
      url: '/analyzeNutrition',
      body: { foodName: 'Oatmeal' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('enforces authentication on /aiInsight: rejects unauthenticated request with 401', async () => {
    const res = await dispatchApp({
      method: 'POST',
      url: '/aiInsight',
      body: { foodName: 'Apple', insightType: 'coach' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('enforces authentication on /chat: rejects unauthenticated request with 401', async () => {
    const res = await dispatchApp({
      method: 'POST',
      url: '/chat',
      body: { messages: [{ role: 'user', content: 'Hello' }] },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('enforces authentication on /identifyFood: rejects unauthenticated request with 401', async () => {
    const res = await dispatchApp({
      method: 'POST',
      url: '/identifyFood',
      body: { imageBase64: 'abc123' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('preserves public access for /getProductData without authentication token', async () => {
    // Should NOT be 401; returns 400 when query/barcode is missing
    const res = await dispatchApp({
      method: 'GET',
      url: '/getProductData',
      query: {},
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
  });

  it('attaches security headers to all responses', async () => {
    const res = await dispatchApp({
      method: 'GET',
      url: '/health',
    });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('sanitizes correlation ID and does not reflect untrusted characters', async () => {
    const res = await dispatchApp({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': '<script>alert(1)</script>' },
    });
    // Untrusted characters should cause generation of a safe randomUUID
    expect(res.headers['x-request-id']).not.toContain('<script>');
  });

  it('validates chat input schema: rejects oversized message history (>30 messages)', async () => {
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({ uid: 'test-user' });
    const messages = Array.from({ length: 35 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const res = await dispatchApp({
      method: 'POST',
      url: '/chat',
      headers: { authorization: 'Bearer valid-token' },
      body: { messages },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('validates chat input schema: rejects when last message is not user role', async () => {
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({ uid: 'test-user' });
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];

    const res = await dispatchApp({
      method: 'POST',
      url: '/chat',
      headers: { authorization: 'Bearer valid-token' },
      body: { messages },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_LAST_MESSAGE');
  });
});

describe('Backend Security: Concurrency Controls & Active Request Throttling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces maximum concurrent operations per user and rejects burst requests with 429', async () => {
    const limiter = limitConcurrency(2);
    const req = {
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' },
      user: { uid: 'concurrent-user-1' },
      correlationId: 'req-conc-1',
    };

    let status3 = 0;
    let json3 = null;

    const listeners = [];
    const createMockRes = (onStatus, onJson) => ({
      setHeader: vi.fn(),
      status(s) {
        if (onStatus) onStatus(s);
        return this;
      },
      json(d) {
        if (onJson) onJson(d);
        return this;
      },
      on(event, fn) {
        listeners.push({ event, fn });
      },
    });

    const next1 = vi.fn();
    limiter(req, createMockRes(), next1);
    expect(next1).toHaveBeenCalledTimes(1);

    const next2 = vi.fn();
    limiter(req, createMockRes(), next2);
    expect(next2).toHaveBeenCalledTimes(1);

    // 3rd concurrent request exceeds limit of 2
    const next3 = vi.fn();
    limiter(
      req,
      createMockRes(
        (s) => (status3 = s),
        (d) => (json3 = d)
      ),
      next3
    );
    expect(next3).not.toHaveBeenCalled();
    expect(status3).toBe(429);
    expect(json3.code).toBe('CONCURRENT_REQUEST_LIMIT');

    // Finish one request
    listeners.filter((l) => l.event === 'finish')[0]?.fn();

    // Now a new request should be allowed
    const next4 = vi.fn();
    limiter(req, createMockRes(() => {}), next4);
    expect(next4).toHaveBeenCalledTimes(1);
  });
});

describe('Backend Security: Fail-Closed Rate Limiter Policy & Anonymized IP Keys', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails closed when distributed store is down for fail_closed policy (sensitive/expensive tiers)', async () => {
    vi.spyOn(admin.firestore(), 'runTransaction').mockRejectedValue(new Error('Firestore timeout / unreachable'));

    const failClosedLimiter = rateLimit(60000, 5, 'sensitive_tier', 'fail_closed');
    const req = {
      ip: '203.0.113.195',
      socket: { remoteAddress: '203.0.113.195' },
      correlationId: 'rate-fail-closed',
    };

    let statusCode = 0;
    let resJson = null;
    const res = {
      setHeader: vi.fn(),
      status(s) {
        statusCode = s;
        return this;
      },
      json(d) {
        resJson = d;
        return this;
      },
    };
    const next = vi.fn();

    await failClosedLimiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(429);
    expect(resJson.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('hashes IP address with SHA-256 and never exposes raw IP in rate limit doc path', async () => {
    let capturedDocPath = '';
    vi.spyOn(admin.firestore(), 'doc').mockImplementation((docPath) => {
      capturedDocPath = docPath;
      return {
        get: vi.fn(),
        set: vi.fn(),
      };
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const limiter = rateLimit(60000, 10, 'ip_test');
    const rawIp = '198.51.100.42';
    const req = {
      ip: rawIp,
      socket: { remoteAddress: rawIp },
      correlationId: 'rate-hash-test',
    };
    const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    await limiter(req, res, next);

    expect(capturedDocPath).not.toContain(rawIp);
    expect(capturedDocPath).toMatch(/system_rate_limits\/ip_test_ip_[a-f0-9]{16}/);
  });
});

describe('Backend Security: Strict Authentication for Sensitive Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects revoked tokens with TOKEN_REVOKED using verifyIdToken checkRevoked flag', async () => {
    const req = {
      headers: { authorization: 'Bearer revoked-token' },
      correlationId: 'req-revoked',
    };
    let status = 0;
    let body = null;
    const res = {
      status(s) {
        status = s;
        return this;
      },
      json(d) {
        body = d;
        return this;
      },
    };
    const next = vi.fn();

    vi.spyOn(admin.auth(), 'verifyIdToken').mockImplementation(async (token, checkRevoked) => {
      expect(checkRevoked).toBe(true);
      const err = new Error('Token revoked');
      err.code = 'auth/id-token-revoked';
      throw err;
    });

    await authenticateUserStrict(req, res, next);

    expect(status).toBe(401);
    expect(body.code).toBe('TOKEN_REVOKED');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects stale authentication sessions (>1 hour old) for sensitive operations', async () => {
    const req = {
      headers: { authorization: 'Bearer stale-token' },
      correlationId: 'req-stale',
    };
    let status = 0;
    let body = null;
    const res = {
      status(s) {
        status = s;
        return this;
      },
      json(d) {
        body = d;
        return this;
      },
    };
    const next = vi.fn();

    // Authenticated 2 hours ago
    const twoHoursAgoSeconds = Math.floor((Date.now() - 7200 * 1000) / 1000);
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({
      uid: 'user-stale',
      auth_time: twoHoursAgoSeconds,
    });

    await authenticateUserStrict(req, res, next);

    expect(status).toBe(403);
    expect(body.code).toBe('RECENT_AUTH_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Backend Security: Account Deletion HTTP Endpoint (/deleteAccount)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated request with 401 UNAUTHORIZED when Authorization header is missing', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 401 UNAUTHORIZED when Authorization header does not use Bearer scheme', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 401 MALFORMED_TOKEN when Bearer token is empty or whitespace', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer   ' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MALFORMED_TOKEN');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 401 INVALID_TOKEN when Firebase reports invalid token signature', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    vi.spyOn(admin.auth(), 'verifyIdToken').mockRejectedValue(new Error('Invalid token'));
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 401 TOKEN_EXPIRED when Firebase reports expired session', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    vi.spyOn(admin.auth(), 'verifyIdToken').mockRejectedValue({
      code: 'auth/id-token-expired',
      message: 'Token has expired',
    });
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer expired-token' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 401 TOKEN_REVOKED when Firebase reports revoked token', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    vi.spyOn(admin.auth(), 'verifyIdToken').mockRejectedValue({
      code: 'auth/id-token-revoked',
      message: 'Token was revoked',
    });
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer revoked-token' },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_REVOKED');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('rejects request with 403 RECENT_AUTH_REQUIRED when authentication was older than 1 hour', async () => {
    const deleteUserSpy = vi.spyOn(admin.auth(), 'deleteUser');
    const staleAuthTimeSeconds = Math.floor((Date.now() - 7200 * 1000) / 1000); // 2h ago
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({
      uid: 'stale-user-123',
      auth_time: staleAuthTimeSeconds,
    });
    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer stale-token' },
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RECENT_AUTH_REQUIRED');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('enforces rate limiting on /deleteAccount and rejects excessive requests with 429', async () => {
    const recentAuthTime = Math.floor(Date.now() / 1000) - 60;
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({
      uid: 'rate-limited-del-user',
      auth_time: recentAuthTime,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ count: 3, resetAt: Date.now() + 3600000 }),
        }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('handles Firestore failure during deletion and returns 500 DELETION_FAILED safely without exposing stack traces', async () => {
    const recentAuthTime = Math.floor(Date.now() / 1000) - 60;
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({
      uid: 'error-user-123',
      auth_time: recentAuthTime,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const userDocMock = {
      set: vi.fn().mockRejectedValue(new Error('Firestore unavailable / connection closed')),
    };
    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);

    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('DELETION_FAILED');
    expect(res.body.error).toContain('Account erasure failed');
    expect(res.body.stack).toBeUndefined();
  });

  it('successfully completes account deletion for a valid recently authenticated user', async () => {
    const recentAuthTime = Math.floor(Date.now() / 1000) - 30;
    vi.spyOn(admin.auth(), 'verifyIdToken').mockResolvedValue({
      uid: 'success-user-999',
      auth_time: recentAuthTime,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      }),
      doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue({}) }),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);
    const deleteAuthSpy = vi.spyOn(admin.auth(), 'deleteUser').mockResolvedValue({});

    const res = await dispatchApp({
      method: 'POST',
      url: '/deleteAccount',
      headers: { authorization: 'Bearer fresh-valid-token' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(deleteAuthSpy).toHaveBeenCalledWith('success-user-999');
    expect(userDocMock.delete).toHaveBeenCalled();
  });
});

describe('Backend Security: Account Deletion Firebase Callable Function (deleteAccount)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated invocation: throws unauthenticated when request.auth is missing', async () => {
    const deleteAuthSpy = vi.spyOn(admin.auth(), 'deleteUser');
    await expect(deleteAccount.run({})).rejects.toMatchObject({
      code: 'unauthenticated',
      message: expect.stringContaining('authenticated'),
    });
    expect(deleteAuthSpy).not.toHaveBeenCalled();
  });

  it('blocks IDOR attempt: caller A attempting to delete user B throws permission-denied', async () => {
    const deleteAuthSpy = vi.spyOn(admin.auth(), 'deleteUser');
    await expect(
      deleteAccount.run({
        auth: {
          uid: 'user-attacker',
          token: { auth_time: Math.floor(Date.now() / 1000) },
        },
        data: { uid: 'user-victim' },
      })
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: expect.stringContaining('only delete your own account'),
    });
    expect(deleteAuthSpy).not.toHaveBeenCalled();
  });

  it('rejects request when caller does not exist in Firebase Auth (throws not-found)', async () => {
    vi.spyOn(admin.auth(), 'getUser').mockRejectedValue({ code: 'auth/user-not-found' });
    await expect(
      deleteAccount.run({
        auth: {
          uid: 'ghost-user',
          token: { auth_time: Math.floor(Date.now() / 1000) },
        },
      })
    ).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('rejects request when caller account is disabled (throws permission-denied)', async () => {
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'disabled-user',
      disabled: true,
    });
    await expect(
      deleteAccount.run({
        auth: {
          uid: 'disabled-user',
          token: { auth_time: Math.floor(Date.now() / 1000) },
        },
      })
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects revoked token when tokensValidAfterTime is newer than auth_time (throws unauthenticated)', async () => {
    const authTime = Math.floor(Date.now() / 1000) - 600; // 10m ago
    const revokedAtIso = new Date(Date.now() - 60 * 1000).toISOString(); // revoked 1m ago
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'revoked-caller',
      disabled: false,
      tokensValidAfterTime: revokedAtIso,
    });
    await expect(
      deleteAccount.run({
        auth: {
          uid: 'revoked-caller',
          token: { auth_time: authTime },
        },
      })
    ).rejects.toMatchObject({
      code: 'unauthenticated',
      message: expect.stringContaining('revoked'),
    });
  });

  it('rejects stale session (>1 hour old) for sensitive callable deletion (throws permission-denied)', async () => {
    const staleAuthTime = Math.floor(Date.now() / 1000) - 7200; // 2h ago
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'stale-caller',
      disabled: false,
    });
    await expect(
      deleteAccount.run({
        auth: {
          uid: 'stale-caller',
          token: { auth_time: staleAuthTime },
        },
      })
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: expect.stringContaining('Recent authentication required'),
    });
  });

  it('enforces rate limit and throws resource-exhausted when rate threshold is exceeded', async () => {
    const freshAuthTime = Math.floor(Date.now() / 1000) - 60;
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'rate-limited-caller',
      disabled: false,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ count: 3, resetAt: Date.now() + 3600000 }),
        }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    await expect(
      deleteAccount.run({
        auth: {
          uid: 'rate-limited-caller',
          token: { auth_time: freshAuthTime },
        },
      })
    ).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: expect.stringContaining('rate limit exceeded'),
    });
  });

  it('fails closed and throws resource-exhausted if rate limiter transaction encounters error', async () => {
    const freshAuthTime = Math.floor(Date.now() / 1000) - 60;
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'fail-closed-caller',
      disabled: false,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockRejectedValue(new Error('Firestore connection failure'));

    await expect(
      deleteAccount.run({
        auth: {
          uid: 'fail-closed-caller',
          token: { auth_time: freshAuthTime },
        },
      })
    ).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: expect.stringContaining('Abuse protection check temporarily unavailable'),
    });
  });

  it('handles partial deletion failure gracefully, records failure status, and allows safe retry', async () => {
    const freshAuthTime = Math.floor(Date.now() / 1000) - 60;
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'retry-caller-123',
      disabled: false,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Transient subcollection query timeout')),
      }),
      doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue({}) }),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);

    await expect(
      deleteAccount.run({
        auth: {
          uid: 'retry-caller-123',
          token: { auth_time: freshAuthTime },
        },
      })
    ).rejects.toMatchObject({
      code: 'internal',
    });

    expect(userDocMock.set).toHaveBeenCalledWith(
      expect.objectContaining({
        deletionStatus: 'failed',
      }),
      { merge: true }
    );
  });

  it('successfully completes callable account deletion for dedicated test user with recent session', async () => {
    const freshAuthTime = Math.floor(Date.now() / 1000) - 15;
    vi.spyOn(admin.auth(), 'getUser').mockResolvedValue({
      uid: 'valid-callable-test-user',
      disabled: false,
    });

    vi.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb) => {
      return cb({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      }),
      doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue({}) }),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);
    const deleteAuthSpy = vi.spyOn(admin.auth(), 'deleteUser').mockResolvedValue({});

    const result = await deleteAccount.run({
      auth: {
        uid: 'valid-callable-test-user',
        token: { auth_time: freshAuthTime },
      },
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(deleteAuthSpy).toHaveBeenCalledWith('valid-callable-test-user');
    expect(userDocMock.delete).toHaveBeenCalled();
  });
});

describe('Backend Security: Audit Logs & Privacy Hygiene', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('hashes user UID with SHA-256 and never logs raw UID in audit trail', async () => {
    let capturedAuditDoc = null;
    const userDocMock = {
      set: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const collectionMock = {
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      }),
      doc: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((data) => {
          capturedAuditDoc = data;
          return Promise.resolve();
        }),
      }),
    };

    vi.spyOn(admin.firestore(), 'doc').mockReturnValue(userDocMock);
    vi.spyOn(admin.firestore(), 'collection').mockReturnValue(collectionMock);
    vi.spyOn(admin.auth(), 'deleteUser').mockResolvedValue({});

    const rawUid = 'confidential-user-privacy-test-999';
    await deleteUserAccountData(rawUid);

    expect(capturedAuditDoc).toBeDefined();
    expect(capturedAuditDoc.action).toBe('USER_ACCOUNT_DELETED');
    expect(capturedAuditDoc.userIdHash).not.toBe(rawUid);
    expect(capturedAuditDoc.userIdHash).toMatch(/^[a-f0-9]{64}$/);
    expect(capturedAuditDoc).not.toHaveProperty('token');
    expect(capturedAuditDoc).not.toHaveProperty('authorization');
  });
});



import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from '../../functions/node_modules/firebase-admin';
import {
  authenticateUser,
  optionalAuth,
  rateLimit,
  deleteUserAccountData,
  extractJSON,
  app,
} from '../../functions/lib/index.js';

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

  // Helper to dispatch request through express app
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

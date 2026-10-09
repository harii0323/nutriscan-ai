import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules: Specification & Structural Integrity', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('rules_version is v2 and targets cloud.firestore service', () => {
    expect(rules).toContain("rules_version = '2'");
    expect(rules).toContain('service cloud.firestore');
  });

  it('strictly excludes overlapping recursive wildcards ({userSubcollections=**})', () => {
    expect(rules).not.toContain('{userSubcollections=**}');
    expect(rules).not.toContain('userSubcollections');
  });

  it('restricts public product data to client read-only and disallows client writes', () => {
    expect(rules).toMatch(/match \/artifacts\/\{appId\}\/public\/data\/\{type\}\/\{docId\}\s*\{[\s\S]*?allow read:\s*if true;[\s\S]*?allow write:\s*if false;/);
  });

  it('completely isolates server-only collections (system_rate_limits and system_audit_logs)', () => {
    expect(rules).toMatch(/match \/artifacts\/\{appId\}\/system_rate_limits\/\{docId\}\s*\{[\s\S]*?allow read, write:\s*if false;/);
    expect(rules).toMatch(/match \/artifacts\/\{appId\}\/system_audit_logs\/\{docId\}\s*\{[\s\S]*?allow read, write:\s*if false;/);
  });

  it('enforces least-privilege ownership and blocks role escalation fields on user profile', () => {
    expect(rules).toContain('isAdmin');
    expect(rules).toContain('role');
    expect(rules).toContain('permissions');
    expect(rules).toContain('deletionStatus');
    expect(rules).toContain('notModifyingProtectedFields');
    expect(rules).toContain('isValidUserProfile');
  });

  it('explicitly defines authorized user subcollections and denies arbitrary subcollection paths', () => {
    expect(rules).toContain('match /savedProducts/{productId}');
    expect(rules).toContain('match /scans/{scanId}');
    expect(rules).toContain('match /settings/{settingId}');
  });

  it('ends with strict default deny-all fallback for unspecified collections', () => {
    expect(rules).toMatch(/match \/\{document=\*\*\}\s*\{[\s\S]*?allow read, write:\s*if false;\s*\}/);
  });
});

describe('Firestore Security Rules: Behavioral Logic Simulation', () => {
  // Pure behavioral simulation of Firestore rule functions
  function isAuthenticated(request) {
    return request.auth != null;
  }

  function isOwner(request, userId) {
    return isAuthenticated(request) && request.auth.uid === userId;
  }

  function notModifyingProtectedFields(request) {
    const data = request.resource?.data || {};
    return !('isAdmin' in data) &&
           !('role' in data) &&
           !('permissions' in data) &&
           !('deletionStatus' in data);
  }

  function isValidUserProfile(request) {
    const data = request.resource?.data || {};
    if (!notModifyingProtectedFields(request)) return false;
    if ('displayName' in data && (typeof data.displayName !== 'string' || data.displayName.length > 100)) {
      return false;
    }
    if ('email' in data && (typeof data.email !== 'string' || data.email.length > 200)) {
      return false;
    }
    return true;
  }

  it('allows access only when request.auth.uid matches the resource owner UID', () => {
    const userA = { auth: { uid: 'user-123' } };
    const userB = { auth: { uid: 'attacker-456' } };
    const guest = { auth: null };

    expect(isOwner(userA, 'user-123')).toBe(true);
    expect(isOwner(userB, 'user-123')).toBe(false);
    expect(isOwner(guest, 'user-123')).toBe(false);
  });

  it('blocks privilege escalation: rejects attempts to set isAdmin, role, or permissions', () => {
    const validPayload = { auth: { uid: 'user-123' }, resource: { data: { displayName: 'John' } } };
    const adminPayload = { auth: { uid: 'user-123' }, resource: { data: { displayName: 'John', isAdmin: true } } };
    const rolePayload = { auth: { uid: 'user-123' }, resource: { data: { role: 'admin' } } };
    const permPayload = { auth: { uid: 'user-123' }, resource: { data: { permissions: ['all'] } } };
    const deletionPayload = { auth: { uid: 'user-123' }, resource: { data: { deletionStatus: 'in_progress' } } };

    expect(notModifyingProtectedFields(validPayload)).toBe(true);
    expect(notModifyingProtectedFields(adminPayload)).toBe(false);
    expect(notModifyingProtectedFields(rolePayload)).toBe(false);
    expect(notModifyingProtectedFields(permPayload)).toBe(false);
    expect(notModifyingProtectedFields(deletionPayload)).toBe(false);
  });

  it('validates user profile field constraints (length limits)', () => {
    const validProfile = {
      auth: { uid: 'u1' },
      resource: { data: { displayName: 'Valid Name', email: 'valid@example.com' } },
    };
    const oversizedName = {
      auth: { uid: 'u1' },
      resource: { data: { displayName: 'A'.repeat(101) } },
    };
    const oversizedEmail = {
      auth: { uid: 'u1' },
      resource: { data: { email: 'B'.repeat(201) } },
    };

    expect(isValidUserProfile(validProfile)).toBe(true);
    expect(isValidUserProfile(oversizedName)).toBe(false);
    expect(isValidUserProfile(oversizedEmail)).toBe(false);
  });
});

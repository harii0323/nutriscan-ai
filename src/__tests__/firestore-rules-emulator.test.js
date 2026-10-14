import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'nutriscan-rules-test';
const APP_ID = 'nutriscan-ai';
const rulesPath = path.resolve(__dirname, '../../firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

let testEnv;

beforeAll(async () => {
  const envHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
  const [host, portStr] = envHost.split(':');
  const port = Number(portStr) || 8085;

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host,
      port,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe('Behavioral Firestore Rules: Authentication & Private Records', () => {
  it('unauthenticated users cannot read or write private user records', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const userDoc = unauthedDb.doc(`artifacts/${APP_ID}/users/user-target`);

    await assertFails(userDoc.get());
    await assertFails(userDoc.set({ displayName: 'Anonymous Intruder' }));
    await assertFails(userDoc.delete());
  });

  it('authenticated users can read and write only their own user document', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const aliceDoc = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1`);

    await assertSucceeds(
      aliceDoc.set({
        displayName: 'Alice Cooper',
        email: 'alice@example.com',
      })
    );
    await assertSucceeds(aliceDoc.get());
  });

  it('users cannot read, modify, or delete another user data (IDOR prevention)', async () => {
    // Setup Alice document using admin rules-disabled context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`artifacts/${APP_ID}/users/alice-uid-1`).set({
        displayName: 'Alice Cooper',
        email: 'alice@example.com',
      });
    });

    const bobDb = testEnv.authenticatedContext('bob-uid-2').firestore();
    const aliceDocViaBob = bobDb.doc(`artifacts/${APP_ID}/users/alice-uid-1`);

    await assertFails(aliceDocViaBob.get());
    await assertFails(aliceDocViaBob.set({ displayName: 'Bob Tamper' }));
    await assertFails(aliceDocViaBob.update({ displayName: 'Bob Tamper' }));
    await assertFails(aliceDocViaBob.delete());
  });
});

describe('Behavioral Firestore Rules: Privilege Escalation Prevention', () => {
  it('users cannot create or update protected administrative fields (isAdmin, role, permissions, deletionStatus)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const aliceDoc = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1`);

    // Escalation: isAdmin
    await assertFails(aliceDoc.set({ displayName: 'Alice', isAdmin: true }));
    // Escalation: role
    await assertFails(aliceDoc.set({ displayName: 'Alice', role: 'admin' }));
    // Escalation: permissions
    await assertFails(aliceDoc.set({ displayName: 'Alice', permissions: ['all'] }));
    // Tampering: deletionStatus
    await assertFails(aliceDoc.set({ displayName: 'Alice', deletionStatus: 'in_progress' }));
  });

  it('validates user profile field constraints and rejects oversized strings', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const aliceDoc = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1`);

    // Oversized displayName (> 100 chars)
    await assertFails(
      aliceDoc.set({
        displayName: 'A'.repeat(101),
        email: 'alice@example.com',
      })
    );

    // Oversized email (> 200 chars)
    await assertFails(
      aliceDoc.set({
        displayName: 'Alice',
        email: 'B'.repeat(201),
      })
    );

    // Non-string displayName
    await assertFails(
      aliceDoc.set({
        displayName: 12345,
      })
    );

    // Valid profile
    await assertSucceeds(
      aliceDoc.set({
        displayName: 'Alice Valid',
        email: 'alice@valid.com',
      })
    );
  });
});

describe('Behavioral Firestore Rules: Public Product Cache & System Collections', () => {
  it('public product data is readable without auth, but strictly read-only for clients', async () => {
    // Populate public product using admin bypass
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`artifacts/${APP_ID}/public/data/foods/item-123`).set({
        name: 'Organic Green Tea',
        healthGrade: 'A',
      });
    });

    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const productDoc = unauthedDb.doc(`artifacts/${APP_ID}/public/data/foods/item-123`);

    // Public read succeeds
    await assertSucceeds(productDoc.get());

    // Public writes strictly fail
    await assertFails(productDoc.set({ name: 'Tampered' }));
    await assertFails(productDoc.delete());

    // Even authenticated clients cannot write to public product cache
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/public/data/foods/item-123`).set({ name: 'Alice Tamper' }));
  });

  it('internal rate-limit and audit collections remain strictly inaccessible to clients', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    // System rate limits: completely private
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/system_rate_limits/user_alice`).get());
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/system_rate_limits/user_alice`).set({ count: 0 }));
    await assertFails(unauthedDb.doc(`artifacts/${APP_ID}/system_rate_limits/ip_test`).get());

    // System audit logs: completely private
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/system_audit_logs/audit-1`).get());
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/system_audit_logs/audit-1`).set({ action: 'tamper' }));
  });
});

describe('Behavioral Firestore Rules: User Subcollections & Ownership', () => {
  it('enforces ownership on savedProducts subcollection', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const bobDb = testEnv.authenticatedContext('bob-uid-2').firestore();

    const aliceProduct = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/savedProducts/prod-1`);
    await assertSucceeds(aliceProduct.set({ name: 'Organic Almond Milk' }));
    await assertSucceeds(aliceProduct.get());

    // Bob cannot read or tamper with Alice's saved products
    const aliceProductViaBob = bobDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/savedProducts/prod-1`);
    await assertFails(aliceProductViaBob.get());
    await assertFails(aliceProductViaBob.set({ name: 'Bob Injected' }));
    await assertFails(aliceProductViaBob.delete());
  });

  it('enforces ownership on scans subcollection', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const bobDb = testEnv.authenticatedContext('bob-uid-2').firestore();

    const aliceScan = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/scans/scan-1`);
    await assertSucceeds(aliceScan.set({ barcode: '8901234567890', timestamp: '2026-10-14' }));
    await assertSucceeds(aliceScan.get());

    // Bob cannot access Alice's scan
    await assertFails(bobDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/scans/scan-1`).get());
  });

  it('enforces ownership on settings subcollection', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();
    const bobDb = testEnv.authenticatedContext('bob-uid-2').firestore();

    const aliceSetting = aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/settings/preferences`);
    await assertSucceeds(aliceSetting.set({ dietaryRestrictions: ['vegan'], theme: 'dark' }));
    await assertSucceeds(aliceSetting.get());

    // Bob cannot access Alice's settings
    await assertFails(bobDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/settings/preferences`).get());
  });

  it('denies access to arbitrary unknown document paths and collections', async () => {
    const aliceDb = testEnv.authenticatedContext('alice-uid-1').firestore();

    await assertFails(aliceDb.doc('arbitrary_collection/doc1').get());
    await assertFails(aliceDb.doc(`artifacts/${APP_ID}/users/alice-uid-1/unsupported_sub/item`).set({ a: 1 }));
    await assertFails(aliceDb.doc(`system_admin/secrets`).get());
  });
});

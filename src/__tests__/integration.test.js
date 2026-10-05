import { describe, it, expect } from 'vitest';
import { app, auth, db } from '../firebaseConfig.js';
import { PAGES } from '../routes.js';

describe('Integration Tests: Firebase Configuration & Modules', () => {
  it('initializes Firebase app instance with config values', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
    const expectedProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project';
    expect(app.options.projectId).toBe(expectedProjectId);
  });

  it('creates Firebase Auth service instance', () => {
    expect(auth).toBeDefined();
    expect(auth.app).toBe(app);
  });

  it('creates Firestore database service instance', () => {
    expect(db).toBeDefined();
    expect(db.app).toBe(app);
  });
});

describe('Integration Tests: App Routing & Navigation Metadata', () => {
  it('defines all required application routes', () => {
    expect(PAGES.home).toBeDefined();
    expect(PAGES.analysis).toBeDefined();
    expect(PAGES.blog).toBeDefined();
    expect(PAGES.chatbot).toBeDefined();
    expect(PAGES.profile).toBeDefined();
  });

  it('provides proper labels and icons for each route', () => {
    expect(PAGES.home.label).toBe('Products');
    expect(PAGES.analysis.label).toBe('Calories Analysis');
    expect(PAGES.chatbot.label).toBe('Chatbot');
  });
});

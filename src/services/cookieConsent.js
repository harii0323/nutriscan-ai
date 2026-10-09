// Cookie & Browser Storage Consent Manager
// Compliant with India DPDP Act 2023, EU ePrivacy / GDPR, and global consent standards.

export const CONSENT_STORAGE_KEY = 'nutriscan_cookie_consent';
export const CONSENT_EVENT_NAME = 'nutriscan_consent_changed';
export const CURRENT_CONSENT_VERSION = '2026.1';

export const COOKIE_CATEGORIES = [
  {
    id: 'strictlyNecessary',
    name: 'Strictly Necessary',
    required: true,
    description: 'Essential for authentication, user session persistence, security, and basic platform routing. These cannot be disabled.',
    items: [
      { name: 'Firebase Auth Tokens', provider: 'Google Firebase', purpose: 'Maintains authenticated user session across reloads.', expiry: 'Session / LocalStorage' },
      { name: 'nutriscan_cookie_consent', provider: 'NutriScan AI', purpose: 'Remembers your cookie and data privacy choices.', expiry: '1 year' },
    ],
  },
  {
    id: 'functional',
    name: 'Functional & Preferences',
    required: false,
    description: 'Enables enhanced interface personalization such as recent query filters, portion sizing presets, and layout states.',
    items: [
      { name: 'nutriscan_ui_prefs', provider: 'NutriScan AI', purpose: 'Stores active category preference and interface view mode.', expiry: 'Persistent (LocalStorage)' },
    ],
  },
  {
    id: 'analytics',
    name: 'Performance & Diagnostic Telemetry',
    required: false,
    description: 'Helps us diagnose application errors, latency bottlenecks, and network failures. No personal advertising or third-party tracking scripts are utilized.',
    items: [
      { name: 'Performance Metrics', provider: 'NutriScan AI Internal', purpose: 'Aggregated error reporting and API latency diagnostics.', expiry: 'Session' },
    ],
  },
];

export function getConsentPreferences() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsentPreferences(preferences) {
  if (typeof window === 'undefined') return;
  const payload = {
    strictlyNecessary: true,
    functional: Boolean(preferences?.functional),
    analytics: Boolean(preferences?.analytics),
    timestamp: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    enforceConsentPolicies();
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: payload }));
  } catch (e) {
    console.warn('Failed to save consent choices:', e);
  }
  return payload;
}

export function acceptAllCookies() {
  return saveConsentPreferences({ functional: true, analytics: true });
}

export function rejectOptionalCookies() {
  return saveConsentPreferences({ functional: false, analytics: false });
}

export function isConsentGranted(category) {
  const prefs = getConsentPreferences();
  if (category === 'strictlyNecessary') return true;
  return Boolean(prefs?.[category]);
}

export function enforceConsentPolicies() {
  if (typeof window === 'undefined') return;
  const prefs = getConsentPreferences();
  if (!prefs?.functional) {
    try {
      localStorage.removeItem('nutriscan_ui_prefs');
    } catch {
      // ignore storage access errors
    }
  }
}

export function hasUserRespondedToConsent() {
  return getConsentPreferences() !== null;
}

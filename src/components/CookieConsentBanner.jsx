// Cookie Consent Banner & Granular Preferences Modal
// Non-coercive, WCAG 2.2 AA compliant, DPDP-aligned consent interface
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, X, Cookie } from 'lucide-react';
import {
  getConsentPreferences,
  saveConsentPreferences,
  acceptAllCookies,
  rejectOptionalCookies,
  hasUserRespondedToConsent,
  COOKIE_CATEGORIES,
  CONSENT_EVENT_NAME,
} from '../services/cookieConsent.js';

export default function CookieConsentBanner({ onNavigate, forceOpen = false, onCloseModal }) {
  const [showBanner, setShowBanner] = useState(() => !hasUserRespondedToConsent());
  const [modalOpen, setModalOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    const existing = getConsentPreferences();
    return {
      functional: Boolean(existing?.functional),
      analytics: Boolean(existing?.analytics),
    };
  });
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  const isModalActive = modalOpen || forceOpen;
  const isBannerActive = showBanner && !isModalActive;

  useEffect(() => {
    const handleConsentChange = (e) => {
      if (e?.detail) {
        setPreferences({
          functional: Boolean(e.detail.functional),
          analytics: Boolean(e.detail.analytics),
        });
      }
    };

    window.addEventListener(CONSENT_EVENT_NAME, handleConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT_NAME, handleConsentChange);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    onCloseModal?.();
    previouslyFocusedElement.current?.focus();
  }, [onCloseModal]);

  // Keyboard accessibility: Escape key closes preferences modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalActive) {
        handleCloseModal();
      }
    };
    if (isModalActive) {
      previouslyFocusedElement.current = document.activeElement;
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalActive, handleCloseModal]);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
    handleCloseModal();
  };

  const handleRejectOptional = () => {
    rejectOptionalCookies();
    setShowBanner(false);
    handleCloseModal();
  };

  const handleSaveCustom = () => {
    saveConsentPreferences(preferences);
    setShowBanner(false);
    handleCloseModal();
  };

  const openCustomModal = () => {
    setModalOpen(true);
  };

  return (
    <>
      {/* ── Consent Banner (Bottom Floating Bar) ─────────────────────────── */}
      <AnimatePresence>
        {isBannerActive && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            role="region"
            aria-label="Cookie and Privacy Consent"
            style={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              right: 16,
              maxWidth: 960,
              margin: '0 auto',
              background: '#FFFFFF',
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 20px 48px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              zIndex: 900,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '0.6rem',
                background: '#ECFDF5', border: '1px solid #A7F3D0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Cookie size={19} color="#059669" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                  Privacy & Cookie Preferences
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#4B5563', lineHeight: 1.55 }}>
                  We respect your privacy. NutriScan AI uses strictly necessary cookies and local storage to secure your login session. We do not use third-party advertising trackers. You can choose whether to enable functional preferences or diagnostic metrics.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid #F1F5F9',
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={() => onNavigate?.('cookies')}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#0E3B2E', fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Read Cookie Policy
                </button>
                <button
                  onClick={() => onNavigate?.('privacy')}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#0E3B2E', fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Privacy Notice
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={openCustomModal}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 0.95rem', fontSize: '0.84rem' }}
                >
                  <Settings size={14} /> Customize
                </button>
                <button
                  onClick={handleRejectOptional}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}
                >
                  Reject Optional
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.15rem', fontSize: '0.84rem' }}
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Granular Preferences Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {isModalActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1100,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={handleCloseModal}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cookie-modal-title"
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '1.25rem',
                padding: '2rem',
                width: '100%',
                maxWidth: 580,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.25)',
                position: 'relative',
              }}
            >
              <button
                onClick={handleCloseModal}
                aria-label="Close cookie preferences dialog"
                style={{
                  position: 'absolute', top: '1.25rem', right: '1.25rem',
                  background: '#F1F5F9', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748B',
                }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <Shield size={22} color="#0E3B2E" />
                <h2 id="cookie-modal-title" style={{ margin: 0, fontSize: '1.35rem', color: '#0F172A' }}>
                  Manage Cookie Preferences
                </h2>
              </div>
              <p style={{ color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                Under the Digital Personal Data Protection Act, 2023, you have the right to control the personal data stored on your device. Configure your choices below:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                {COOKIE_CATEGORIES.map((cat) => {
                  const isRequired = cat.required;
                  const isChecked = isRequired || preferences[cat.id];

                  return (
                    <div
                      key={cat.id}
                      style={{
                        padding: '1.1rem',
                        borderRadius: '0.875rem',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                            {cat.name}
                          </span>
                          {isRequired ? (
                            <span style={{
                              background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                              borderRadius: '99px', padding: '0.1rem 0.55rem', fontSize: '0.7rem', fontWeight: 600,
                            }}>
                              Always Active
                            </span>
                          ) : (
                            <span style={{
                              background: '#F1F5F9', color: '#475569',
                              borderRadius: '99px', padding: '0.1rem 0.55rem', fontSize: '0.7rem', fontWeight: 500,
                            }}>
                              Optional
                            </span>
                          )}
                        </div>

                        {!isRequired && (
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => setPreferences(prev => ({ ...prev, [cat.id]: e.target.checked }))}
                              aria-label={`Enable ${cat.name}`}
                              style={{ width: 18, height: 18, accentColor: '#0E3B2E', cursor: 'pointer' }}
                            />
                          </label>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                        {cat.description}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {cat.items.map(item => (
                          <div key={item.name}>
                            <strong style={{ color: '#475569' }}>{item.name}:</strong> {item.purpose} ({item.expiry})
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.86rem' }}
                >
                  Reject All Optional
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="btn-secondary"
                    style={{ padding: '0.6rem 1.1rem', fontSize: '0.86rem' }}
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.3rem', fontSize: '0.86rem' }}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Cookie Policy Page
// Grounded in verified storage mechanisms and India DPDP Act 2023.
import React, { useState } from 'react';
import { Cookie, ArrowLeft, Settings } from 'lucide-react';
import { PageWrapper } from './Shared.jsx';
import { BUSINESS_CONFIG } from '../config/businessConfig.js';
import { COOKIE_CATEGORIES, getConsentPreferences } from '../services/cookieConsent.js';
import CookieConsentBanner from './CookieConsentBanner.jsx';

export default function CookiePolicyPage({ onNavigate }) {
  const [openSettingsDirectly, setOpenSettingsDirectly] = useState(false);
  const currentPreferences = getConsentPreferences();

  return (
    <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Navigation back button */}
        <button
          onClick={() => onNavigate?.('home')}
          className="btn-secondary"
          style={{ marginBottom: '1.5rem', padding: '0.45rem 0.95rem', fontSize: '0.84rem' }}
        >
          <ArrowLeft size={15} /> Back to Products
        </button>

        {/* Page Header */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '99px', padding: '0.3rem 0.85rem', marginBottom: '1rem' }}>
            <Cookie size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
              Transparency & Storage Controls
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0 0 0.75rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Cookie & Storage Policy
          </h1>

          <p style={{ margin: '0 0 1rem', color: '#4B5563', fontSize: '0.96rem', lineHeight: 1.6 }}>
            Understand the local storage, session keys, and browser technologies utilized across NutriScan AI.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.84rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
            <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
            <div><strong>Effective Date:</strong> {BUSINESS_CONFIG.effectiveDate}</div>
            <div><strong>Version:</strong> {BUSINESS_CONFIG.policyVersion}</div>
          </div>
        </div>

        {/* Cookie Policy Body */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
          lineHeight: 1.75,
          color: '#334155',
          fontSize: '0.94rem',
        }}>

          {/* Current Status Box */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '0.875rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.94rem', marginBottom: '0.2rem' }}>
                Your Current Consent Setting
              </div>
              <div style={{ color: '#64748B', fontSize: '0.84rem' }}>
                {currentPreferences ? (
                  <span>
                    Strictly Necessary: Active | Functional: {currentPreferences.functional ? 'Enabled' : 'Disabled'} | Telemetry: {currentPreferences.analytics ? 'Enabled' : 'Disabled'}
                  </span>
                ) : (
                  <span>Default configuration (Essential only until choice registered)</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setOpenSettingsDirectly(true)}
              className="btn-primary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
            >
              <Settings size={15} /> Manage Cookie Preferences
            </button>
          </div>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              1. What Are Cookies and Local Storage?
            </h2>
            <p>
              Cookies and local browser storage are compact data records placed on your computing device when visiting websites. Modern single-page applications utilize HTML5 LocalStorage and IndexedDB to deliver instantaneous responsiveness and preserve secure login sessions across tab closures.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              2. Complete Storage Inventory
            </h2>
            <p>We believe in total transparency. Below is an audit of the technologies running on NutriScan AI:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              {COOKIE_CATEGORIES.map((cat) => (
                <div key={cat.id} style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.92rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{cat.name}</span>
                    <span style={{ fontSize: '0.75rem', color: cat.required ? '#059669' : '#64748B', fontWeight: 600 }}>
                      {cat.required ? 'Strictly Necessary' : 'User Configurable'}
                    </span>
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.86rem', color: '#64748B' }}>{cat.description}</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                          <th style={{ padding: '0.4rem 0' }}>Key / Identifier</th>
                          <th style={{ padding: '0.4rem 0' }}>Provider</th>
                          <th style={{ padding: '0.4rem 0' }}>Purpose</th>
                          <th style={{ padding: '0.4rem 0' }}>Retention</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map(item => (
                          <tr key={item.name} style={{ borderBottom: '1px solid #F8FAFC' }}>
                            <td style={{ padding: '0.5rem 0', fontWeight: 600, color: '#0F172A' }}>{item.name}</td>
                            <td style={{ padding: '0.5rem 0', color: '#475569' }}>{item.provider}</td>
                            <td style={{ padding: '0.5rem 0', color: '#64748B' }}>{item.purpose}</td>
                            <td style={{ padding: '0.5rem 0', color: '#475569' }}>{item.expiry}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              3. Advertising and Third-Party Cross-Site Tracking
            </h2>
            <p>
              NutriScan AI <strong>does not use advertising cookies, marketing pixels, or third-party behavioral trackers</strong>. Your product searches, meal scans, and dietary inquiries are never synchronized with programmatic advertisement platforms or data brokerage entities.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              4. Managing Preferences in Your Browser
            </h2>
            <p>
              In addition to using our built-in preferences modal, you can delete or restrict stored data directly through browser settings:
            </p>
            <ul>
              <li><strong>Google Chrome:</strong> Settings &gt; Privacy and Security &gt; Third-Party Cookies / Site Data.</li>
              <li><strong>Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
              <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data.</li>
              <li><strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions &gt; Manage and delete cookies.</li>
            </ul>
            <p>
              Note: Clearing strictly necessary local storage will sign you out of your current session.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              5. Questions and Grievance Inquiries
            </h2>
            <p>
              For questions concerning browser storage compliance under the Digital Personal Data Protection Act, 2023:
            </p>
            <div style={{ background: '#FAFCFB', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
              <div><strong>Grievance Contact:</strong> {BUSINESS_CONFIG.grievanceOfficerName}</div>
              <div><strong>Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.grievanceEmail}`} style={{ color: '#0E3B2E', fontWeight: 600 }}>{BUSINESS_CONFIG.grievanceEmail}</a></div>
            </div>
          </section>

        </div>
      </div>

      {openSettingsDirectly && (
        <CookieConsentBanner
          onNavigate={onNavigate}
          forceOpen={true}
          onCloseModal={() => setOpenSettingsDirectly(false)}
        />
      )}
    </PageWrapper>
  );
}

// Privacy Policy Page
// Grounded in verified application architecture and India DPDP Act 2023 / Rules 2025.
import React from 'react';
import { Shield, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PageWrapper } from './Shared.jsx';
import { BUSINESS_CONFIG } from '../config/businessConfig.js';

export default function PrivacyPolicyPage({ onNavigate }) {
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
            <Shield size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
              Data Protection & Legal Transparency
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0 0 0.75rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Privacy Policy
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.84rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginTop: '1rem' }}>
            <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
            <div><strong>Effective Date:</strong> {BUSINESS_CONFIG.effectiveDate}</div>
            <div><strong>Version:</strong> {BUSINESS_CONFIG.policyVersion}</div>
            <div><strong>Governing Law:</strong> Digital Personal Data Protection Act, 2023 (India)</div>
          </div>
        </div>

        {/* Policy Body */}
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
          
          {/* Executive Summary */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={16} color="#059669" /> Key Highlights for Users
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>We collect email addresses and optional phone numbers strictly for account authentication and user records.</li>
              <li>When you scan food packages or upload plate photographs, image data and text queries are sent to Google Gemini AI to analyze ingredients and estimate nutritional values.</li>
              <li>We do not sell personal data or utilize third-party advertising tracking networks.</li>
              <li>You can download your entire data history or permanently delete your account directly inside the Profile settings at any time.</li>
            </ul>
          </div>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              1. Identity and Contact Details of the Data Fiduciary
            </h2>
            <p>
              This application is operated by <strong>{BUSINESS_CONFIG.legalName}</strong> (referred to herein as "NutriScan AI", "we", "us", or "our"). Under the Digital Personal Data Protection Act, 2023 (DPDP Act), we act as the Data Fiduciary regarding the personal data processed through the application.
            </p>
            <p>
              For inquiries regarding personal data processing or exercising Data Principal rights, contact our Data Protection and Grievance Officer:
            </p>
            <div style={{ background: '#FAFCFB', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
              <div><strong>Grievance Officer:</strong> {BUSINESS_CONFIG.grievanceOfficerName}</div>
              <div><strong>Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.grievanceEmail}`} style={{ color: '#0E3B2E', fontWeight: 600 }}>{BUSINESS_CONFIG.grievanceEmail}</a></div>
              <div><strong>Operational Location:</strong> {BUSINESS_CONFIG.jurisdiction}</div>
            </div>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              2. Categories of Personal Data Collected
            </h2>
            <p>We process only data strictly required to deliver nutritional intelligence and account persistence:</p>
            <ul>
              <li><strong>Account Identifiers:</strong> Email address, user display name, profile photo URL (if using Google OAuth), and mobile phone number (if using SMS OTP verification).</li>
              <li><strong>Photographs and Uploaded Media:</strong> Food package photographs, nutrition facts labels, ingredient lists, and meal plates captured via camera or uploaded as image files. These images are transmitted to external AI endpoints for inference.</li>
              <li><strong>Dietary Preferences, Allergies, and Nutrition Goals:</strong> Product search keywords, custom portion specifications, and saved bookmarks. Note: Any dietary sensitivities or allergy queries linked to an authenticated account are handled as identifiable personal data, never mischaracterized as anonymous.</li>
              <li><strong>Chatbot Inquiries:</strong> Interactive questions and conversational prompts submitted to NutriScan Assistant.</li>
              <li><strong>Technical Diagnostics:</strong> Browser user agent, device screen dimensions, error logs, and session authentication tokens.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              3. Purpose and Lawful Basis for Processing
            </h2>
            <p>We process personal data on the lawful basis of your explicit consent and reasonable legitimate uses:</p>
            <ul>
              <li><strong>Authentication and Account Management:</strong> Authenticating user identity, preventing fraudulent signups, and storing saved bookmarks.</li>
              <li><strong>Nutritional & Ingredient Analysis:</strong> Processing image frames and queries through automated models to output safety classifications and macros.</li>
              <li><strong>Security & Abuse Prevention:</strong> Enforcing API rate limits and preventing automated denial of service attacks.</li>
              <li><strong>Legal Compliance:</strong> Satisfying regulatory and legal obligations under applicable Indian statutes.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              4. External Processors, Third-Party AI Services & Cross-Border Transfers
            </h2>
            <p>
              To provide advanced image identification and nutritional evaluation, we integrate with reputable cloud infrastructure providers:
            </p>
            <ul>
              <li>
                <strong>Google Gemini AI (Google Cloud Platform):</strong> Uploaded food images, ingredient labels, and chatbot prompts are transmitted to Google Generative AI endpoints for multimodal parsing. Processing is conducted under Google API terms of service. We do not represent or guarantee that external AI service providers store zero telemetry; data handling complies with Google Cloud enterprise terms.
              </li>
              <li>
                <strong>Google Firebase:</strong> We utilize Firebase Authentication for secure identity management and Cloud Firestore for database caching and user bookmarks storage.
              </li>
              <li>
                <strong>OpenFoodFacts:</strong> Barcode lookups query public food databases to retrieve published packaging records.
              </li>
              <li>
                <strong>International Data Transfers:</strong> Cloud servers operated by Google and Firebase may process data in secure facilities located outside India (such as the United States or the European Union). Such processing is conducted under Section 16 of the Digital Personal Data Protection Act, 2023 and standard contractual safeguards.
              </li>
            </ul>
            <p>We do not sell, rent, or trade your personal information with data brokers or advertising networks.</p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              5. Data Retention and Deletion Procedures
            </h2>
            <p>
              Your personal data is retained only as long as necessary to provide service functionality:
            </p>
            <ul>
              <li><strong>Saved Products and Scan History:</strong> Retained in Cloud Firestore while your account is active.</li>
              <li><strong>Uploaded Media:</strong> Processed in memory for analysis; base64 strings are not permanently archived in our public database.</li>
              <li><strong>Account Erasure:</strong> When you execute "Delete Account" in the Profile dashboard, your Firestore user record, saved products sub-collection, scan history sub-collection, and Firebase Authentication credential are permanently deleted.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              6. Rights of Data Principals under DPDP Act, 2023
            </h2>
            <p>As a Data Principal under Indian law, you possess enforceable rights:</p>
            <ul>
              <li><strong>Right to Access Summary:</strong> You can download a structured JSON copy of all saved scans and account details using the "Download my data" feature in your Profile.</li>
              <li><strong>Right to Correction:</strong> You can edit your display name and update account information in Profile settings.</li>
              <li><strong>Right to Erasure:</strong> You can permanently remove your records at any time.</li>
              <li><strong>Right to Grievance Redressal:</strong> If you believe your data has been handled inconsistently with the law, submit a notice to our Grievance Officer at <a href={`mailto:${BUSINESS_CONFIG.grievanceEmail}`} style={{ color: '#0E3B2E' }}>{BUSINESS_CONFIG.grievanceEmail}</a>. We respond to grievances within the statutory timeline.</li>
              <li><strong>Right to Nominate:</strong> You may designate another individual to exercise rights on your behalf in the event of incapacity.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              7. Children's Data and Age Eligibility
            </h2>
            <p>
              NutriScan AI is designed for individuals aged 18 and older. We do not knowingly track, profile, or collect personal data from minors without verifiable parental consent. If you become aware that a minor has submitted personal data without parental authorization, contact us to have the information expunged immediately.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              8. Security Safeguards
            </h2>
            <p>
              We implement industry-standard organizational and technical safeguards: HTTPS encryption in transit, strict Firestore security rules isolating each user's documents to their authenticated UID, and least-privilege cloud access controls. While we maintain rigorous standards, no transmission across the Internet is completely impervious to compromise.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              9. Policy Revisions
            </h2>
            <p>
              We may revise this Privacy Policy periodically to reflect technological adjustments or regulatory rules under the Digital Personal Data Protection Rules, 2025. Material updates will be highlighted via a notification banner or updated revision stamp on this page.
            </p>
          </section>

        </div>
      </div>
    </PageWrapper>
  );
}

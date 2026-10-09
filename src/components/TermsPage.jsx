// Terms and Conditions Page
// Legally robust agreement compliant with Indian law and digital consumer protections.
import React from 'react';
import { ArrowLeft, AlertTriangle, Scale } from 'lucide-react';
import { PageWrapper } from './Shared.jsx';
import { BUSINESS_CONFIG } from '../config/businessConfig.js';

export default function TermsPage({ onNavigate }) {
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
            <Scale size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
              Terms of Service & Usage Agreement
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0 0 0.75rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Terms and Conditions
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.84rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginTop: '1rem' }}>
            <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
            <div><strong>Effective Date:</strong> {BUSINESS_CONFIG.effectiveDate}</div>
            <div><strong>Governing Jurisdiction:</strong> {BUSINESS_CONFIG.jurisdiction}</div>
          </div>
        </div>

        {/* Terms Body */}
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

          {/* Medical Notice Alert */}
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderLeft: '4px solid #D97706',
            borderRadius: '0.875rem',
            padding: '1.25rem',
            marginBottom: '2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700, color: '#92400E' }}>
              <AlertTriangle size={18} color="#D97706" /> IMPORTANT MEDICAL & HEALTH DISCLAIMER
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#78350F', lineHeight: 1.6 }}>
              NutriScan AI is an educational technology application developed to assist consumers in understanding product labels and nutritional declarations. Assessments, health scores, ingredient classifications, and calorie estimations do not constitute medical diagnosis, allergy management, or clinical dietetic treatment. Always consult a qualified medical physician or certified dietician before making major dietary adjustments or managing health conditions.
            </p>
          </div>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the NutriScan AI website, mobile interface, or related application programming interfaces, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not consent to these terms, you must refrain from using the platform.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              2. Eligibility and Account Responsibility
            </h2>
            <p>
              You must be at least 18 years of age or possess legal parental authorization to create an account. When creating an account via email, phone OTP, or Google sign-in:
            </p>
            <ul>
              <li>You agree to provide true, accurate, and current information.</li>
              <li>You are solely responsible for maintaining the confidentiality of your authentication credentials.</li>
              <li>You agree to notify us immediately if you suspect unauthorized access to your account.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              3. AI-Generated Data and Inaccuracy Limitations
            </h2>
            <p>
              Product evaluations are generated through automated artificial intelligence algorithms (including Google Gemini AI) and public data repositories (such as OpenFoodFacts). Because manufacturers periodically update formulations, ingredient ratios, and manufacturing lines without prior notice:
            </p>
            <ul>
              <li>We cannot guarantee that ingredient classifications or allergen warnings are 100% comprehensive or error-free.</li>
              <li>Users with severe or life-threatening food allergies must physically inspect the printed product packaging before consumption.</li>
              <li>Health grades (A through F) are computed from public nutritional guidelines (such as NOVA processing classifications and FSSAI standards) and do not reflect government agency endorsements.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              4. Permitted Use and Prohibited Conduct
            </h2>
            <p>You agree to use NutriScan AI solely for personal, non-commercial purposes. You may not:</p>
            <ul>
              <li>Reverse engineer, decompile, scrape, or systematically harvest data from the service.</li>
              <li>Transmit malicious software, scripts, or excessive requests designed to degrade server stability.</li>
              <li>Upload imagery containing illegal, defamatory, obscene, or infringing material.</li>
              <li>Circumvent rate limits, authentication safeguards, or access controls.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              5. Intellectual Property
            </h2>
            <p>
              The design system, branding, icons, custom software, compilation, and editorial articles are the proprietary property of <strong>{BUSINESS_CONFIG.legalName}</strong>. You retain ownership of photographs you capture and upload; however, you grant NutriScan AI a non-exclusive license to process and display such images solely to perform the requested nutritional analysis.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable Indian law, NutriScan AI, its maintainers, and infrastructure providers will not be liable for any indirect, incidental, punitive, or consequential damages resulting from your use of or reliance on AI analysis, nutritional estimates, or third-party links.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              7. Governing Law and Dispute Resolution
            </h2>
            <p>
              These Terms will be governed by and construed in accordance with the laws of the Republic of India. Any controversy or dispute arising out of or related to these Terms will be subject to the exclusive jurisdiction of the competent courts in Bengaluru or New Delhi, India.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              8. Contact Details
            </h2>
            <p>
              For legal notices, terms inquiries, or reporting terms violations:
            </p>
            <div style={{ background: '#FAFCFB', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
              <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
              <div><strong>Support Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} style={{ color: '#0E3B2E', fontWeight: 600 }}>{BUSINESS_CONFIG.supportEmail}</a></div>
              <div><strong>Grievance Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.grievanceEmail}`} style={{ color: '#0E3B2E', fontWeight: 600 }}>{BUSINESS_CONFIG.grievanceEmail}</a></div>
            </div>
          </section>

        </div>
      </div>
    </PageWrapper>
  );
}

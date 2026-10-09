// Refund & Cancellation Policy Page
// Clear, unambiguous commercial disclosure for users and institutional partners.
import React from 'react';
import { CreditCard, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PageWrapper } from './Shared.jsx';
import { BUSINESS_CONFIG } from '../config/businessConfig.js';

export default function RefundPolicyPage({ onNavigate }) {
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
            <CreditCard size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
              Billing & Commercial Terms
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0 0 0.75rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Pricing, Cancellation & Refund Policy
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.84rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginTop: '1rem' }}>
            <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
            <div><strong>Effective Date:</strong> {BUSINESS_CONFIG.effectiveDate}</div>
            <div><strong>Policy Version:</strong> {BUSINESS_CONFIG.policyVersion}</div>
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

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={16} color="#059669" /> Free Consumer Access
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#065F46', lineHeight: 1.55 }}>
              All core consumer features of NutriScan AI including packaged product scanning, camera OCR, calorie breakdowns, and interactive nutritional guidance are currently offered completely free of charge. No credit card or payment information is required to access these features.
            </p>
          </div>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              1. Consumer Tier Pricing
            </h2>
            <p>
              Users can register, scan products, review nutritional grades, search ingredients, and interact with NutriScan Assistant at no cost. Because no consumer charges are assessed, fees, recurring subscriptions, and billing transactions do not apply to standard user accounts.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              2. Future Premium Services or Enterprise APIs
            </h2>
            <p>
              In the event that NutriScan AI introduces optional premium subscriptions, high-volume developer APIs, or specialized commercial consulting:
            </p>
            <ul>
              <li><strong>Prior Disclosure:</strong> All pricing, billing intervals, and renewal terms will be explicitly disclosed prior to checkout with no hidden charges.</li>
              <li><strong>Cancellation Rights:</strong> Subscribers may cancel recurring plans at any time via account settings. Access will continue through the end of the prepaid billing cycle.</li>
              <li><strong>Refund Requests:</strong> Where technical service outages prevent platform utilization, refund requests submitted within 7 calendar days of charge will be evaluated and credited to the original payment method in accordance with applicable consumer protection regulations.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              3. Account Termination and Data Access
            </h2>
            <p>
              Closing or deleting an account does not incur any cancellation fees or penalties. You can permanently erase all stored records by selecting "Delete Account" in your Profile settings.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.4rem', color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              4. Commercial Inquiries & Billing Support
            </h2>
            <p>For questions regarding enterprise integration or billing terms:</p>
            <div style={{ background: '#FAFCFB', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
              <div><strong>Support Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} style={{ color: '#0E3B2E', fontWeight: 600 }}>{BUSINESS_CONFIG.supportEmail}</a></div>
              <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalName}</div>
            </div>
          </section>

        </div>
      </div>
    </PageWrapper>
  );
}

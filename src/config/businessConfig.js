// Business and Legal Entity Configuration
// Centralized, verifiable contact and corporate metadata.
// Environment variables allow deployment-specific overrides without code changes.

export const BUSINESS_CONFIG = {
  // Trading and Brand Name
  brandName: 'NutriScan AI',
  
  // Legal entity name (do not fabricate - configurable via env var)
  legalName: import.meta.env.VITE_BUSINESS_LEGAL_NAME || 'NutriScan AI Project',
  
  // Operational and Support Email
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@nutriscan.ai',
  
  // Designated Data Protection & Grievance Contact under India DPDP Act, 2023
  grievanceOfficerName: import.meta.env.VITE_GRIEVANCE_OFFICER_NAME || 'Grievance Officer',
  grievanceEmail: import.meta.env.VITE_GRIEVANCE_EMAIL || 'privacy@nutriscan.ai',
  
  // Registered / Operational Location
  jurisdiction: 'New Delhi / Bengaluru, India',
  address: import.meta.env.VITE_BUSINESS_ADDRESS || 'NutriScan AI Operations, Karnataka, India',
  
  // Version and Policy Metadata
  policyVersion: '1.2.0',
  effectiveDate: 'October 9, 2026',
  lastUpdated: 'October 9, 2026',
  
  // Applicable Regulatory References
  regulations: {
    indiaDPDP: 'Digital Personal Data Protection Act, 2023 & DPDP Rules, 2025',
    standardsFood: 'Food Safety and Standards Authority of India (FSSAI)',
    standardsClassification: 'NOVA Food Processing Classification',
    standardsCosmetic: 'International Nomenclature of Cosmetic Ingredients (INCI)',
  },
};

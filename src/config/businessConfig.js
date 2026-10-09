// Business and Legal Entity Configuration
// Centralized, verifiable contact and corporate metadata.
// Environment variables allow deployment-specific overrides without code changes.

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

export const BUSINESS_CONFIG = {
  // Trading and Brand Name
  brandName: 'NutriScan AI',

  // Legal entity name (do not fabricate - configurable via env var)
  legalName: env.VITE_BUSINESS_LEGAL_NAME || 'NutriScan AI Project',

  // Operational and Support Email
  supportEmail: env.VITE_SUPPORT_EMAIL || 'support@nutriscan.ai',

  // Designated Data Protection & Grievance Contact under India DPDP Act, 2023
  grievanceOfficerName: env.VITE_GRIEVANCE_OFFICER_NAME || 'Grievance Officer',
  grievanceEmail: env.VITE_GRIEVANCE_EMAIL || 'privacy@nutriscan.ai',

  // Registered / Operational Location
  jurisdiction: env.VITE_BUSINESS_JURISDICTION || 'New Delhi / Bengaluru, India',
  address: env.VITE_BUSINESS_ADDRESS || 'NutriScan AI Operations, Karnataka, India',

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

/**
 * Validates business configuration.
 * When strict=true (e.g. production release gate), throws an error if required details are missing or placeholders.
 */
export function validateBusinessConfiguration(strict = false) {
  const issues = [];
  const placeholders = [
    'NutriScan AI Project',
    'support@nutriscan.ai',
    'Grievance Officer',
    'privacy@nutriscan.ai',
    'NutriScan AI Operations, Karnataka, India',
    'New Delhi / Bengaluru, India',
  ];

  if (!BUSINESS_CONFIG.legalName || placeholders.includes(BUSINESS_CONFIG.legalName)) {
    issues.push({
      field: 'legalName',
      message: 'Legal entity name is set to placeholder or empty. Configure VITE_BUSINESS_LEGAL_NAME for production release.',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!BUSINESS_CONFIG.supportEmail || placeholders.includes(BUSINESS_CONFIG.supportEmail)) {
    issues.push({
      field: 'supportEmail',
      message: 'Support email is set to default placeholder or empty. Configure VITE_SUPPORT_EMAIL.',
    });
  } else if (!emailRegex.test(BUSINESS_CONFIG.supportEmail)) {
    issues.push({
      field: 'supportEmail',
      message: 'Support email format is invalid.',
    });
  }

  if (!BUSINESS_CONFIG.grievanceOfficerName || placeholders.includes(BUSINESS_CONFIG.grievanceOfficerName)) {
    issues.push({
      field: 'grievanceOfficerName',
      message: 'DPDP Grievance Officer is set to placeholder or empty. Configure VITE_GRIEVANCE_OFFICER_NAME.',
    });
  }

  if (!BUSINESS_CONFIG.grievanceEmail || placeholders.includes(BUSINESS_CONFIG.grievanceEmail)) {
    issues.push({
      field: 'grievanceEmail',
      message: 'Grievance email is set to default placeholder or empty. Configure VITE_GRIEVANCE_EMAIL.',
    });
  } else if (!emailRegex.test(BUSINESS_CONFIG.grievanceEmail)) {
    issues.push({
      field: 'grievanceEmail',
      message: 'Grievance email format is invalid.',
    });
  }

  if (!BUSINESS_CONFIG.address || placeholders.includes(BUSINESS_CONFIG.address)) {
    issues.push({
      field: 'address',
      message: 'Physical address is set to default placeholder or empty. Configure VITE_BUSINESS_ADDRESS.',
    });
  }

  if (strict && issues.length > 0) {
    const errorMsg =
      'Production Business Configuration Validation Failed:\n' +
      issues.map((i) => `  * [${i.field}]: ${i.message}`).join('\n');
    throw new Error(errorMsg);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

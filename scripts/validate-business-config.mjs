// Script to validate production legal and business configuration
// Run with: node scripts/validate-business-config.mjs [--strict]

import { BUSINESS_CONFIG, validateBusinessConfiguration } from '../src/config/businessConfig.js';

const isStrict = process.argv.includes('--strict') || process.env.STRICT_LEGAL_CONFIG === 'true';

console.log('=== NutriScan AI Business Configuration Audit ===');
console.log(`Brand Name:       ${BUSINESS_CONFIG.brandName}`);
console.log(`Legal Entity:     ${BUSINESS_CONFIG.legalName}`);
console.log(`Support Email:    ${BUSINESS_CONFIG.supportEmail}`);
console.log(`Grievance Officer:${BUSINESS_CONFIG.grievanceOfficerName} (${BUSINESS_CONFIG.grievanceEmail})`);
console.log(`Jurisdiction:     ${BUSINESS_CONFIG.jurisdiction}`);
console.log(`Strict Mode:      ${isStrict ? 'ENABLED (Will fail build if placeholders remain)' : 'DISABLED (Audit mode)'}`);
console.log('--------------------------------------------------');

const { valid, issues } = validateBusinessConfiguration(false);

if (valid) {
  console.log('✅ All business configuration parameters are populated with non-placeholder values.');
  process.exit(0);
} else {
  console.warn(`⚠️ Found ${issues.length} unverified placeholder configuration item(s):`);
  issues.forEach((i) => {
    console.warn(`  * [${i.field}]: ${i.message}`);
  });

  if (isStrict) {
    console.error('❌ RELEASE GATE FAILED: Production release requires verified operator business details.');
    process.exit(1);
  } else {
    console.log('ℹ️ Build continuing. Ensure environment variables are set before final public launch.');
    process.exit(0);
  }
}

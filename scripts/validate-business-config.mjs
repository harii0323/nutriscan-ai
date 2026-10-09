// Script to validate production legal and business configuration
// Run with: node scripts/validate-business-config.mjs [--strict]

import { BUSINESS_CONFIG, validateBusinessConfiguration } from '../src/config/businessConfig.js';

const isStrict = process.argv.includes('--strict') || process.env.STRICT_LEGAL_CONFIG === 'true';

console.log('=== NutriScan AI Business Configuration Audit ===');
console.log(`Brand Name:        ${BUSINESS_CONFIG.brandName}`);
console.log(`Legal Entity:      ${BUSINESS_CONFIG.legalName}`);
console.log(`Support Email:     ${BUSINESS_CONFIG.supportEmail}`);
console.log(`Grievance Officer: ${BUSINESS_CONFIG.grievanceOfficerName} (${BUSINESS_CONFIG.grievanceEmail})`);
console.log(`Jurisdiction:      ${BUSINESS_CONFIG.jurisdiction}`);
console.log(`Strict Mode:       ${isStrict ? 'ENABLED (Production Release Gate - Will fail if unverified)' : 'DISABLED (Audit Mode)'}`);
console.log('--------------------------------------------------');

const { valid, issues } = validateBusinessConfiguration(false);

if (valid) {
  console.log('PASS: All business configuration parameters are populated with non-placeholder values.');
  process.exit(0);
} else {
  console.warn(`WARNING: Found ${issues.length} unverified placeholder configuration item(s):`);
  issues.forEach((i) => {
    console.warn(`  * [${i.field}]: ${i.message}`);
  });

  if (isStrict) {
    console.error('FAIL: RELEASE GATE BLOCKED: Production release requires verified operator business details.');
    console.error('Required environment variables to supply before production deployment:');
    console.error('  - VITE_BUSINESS_LEGAL_NAME (Registered legal entity name)');
    console.error('  - VITE_SUPPORT_EMAIL (Verified operational support mailbox)');
    console.error('  - VITE_GRIEVANCE_OFFICER_NAME (Designated DPDP officer full legal name)');
    console.error('  - VITE_GRIEVANCE_EMAIL (Designated grievance redressal inbox)');
    console.error('  - VITE_BUSINESS_ADDRESS (Verified physical registered business address)');
    process.exit(1);
  } else {
    console.log('INFO: Build continuing in audit mode. Ensure environment variables are set before public release.');
    process.exit(0);
  }
}

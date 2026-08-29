import { execSync } from 'child_process';

const suites = [
  'test_common_modules_and_industry_adaptation_suite.mjs',
  'test_mobile_onboarding_and_cross_platform_auth.mjs',
  'test_mobile_drawer_and_receipt_engine_suite.mjs',
  'test_super_admin_presence_and_live_suite.mjs',
  'test_super_admin_platform_suite.mjs',
  'test_wholesale_and_reporting_sync_suite.mjs',
  'test_live_cross_platform_sync_suite.mjs',
  'test_restaurant_domain_e2e_suite.mjs',
  'test_restaurant_roles_and_security_suite.mjs',
  'test_restaurant_final_audit.mjs',
  'test_restaurant_roles_and_templates_deep_suite.mjs',
  'test_domain_aware_rbac_and_staff_suite.mjs',
  'scripts/test_mobile_feature_parity_and_ux_suite.mjs'
];

console.log('================================================================================');
console.log('  AESCION COMMERCE — MASTER FULL-PLATFORM REGRESSION RUNNER');
console.log('================================================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;

for (const suite of suites) {
  console.log(`\n>>> STARTING: ${suite}`);
  try {
    execSync(`node ${suite}`, { cwd: 'C:\\AESCION', stdio: 'inherit' });
    console.log(`>>> PASSED: ${suite}\n`);
    passedSuites++;
  } catch (err) {
    console.error(`>>> FAILED: ${suite}`);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log(`🎉 ALL ${passedSuites}/${totalSuites} TEST BATTERIES PASSED WITH 100% SUCCESS!`);
console.log('================================================================================\n');

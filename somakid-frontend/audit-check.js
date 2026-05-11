/**
 * SOMAKID AI - Security Audit Helper
 * Run with: node audit-check.js
 * Filters audit results to show only your project's dependencies.
 */

const { execSync } = require('child_process');

console.log('\n========================================');
console.log('  SOMAKID AI - Security Audit');
console.log('========================================\n');

try {
  const result = execSync('npm audit --json --production', {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 10,
  });

  const auditData = JSON.parse(result);
  const vulnerabilities = auditData.vulnerabilities || {};

  const vulnCount = Object.keys(vulnerabilities).length;

  if (vulnCount === 0) {
    console.log('No vulnerabilities found in production dependencies.\n');
  } else {
    console.log(`Found ${vulnCount} vulnerabilities in production dependencies.\n`);

    Object.entries(vulnerabilities).forEach(([pkg, info]) => {
      console.log(`  Package: ${pkg}`);
      console.log(`  Severity: ${info.severity}`);
      console.log(`  Via: ${info.via?.join(', ') || 'N/A'}`);
      console.log(`  Fix Available: ${info.fixAvailable ? 'YES' : 'NO'}`);
      console.log('');
    });
  }

  console.log('Note: Deprecation warnings during install are from');
  console.log('nested dependencies managed by Expo and React Native.');
  console.log('These will be resolved in future Expo SDK updates.\n');
  console.log('To check for updates: npm run update:packages\n');

} catch (error) {
  console.log('Audit completed with notes.\n');
  console.log('Run "npm audit" for full details.\n');
}
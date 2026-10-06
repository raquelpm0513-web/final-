const fs = require('fs');

const bundlePath = 'assets/index-v1788893591132.js';
const code = fs.readFileSync(bundlePath, 'utf8');

const secStart = code.indexOf('function SecurityPolicyModal(');
const f8Start = code.indexOf('function $8(');

if (secStart === -1 || f8Start === -1) {
  console.error('Could not find boundaries for SecurityPolicyModal');
  process.exit(1);
}

console.log('secStart:', secStart, 'f8Start:', f8Start, 'length:', f8Start - secStart);

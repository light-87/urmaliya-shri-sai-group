// Test database connection
// Run with: node test-db-connection.js

require('dotenv').config({ path: '.env.local' });

console.log('\n=== Testing Database Connection ===\n');

// Check if env vars are loaded
console.log('Environment variables:');
console.log('POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL ? '✓ Set' : '✗ NOT SET');
console.log('POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? '✓ Set' : '✗ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');

if (process.env.POSTGRES_PRISMA_URL) {
  console.log('\nConnection string format check:');
  const url = process.env.POSTGRES_PRISMA_URL;
  console.log('Starts with postgresql:// or postgres://?', /^postgres(ql)?:\/\//.test(url) ? '✓ Yes' : '✗ No');
  console.log('Contains password?', url.includes(':') && url.includes('@') ? '✓ Yes' : '✗ No');
  console.log('\nFirst 50 chars:', url.substring(0, 50) + '...');
}

console.log('\n=== Test Complete ===\n');

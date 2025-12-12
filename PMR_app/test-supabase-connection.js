// Test Supabase connection
// Run with: node test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

console.log('\n=== Testing Supabase Connection ===\n');

// Check environment variables
console.log('1. Checking environment variables:');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

console.log('   SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ NOT SET');
console.log('   SUPABASE_KEY:', supabaseKey ? '✓ Set' : '✗ NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Missing required environment variables!');
  console.log('\nAdd to your .env.local:');
  console.log('SUPABASE_URL="https://your-project.supabase.co"');
  console.log('SUPABASE_ANON_KEY="your-anon-key"');
  process.exit(1);
}

// Create Supabase client
console.log('\n2. Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('   ✓ Client created successfully');

// Test database connection by querying Pin table
console.log('\n3. Testing database query (Pin table)...');

(async () => {
  try {
    const { data, error } = await supabase
      .from('Pin')
      .select('*')
      .limit(5);

    if (error) {
      console.log('   ❌ Query failed:', error.message);
      console.log('\n   Possible issues:');
      console.log('   - Table "Pin" might not exist (run SQL migrations first)');
      console.log('   - Wrong SUPABASE_URL or SUPABASE_ANON_KEY');
      console.log('   - Row Level Security (RLS) might be blocking access');
    } else {
      console.log('   ✓ Query successful!');
      console.log(`   Found ${data.length} PIN(s):\n`);
      data.forEach(pin => {
        console.log(`   - PIN ${pin.pinNumber}: ${pin.role}`);
      });
    }

    // Test authentication query
    console.log('\n4. Testing PIN authentication (PIN: 1234)...');
    const { data: authData, error: authError } = await supabase
      .from('Pin')
      .select('*')
      .eq('pinNumber', '1234')
      .single();

    if (authError) {
      console.log('   ❌ Auth query failed:', authError.message);
    } else if (authData) {
      console.log('   ✓ Authentication would work!');
      console.log(`   PIN 1234 → Role: ${authData.role}`);
    } else {
      console.log('   ❌ PIN 1234 not found in database');
    }

    console.log('\n=== Test Complete ===\n');

  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message);
  }
})();

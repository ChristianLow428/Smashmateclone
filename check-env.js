require('dotenv').config({ path: '.env.local' })

// Function to safely display a value without exposing it
const maskValue = (value) => {
  if (!value) return '❌ NOT SET';
  if (value.includes('eyJ')) {
    // It's a JWT token, show first and last 5 chars
    return `✅ SET (${value.slice(0, 5)}...${value.slice(-5)})`;
  }
  // For URLs, show the domain
  if (value.includes('://')) {
    try {
      const url = new URL(value);
      return `✅ SET (${url.hostname})`;
    } catch (e) {
      return '❌ INVALID URL';
    }
  }
  return `✅ SET (${value.length} characters)`;
};

console.log('\n=== Environment Variables Check ===\n');

// Check Supabase variables
console.log('Supabase Configuration:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', maskValue(process.env.NEXT_PUBLIC_SUPABASE_URL));
console.log('SUPABASE_SERVICE_ROLE_KEY:', maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY));

// Verify the values are in the correct format
console.log('\nValidation:');

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!url.hostname.includes('supabase')) {
      console.log('⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL does not contain "supabase" in the domain');
    } else {
      console.log('✅ NEXT_PUBLIC_SUPABASE_URL format is valid');
    }
  } catch (e) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
  }
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY appears to be a valid JWT token');
  } else {
    console.log('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY does not appear to be a JWT token');
  }
} else {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
}

console.log('\nThese values need to be added to your Render environment variables.');
console.log('Go to: Render Dashboard -> WebSocket Server -> Environment'); 
// Test script to verify environment variables are set correctly
console.log('Environment Check:\n');

const requiredVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 30)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('\n' + (allPresent ? '✅ All required variables present' : '❌ Some variables missing'));

// Check NEXTAUTH_URL format
const nextauthUrl = process.env.NEXTAUTH_URL;
if (nextauthUrl) {
  if (nextauthUrl.startsWith('http://') && !nextauthUrl.includes('localhost')) {
    console.warn('⚠️  WARNING: NEXTAUTH_URL uses http:// for production - should be https://');
  }
  if (!nextauthUrl.startsWith('http://') && !nextauthUrl.startsWith('https://')) {
    console.warn('⚠️  WARNING: NEXTAUTH_URL missing protocol (http:// or https://)');
  }
}

// Check NEXTAUTH_SECRET length
const secret = process.env.NEXTAUTH_SECRET;
if (secret && secret.length < 32) {
  console.warn('⚠️  WARNING: NEXTAUTH_SECRET is too short (should be at least 32 characters)');
}

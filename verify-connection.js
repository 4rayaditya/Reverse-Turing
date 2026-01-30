// Verify your correct Supabase connection string
// Replace YOUR_CORRECT_CONNECTION_STRING with the string from Supabase dashboard

const { PrismaClient } = require('@prisma/client');

// Replace this with your actual connection string from Supabase dashboard
const YOUR_CORRECT_CONNECTION_STRING = 'postgresql://postgres.pvjlovvejtmrpryybyvg:AdityaRay3464@[YOUR-ACTUAL-REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

console.log('🔍 Verifying your Supabase connection string...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: YOUR_CORRECT_CONNECTION_STRING
    }
  }
});

async function verifyConnection() {
  try {
    console.log('📡 Testing connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ SUCCESS! This is your correct connection string');
    console.log('🎉 Update DATABASE_URL on Render with this string');
    console.log('\n📋 DATABASE_URL for Render:');
    console.log(YOUR_CORRECT_CONNECTION_STRING);
  } catch (error) {
    console.error('❌ This connection string is still wrong');
    console.error('Error:', error.message);
    console.error('\n💡 Make sure you:');
    console.error('   1. Selected "Transaction pooler" mode in Supabase');
    console.error('   2. Copied the exact connection string');
    console.error('   3. Used the correct region from your dashboard');
  } finally {
    await prisma.$disconnect();
  }
}

verifyConnection();
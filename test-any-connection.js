// Test any Supabase connection string
// Replace the URL below with the one from your Supabase dashboard

const { PrismaClient } = require('@prisma/client');

// Replace this with your connection string from Supabase dashboard
const CONNECTION_STRING = 'postgresql://postgres.pvjlovvejtmrpryybyvg:AdityaRay3464@[YOUR-ACTUAL-REGION].pooler.supabase.com:6543/postgres';

console.log('🔍 Testing Supabase connection...\n');
console.log('URL:', CONNECTION_STRING.replace(/:AdityaRay3464@/, ':****@'));

const prisma = new PrismaClient({
  datasources: { db: { url: CONNECTION_STRING } }
});

async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('\n✅ SUCCESS! This is your correct connection string');
    console.log('🎉 Update DATABASE_URL on Render with:');
    console.log(CONNECTION_STRING + '?pgbouncer=true&connection_limit=1');
  } catch (error) {
    console.error('\n❌ This connection string is wrong');
    console.error('Error:', error.message);

    if (error.message.includes('Tenant or user not found')) {
      console.error('💡 Wrong region - check your Supabase dashboard');
    } else if (error.message.includes('authentication failed')) {
      console.error('💡 Wrong password - check your credentials');
    } else {
      console.error('💡 Other connection issue');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
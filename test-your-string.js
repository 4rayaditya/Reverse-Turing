// Test the connection string you think is correct
const { PrismaClient } = require('@prisma/client');

const testUrl = 'postgresql://postgres:AdityaRay3464@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

console.log('🔍 Testing your connection string...\n');
console.log('URL:', testUrl.replace(/:AdityaRay3464@/, ':****@'));

const prisma = new PrismaClient({
  datasources: { db: { url: testUrl } }
});

async function test() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ This connection string WORKS!');
    console.log('🎉 Your Supabase project IS in aws-1-ap-south-1 region');
  } catch (error) {
    console.error('❌ This connection string is WRONG');
    console.error('Error:', error.message);
    if (error.message.includes('Tenant or user not found')) {
      console.error('\n💡 Your Supabase project is NOT in aws-1-ap-south-1 region');
      console.error('🔍 You need to find your actual region from Supabase dashboard');
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
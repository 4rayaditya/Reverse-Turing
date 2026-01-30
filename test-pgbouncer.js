// Test with pgbouncer=true to fix prepared statement issues
const { PrismaClient } = require('@prisma/client');

const withPgbouncer = 'postgresql://postgres.pvjlovvejtmrpryybyvg:AdityaRay3464@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

console.log('🔍 Testing with pgbouncer=true to fix prepared statement issues...\n');
console.log('URL:', withPgbouncer.replace(/:AdityaRay3464@/, ':****@'));

const prisma = new PrismaClient({
  datasources: { db: { url: withPgbouncer } }
});

async function test() {
  try {
    console.log('📡 Connecting with pgbouncer...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ SUCCESS! pgbouncer=true fixes the prepared statement issue!');
    console.log('\n🎉 CORRECT DATABASE_URL for Render:');
    console.log(withPgbouncer + '&connection_limit=1');
    console.log('\n📋 Full command to update Render:');
    console.log('DATABASE_URL="' + withPgbouncer + '&connection_limit=1"');
  } catch (error) {
    console.error('❌ Still failed even with pgbouncer');
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
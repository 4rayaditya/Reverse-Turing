// Test the EXACT connection string from your Supabase dashboard
const { PrismaClient } = require('@prisma/client');

const exactFromSupabase = 'postgresql://postgres.pvjlovvejtmrpryybyvg:AdityaRay3464@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

console.log('🔍 Testing the EXACT connection string from your Supabase dashboard...\n');
console.log('URL:', exactFromSupabase.replace(/:AdityaRay3464@/, ':****@'));

const prisma = new PrismaClient({
  datasources: { db: { url: exactFromSupabase } }
});

async function test() {
  try {
    console.log('📡 Connecting...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ SUCCESS! This connection string works!');
    console.log('🎉 Your Supabase dashboard is correct');
    console.log('\n📋 DATABASE_URL for Render:');
    console.log(exactFromSupabase + '?pgbouncer=true&connection_limit=1');
  } catch (error) {
    console.error('❌ FAILED! Even the dashboard string doesn\'t work');
    console.error('Error:', error.message);
    console.error('\n🔍 Possible issues:');
    console.error('1. Password is wrong (check if it has special characters)');
    console.error('2. Project is paused or deleted');
    console.error('3. Database is not accessible');
    console.error('4. Supabase service issue');
    console.error('\n💡 Try:');
    console.error('- Check if your Supabase project is active');
    console.error('- Reset your database password in Supabase');
    console.error('- Contact Supabase support');
  } finally {
    await prisma.$disconnect();
  }
}

test();
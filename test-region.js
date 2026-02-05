// Test the current Render connection string
const { PrismaClient } = require('@prisma/client');

console.log('🔍 Testing current Render DATABASE_URL...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
    }
  }
});

async function testConnection() {
  try {
    console.log('📡 Testing aws-1-ap-south-1.pooler.supabase.com...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ aws-1-ap-south-1 region works!');
    console.log('🎉 Your Supabase project IS in Asia Pacific (Mumbai) region');
    console.log('💡 The connection string on Render is correct');
  } catch (error) {
    console.error('❌ aws-1-ap-south-1 region failed!');
    console.error('Error:', error.message);
    console.error('\n🔍 DIAGNOSIS: Your Supabase project is NOT in aws-1-ap-south-1 region');
    console.error('\n🛠️  SOLUTION: Find your actual Supabase region');
    console.error('1. Go to Supabase Dashboard → Settings → Database');
    console.error('2. Look at the "Host" in the connection string');
    console.error('3. Use that region instead of aws-1-ap-south-1');
    console.error('\n📍 Common regions:');
    console.error('   aws-0-us-east-1 (US East)');
    console.error('   aws-0-us-west-1 (US West)');
    console.error('   aws-0-eu-west-1 (EU Ireland)');
    console.error('   aws-0-ap-southeast-1 (Asia Pacific Singapore)');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
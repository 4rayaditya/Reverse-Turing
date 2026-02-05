// Test common Supabase regions to find your project
const { PrismaClient } = require('@prisma/client');

const regions = [
  'aws-0-us-east-1',      // US East (N. Virginia)
  'aws-0-us-west-1',      // US West (N. California)
  'aws-0-eu-west-1',      // EU West (Ireland)
  'aws-0-ap-southeast-1', // Asia Pacific (Singapore)
  'aws-0-sa-east-1',      // South America (São Paulo)
];

console.log('🔍 Finding your Supabase project region...\n');

async function testRegion(region) {
  const url = `postgresql://postgres:[YOUR-PASSWORD]@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;

  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ FOUND IT! Your project is in: ${region}`);
    console.log(`🔗 Correct DATABASE_URL: ${url}`);
    return true;
  } catch (error) {
    console.log(`❌ ${region}: ${error.message.includes('Tenant or user not found') ? 'Not found' : 'Other error'}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function findRegion() {
  for (const region of regions) {
    console.log(`Testing ${region}...`);
    const found = await testRegion(region);
    if (found) {
      console.log('\n🎉 SUCCESS! Update your Render DATABASE_URL with the connection string above');
      console.log('📋 Then redeploy your Render service');
      return;
    }
  }

  console.log('\n❌ Could not find your project in common regions');
  console.log('💡 Check your Supabase dashboard manually:');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Settings → Database → Connection string');
  console.log('   4. Copy the Transaction pooler connection string');
}

findRegion();
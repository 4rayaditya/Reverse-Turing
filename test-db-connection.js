// test-db-connection.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    return;
  }

  console.log('🔍 Testing connection to:', dbUrl.replace(/:[^:@]+@/, ':****@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 This might be due to:');
    console.error('   - Wrong region in connection string');
    console.error('   - Incorrect password (check URL encoding)');
    console.error('   - Database server not accessible');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
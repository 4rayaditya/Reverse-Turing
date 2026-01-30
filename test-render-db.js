// Test Render database connection
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('🔍 Testing Render DATABASE_URL connection...\n');

// Use the exact same configuration as socket-server.js
let prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    console.log('📡 Attempting database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');
    console.log('🎉 Render DATABASE_URL is working correctly.');
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);

    if (error.message.includes('aws-1-ap-south-1')) {
      console.error('\n🔍 DIAGNOSIS: Wrong Supabase region!');
      console.error('Your DATABASE_URL is pointing to Asia Pacific (Mumbai) but your project is in a different region.');
    } else if (error.message.includes('Tenant or user not found')) {
      console.error('\n🔍 DIAGNOSIS: Wrong credentials or project reference!');
      console.error('Check your Supabase project reference and password.');
    } else if (error.message.includes('Can\'t reach database server')) {
      console.error('\n🔍 DIAGNOSIS: Wrong region or connection string!');
      console.error('The host in your DATABASE_URL is incorrect.');
    }

    console.error('\n🛠️  FIX: Update DATABASE_URL on Render dashboard');
    console.error('1. Go to https://dashboard.render.com/');
    console.error('2. Select your socket service');
    console.error('3. Go to Environment tab');
    console.error('4. Update DATABASE_URL with correct pooler connection string');
    console.error('5. Get the correct string from Supabase Dashboard → Settings → Database → Transaction pooler');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
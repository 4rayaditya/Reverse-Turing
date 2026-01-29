const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL
});

async function testAuth() {
  try {
    console.log('Testing authentication flow...\n');
    
    const email = 'ray@gmail.com';
    const password = 'ray';
    
    console.log(`1. Looking up user: ${email}`);
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      passwordHashLength: user.password.length
    });
    
    console.log(`\n2. Testing password: "${password}"`);
    const isValid = await bcrypt.compare(password, user.password);
    
    if (isValid) {
      console.log('✅ Password is VALID');
      console.log('\n✅ Authentication would SUCCEED');
    } else {
      console.log('❌ Password is INVALID');
      console.log('\n❌ Authentication would FAIL');
      console.log('\nPassword hash in DB:', user.password.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('Error testing auth:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();

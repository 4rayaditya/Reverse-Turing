const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  log: ['query', 'error', 'warn']
});

async function diagnoseProduction() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  PRODUCTION DATABASE DIAGNOSTIC                    ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // Test connection
    console.log('1️⃣  Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Database connection successful\n');
    
    // List all users
    console.log('2️⃣  Fetching all users from production database...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        password: true,
        createdAt: true
      }
    });
    
    console.log(`   Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`   User ${index + 1}:`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Username: ${user.username}`);
      console.log(`   - Admin: ${user.isAdmin}`);
      console.log(`   - Password Hash: ${user.password.substring(0, 29)}...`);
      console.log(`   - Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Check admin user specifically
    console.log('3️⃣  Checking admin user (ray@gmail.com)...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'ray@gmail.com' }
    });
    
    if (adminUser) {
      console.log('   ✅ Admin user found');
      console.log(`   - ID: ${adminUser.id}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Username: ${adminUser.username}`);
      console.log(`   - Is Admin: ${adminUser.isAdmin}`);
      console.log(`   - Password Hash Length: ${adminUser.password.length}`);
      console.log(`   - Password starts with $2: ${adminUser.password.startsWith('$2')}`);
      
      // Verify it's a valid bcrypt hash format
      const bcryptPattern = /^\$2[ayb]\$\d{2}\$.{53}$/;
      const isValidFormat = bcryptPattern.test(adminUser.password);
      console.log(`   - Valid bcrypt format: ${isValidFormat ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ Admin user NOT found!');
    }
    
    console.log('\n4️⃣  Production diagnostic complete!');
    console.log('\nNext steps:');
    console.log('- If admin user exists with valid bcrypt hash: Check Vercel env vars');
    console.log('- If admin user missing: Run `node scripts/create-admin-user.js`');
    console.log('- If hash format invalid: Regenerate password with bcrypt');
    
  } catch (error) {
    console.error('\n❌ Error during diagnostic:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseProduction();

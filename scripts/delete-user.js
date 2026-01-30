// scripts/delete-user.js
/**
 * Delete a user from the database
 * Usage: node scripts/delete-user.js <email>
 * 
 * Example: node scripts/delete-user.js test@email.com
 * 
 * For production: Set DATABASE_URL in .env to production database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/delete-user.js <email>');
    console.error('Example: node scripts/delete-user.js test@email.com');
    process.exit(1);
  }

  const email = args[0];

  try {
    console.log(`[Delete User] Looking for user: ${email}`);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[Delete User] ❌ User not found: ${email}`);
      return;
    }

    console.log(`Found user:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points
    });

    // Delete user
    await prisma.user.delete({
      where: { email }
    });

    console.log(`[Delete User] ✅ User deleted successfully: ${email}`);
    
  } catch (error) {
    console.error('[Delete User] ❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();

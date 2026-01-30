// scripts/add-user.js
/**
 * Add a new user to the database
 * Usage: node scripts/add-user.js <email> <name> [isAdmin]
 * 
 * Examples:
 *   node scripts/add-user.js player1@test.com "Player One"
 *   node scripts/add-user.js admin@test.com "Admin User" true
 * 
 * For production: Set DATABASE_URL in .env to production database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node scripts/add-user.js <email> <name> [isAdmin]');
    console.error('Example: node scripts/add-user.js test@email.com "Test User" true');
    process.exit(1);
  }

  const email = args[0];
  const name = args[1];
  const isAdmin = args[2] === 'true' || args[2] === '1';
  const defaultPassword = 'password123'; // Users should change this

  try {
    console.log(`[Add User] Creating user: ${email}`);
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log(`[Add User] ⚠️  User already exists with ID: ${existing.id}`);
      console.log(`Current data:`, {
        name: existing.name,
        email: existing.email,
        isAdmin: existing.isAdmin,
        points: existing.points
      });
      return;
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isAdmin,
        points: 1000,
        gamesPlayed: 0,
        wins: 0
      }
    });

    console.log(`[Add User] ✅ User created successfully!`);
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Admin: ${user.isAdmin}`);
    console.log(`Default Password: ${defaultPassword}`);
    console.log(`⚠️  User should change password after first login!`);
    
  } catch (error) {
    console.error('[Add User] ❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addUser();

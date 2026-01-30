require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'ritvick@test.com';
  const username = 'ritvick';
  const password = 'ritvick123';

  try {
    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[add-ritvick] User already exists: ${existing.email} (id: ${existing.id})`);
      console.log('[add-ritvick] Updating password and resetting points to 1000');
      await prisma.user.update({ where: { email }, data: { password: hashed, points: 1000 } });
      console.log('[add-ritvick] Updated existing user.');
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        points: 1000,
        isAdmin: false,
        gamesPlayed: 0,
        wins: 0
      }
    });

    console.log(`[add-ritvick] Created user: ${user.username} <${user.email}> with password: ${password}`);
  } catch (err) {
    console.error('[add-ritvick] Error:', err.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

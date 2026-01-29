const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.SEED_EMAIL || 'ray@gmail.com';
  const username = process.env.SEED_USERNAME || 'ray';
  const plain = process.env.SEED_PASSWORD || 'ray';

  const hash = await bcrypt.hash(plain, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Update password and admin flag if user exists
    const updated = await prisma.user.update({
      where: { email },
      data: { password: hash, isAdmin: email === 'ray@gmail.com' }
    });
    console.log('Updated existing user password:', updated.email, 'id=', updated.id, 'admin=', updated.isAdmin);
    await prisma.$disconnect();
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hash,
      points: 1000,
      isAdmin: email === 'ray@gmail.com'
    }
  });

  console.log('Created user:', user.email, 'id=', user.id, 'admin=', user.isAdmin);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

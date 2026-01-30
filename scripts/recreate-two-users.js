const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function recreate() {
  const emails = ['jyotianand@test.com', 'gurmaanyakaur@test.com'];

  try {
    console.log('Deleting any existing records for:', emails.join(', '));
    const del = await prisma.user.deleteMany({ where: { email: { in: emails } } });
    console.log(`Deleted ${del.count} records`);

    for (const email of emails) {
      const username = email.split('@')[0];
      const password = `${username}123`;
      const hashed = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashed,
          points: 1000,
          isAdmin: false
        }
      });
      console.log(`Created ${user.username} <${user.email}> with password: ${password}`);
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

recreate();

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

(async () => {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
    const users = await prisma.user.findMany({ take: 10 });
    console.log(users);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

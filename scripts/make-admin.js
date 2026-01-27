const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

async function main() {
  const prisma = new PrismaClient();
  
  const updated = await prisma.user.update({
    where: { email: 'ray@gmail.com' },
    data: { isAdmin: true }
  });
  
  console.log('Updated user to admin:', updated.email, 'id=', updated.id);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

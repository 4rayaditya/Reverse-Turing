const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

(async () => {
  const prisma = new PrismaClient();
  const email = process.env.SEED_EMAIL || 'ray@gmail.com';
  const testPassword = process.env.SEED_PASSWORD || 'ray';

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log('User not found:', email);
      process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('User ID:', user.id);
    console.log('Is Admin:', user.isAdmin);
    console.log('Password hash:', user.password);
    console.log('\nTesting password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('\n⚠️ Password does not match! Updating...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await prisma.user.update({
        where: { email },
        data: { password: newHash }
      });
      console.log('✅ Password updated successfully');
      
      // Verify again
      const updated = await prisma.user.findUnique({ where: { email } });
      const isValidNow = await bcrypt.compare(testPassword, updated.password);
      console.log('New password valid:', isValidNow);
    } else {
      console.log('✅ Password is correct in DB');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

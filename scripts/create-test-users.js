const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test users...');

  const users = [
    { username: 'player1', email: 'player1@test.com', password: 'password123' },
    { username: 'player2', email: 'player2@test.com', password: 'password123' },
    { username: 'player3', email: 'player3@test.com', password: 'password123' },
    { username: 'player4', email: 'player4@test.com', password: 'password123' },
    { username: 'player5', email: 'player5@test.com', password: 'password123' },
    { username: 'player6', email: 'player6@test.com', password: 'password123' },
  ];

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          points: 1000,
          isAdmin: false,
        },
      });
      console.log(`✓ Created user: ${user.username} (${user.email})`);
    } catch (error) {
      console.error(`✗ Error creating ${userData.username}:`, error.message);
    }
  }

  console.log('\nAll test users created successfully!');
  console.log('\nYou can login with:');
  console.log('Email: player1@test.com to player6@test.com');
  console.log('Password: password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

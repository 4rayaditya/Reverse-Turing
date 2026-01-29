const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Creating players 7-12...\n');

  const users = [
    { username: 'player7', email: 'player7@test.com', password: 'password123' },
    { username: 'player8', email: 'player8@test.com', password: 'password123' },
    { username: 'player9', email: 'player9@test.com', password: 'password123' },
    { username: 'player10', email: 'player10@test.com', password: 'password123' },
    { username: 'player11', email: 'player11@test.com', password: 'password123' },
    { username: 'player12', email: 'player12@test.com', password: 'password123' },
  ];

  for (const userData of users) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Check if user already exists
      const checkResult = await pool.query(
        'SELECT id FROM "User" WHERE email = $1',
        [userData.email]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⚠ User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Insert new user
      const userId = randomUUID();
      const result = await pool.query(
        `INSERT INTO "User" (id, username, email, password, points, "isAdmin", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, username, email`,
        [userId, userData.username, userData.email, hashedPassword, 1000, false]
      );

      console.log(`✓ Created: ${result.rows[0].username} (${result.rows[0].email})`);
    } catch (error) {
      console.error(`✗ Error creating ${userData.username}:`, error.message);
    }
  }

  await pool.end();
  console.log('\n✅ Done! All players created.');
  console.log('\nLogin credentials:');
  console.log('Email: player7@test.com to player12@test.com');
  console.log('Password: password123');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

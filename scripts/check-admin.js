const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAdmin() {
  try {
    console.log('Checking admin user (ray@gmail.com)...\n');
    
    const result = await pool.query(
      'SELECT id, username, email, "isAdmin", password FROM "User" WHERE email = $1',
      ['ray@gmail.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user NOT FOUND');
      await pool.end();
      return;
    }

    const admin = result.rows[0];
    console.log('✓ Admin user found:');
    console.log('  ID:', admin.id);
    console.log('  Username:', admin.username);
    console.log('  Email:', admin.email);
    console.log('  IsAdmin:', admin.isAdmin);
    console.log('  Password hash:', admin.password.substring(0, 20) + '...');
    
    // Test password
    const testPassword = 'ray';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log('\n🔐 Password test (testing "ray"):');
    console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
      console.log('\n⚠️  Password does not match! Updating...');
      const newHash = await bcrypt.hash('ray', 10);
      await pool.query(
        'UPDATE "User" SET password = $1, "isAdmin" = true WHERE email = $2',
        [newHash, 'ray@gmail.com']
      );
      console.log('✅ Password updated to "ray" and admin flag set');
    }

    await pool.end();
    console.log('\n✅ Admin check complete');
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAdmin();

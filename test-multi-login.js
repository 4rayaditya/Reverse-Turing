/**
 * Test multiple user logins simultaneously
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fetch = globalThis.fetch || require('node-fetch');

const prisma = new PrismaClient();

// Accounts to test (includes current kept users and some earlier test accounts)
const accounts = [
  { email: 'ayushgupta@test.com', password: 'ayushgupta123' },
  { email: 'manikajain@test.com', password: 'manikajain123' },
  { email: 'shreyasfegade@test.com', password: 'shreyasfegade123' },
  { email: 'harshit@test.com', password: 'harshit123' },
  { email: 'vineet@test.com', password: 'vineet123' },
  { email: 'pranshupancham@test.com', password: 'pranshupancham123' },
  { email: 'vasudevpathak@test.com', password: 'vasudevpathak123' },
  { email: 'ritvick@test.com', password: 'ritvick123' },
  { email: 'samya@test.com', password: 'samya123' },
  { email: 'mishkajain@test.com', password: 'mishkajain123' },
  { email: 'jyotianand@test.com', password: 'jyotianand123' },
  { email: 'gurmaanyakaur@test.com', password: 'gurmaanyakaur123' },
  { email: 'ray@gmail.com', password: 'ray' }
];

const baseUrl = process.env.NEXTAUTH_URL || 'https://reverse-turing-aljm.vercel.app';

async function runTests() {
  console.log('\n🔐 Running multi-login checks (DB bcrypt then production sign-in)\n');

  const dbResults = [];

  for (const acct of accounts) {
    try {
      const user = await prisma.user.findUnique({ where: { email: acct.email } });
      if (!user) {
        dbResults.push({ email: acct.email, found: false });
        console.log(`❌ NOT FOUND: ${acct.email}`);
        continue;
      }

      const ok = await bcrypt.compare(acct.password, user.password);
      dbResults.push({ email: acct.email, found: true, bcryptOk: ok });
      console.log(`${ok ? '✅' : '❌'} DB auth ${ok ? 'OK' : 'FAILED'} for ${acct.email}`);
    } catch (err) {
      dbResults.push({ email: acct.email, found: false, error: err.message });
      console.log(`💥 ERROR checking ${acct.email}: ${err.message}`);
    }
  }

  // Now attempt production sign-ins for those that passed DB auth
  const toTestProd = accounts.filter(a => dbResults.find(r => r.email === a.email && r.found && r.bcryptOk));

  if (toTestProd.length === 0) {
    console.log('\n⚠️ No accounts passed DB auth; skipping production sign-in tests');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🌐 Attempting production sign-ins for ${toTestProd.length} accounts...\n`);

  const prodResults = await Promise.all(toTestProd.map(async (user) => {
    try {
      const csrfResp = await fetch(`${baseUrl}/api/auth/csrf`);
      const csrf = await csrfResp.json();

      const resp = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: user.email,
          password: user.password,
          csrfToken: csrf.csrfToken,
          callbackUrl: baseUrl,
          json: 'true'
        }),
        redirect: 'manual'
      });

      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      const success = resp.status === 200 && data.url && !data.url.includes('error');
      return { email: user.email, success, status: resp.status, data };
    } catch (err) {
      return { email: user.email, success: false, error: err.message };
    }
  }));

  console.log('\n📊 Production sign-in results:\n');
  prodResults.forEach((r) => {
    if (r.success) console.log(`✅ ${r.email} LOGIN OK (status ${r.status})`);
    else console.log(`❌ ${r.email} LOGIN FAILED`, r.error || r.data || '');
  });

  await prisma.$disconnect();
}

runTests().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

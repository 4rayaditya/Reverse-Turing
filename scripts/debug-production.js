#!/usr/bin/env node

/**
 * Production Debugging Checklist for "Invalid email or password" issue
 * 
 * Run through these steps to diagnose the production auth issue:
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  PRODUCTION AUTH DEBUGGING GUIDE                               ║
╚════════════════════════════════════════════════════════════════╝

The auth works locally but fails on Vercel. Here's how to fix it:

STEP 1: Verify Vercel Environment Variables
────────────────────────────────────────────────────────────────
Go to: https://vercel.com → Your Project → Settings → Environment Variables

CRITICAL Variables that MUST be set for Production:

✓ DATABASE_URL
  postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

✓ NEXTAUTH_SECRET
  7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385
  
✓ NEXTAUTH_URL  
  https://reverse-turing-aljm.vercel.app
  ⚠️  CRITICAL: Must be EXACTLY your Vercel domain with https://

✓ DIRECT_URL (for Prisma)
  postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres


STEP 2: Common Mistakes
────────────────────────────────────────────────────────────────
❌ NEXTAUTH_URL = "http://..." (missing https)
❌ NEXTAUTH_URL = "localhost..." (wrong domain)  
❌ NEXTAUTH_URL has trailing slash
❌ NEXTAUTH_SECRET is different between local & production
❌ DATABASE_URL is not set or incorrect


STEP 3: Redeploy After Fixing
────────────────────────────────────────────────────────────────
After updating environment variables in Vercel:

1. Go to Vercel → Deployments
2. Click the ... menu on latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete
5. Test login at: https://reverse-turing-aljm.vercel.app/login

Use credentials:
  Email: ray@gmail.com
  Password: ray


STEP 4: Check Vercel Logs
────────────────────────────────────────────────────────────────
If still failing, check logs:

1. Go to Vercel → Deployments → Click latest deployment
2. Click "Functions" tab → Click on /api/auth/[...nextauth]
3. Look for error messages in the logs


STEP 5: Test Database Connection
────────────────────────────────────────────────────────────────
Run this locally to confirm DB still has the user:

  node scripts/test-auth.js

Should show: ✅ Authentication would SUCCEED


MOST LIKELY ISSUE:
────────────────────────────────────────────────────────────────
Based on the symptoms, the issue is one of:

1. NEXTAUTH_URL is not set correctly in Vercel (most likely)
2. NEXTAUTH_SECRET is missing or different in Vercel
3. DATABASE_URL is not set in Vercel

To fix via Vercel UI:
1. Go to https://vercel.com
2. Find your project "reverse-turing-aljm"
3. Settings → Environment Variables
4. Add/Update the variables above
5. Redeploy

To fix via CLI (if you have vercel CLI linked):
  vercel env add NEXTAUTH_URL production
  # Enter: https://reverse-turing-aljm.vercel.app
  
  vercel env add NEXTAUTH_SECRET production
  # Enter: 7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385

Then redeploy:
  vercel --prod

`);

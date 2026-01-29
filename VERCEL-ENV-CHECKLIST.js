/**
 * VERCEL ENVIRONMENT VARIABLES CHECKLIST
 * 
 * Go to: https://vercel.com/your-username/reverse-turing-aljm/settings/environment-variables
 * 
 * Add these variables for "Production" environment:
 */

// 1. DATABASE_URL (CRITICAL)
// Value: postgresql://postgres:AdityaRay3464@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
// Scope: Production

// 2. DIRECT_URL (CRITICAL for migrations)
// Value: postgresql://postgres:AdityaRay3464@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres
// Scope: Production

// 3. SHADOW_DATABASE_URL (Recommended for migrations)
// Value: postgresql://postgres:AdityaRay3464@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres
// Scope: Production

// 4. NEXTAUTH_SECRET (CRITICAL - generate a new one for production!)
// Value: 7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385
// Scope: Production
// Generate new with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

// 5. NEXTAUTH_URL (CRITICAL - must match your deployment URL)
// Value: https://reverse-turing-aljm.vercel.app
// Scope: Production
// ⚠️ MUST start with https:// and match your exact Vercel domain

// 6. NEXT_PUBLIC_SUPABASE_ANON_KEY (Public)
// Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2amxvdnZlanRtcnByeXlieXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTM0MzQsImV4cCI6MjA4NTAyOTQzNH0.5ubQYUpMWHkutEU2SIRIJhmhCfp64BlAGHcv4zPuREg
// Scope: Production

// 7. SUPABASE_URL (Optional)
// Value: https://pvjlovvejtmrpryybyvg.supabase.co
// Scope: Production

// 8. SUPABASE_SERVICE_ROLE (Optional)
// Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2amxvdnZlanRtcnByeXlieXZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1MzQzNCwiZXhwIjoyMDg1MDI5NDM0fQ.Vsh5BDY8OyDz4oXwcLlSy1zoAgiVpKtgYnTlEMr11-c
// Scope: Production

// 9. NEXT_PUBLIC_SOCKET_URL (Required once socket server is deployed)
// Value: https://your-socket-server.render.com (or your deployed socket URL)
// Scope: Production
// ⚠️ Set this AFTER deploying socket-server.js to Render/Railway

/**
 * COMMON ISSUES:
 * 
 * 1. "Invalid email or password" on production but works locally
 *    - Check NEXTAUTH_SECRET matches between local and production
 *    - Verify NEXTAUTH_URL is set to https://reverse-turing-aljm.vercel.app
 *    - Ensure DATABASE_URL is set correctly
 * 
 * 2. Database connection issues
 *    - Use pgbouncer params in DATABASE_URL for Vercel
 *    - Use DIRECT_URL without pgbouncer for direct connections
 * 
 * 3. After updating env vars, you MUST redeploy
 *    - Go to Deployments > click ... > Redeploy
 *    - Or push a new commit to trigger redeployment
 */

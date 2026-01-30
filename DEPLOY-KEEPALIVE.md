# Quick Deployment Checklist - Render Keepalive Fix

## Files Changed
- ✅ `socket-server.js` - Added keepalive, reconnect logic
- ✅ `src/lib/db.ts` - Added runWithReconnect helper
- ✅ `src/lib/auth.ts` - Use reconnect wrapper for auth

## Pre-Deployment Steps

### 1. Commit Changes
```bash
git add socket-server.js src/lib/db.ts src/lib/auth.ts RENDER-KEEPALIVE-FIX.md
git commit -m "Fix: Add Render keepalive and Prisma reconnect handling"
git push
```

### 2. Verify Render Environment Variables
Go to https://dashboard.render.com → Your Service → Environment

**Required Variables:**
```env
RENDER_EXTERNAL_URL=https://reverse-turing-1.onrender.com
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
ALLOWED_ORIGINS=http://localhost:3000,https://your-vercel-app.vercel.app,https://reverse-turing-1.onrender.com
ADMIN_EMAIL=ray@gmail.com
```

### 3. Deploy to Render
Render will auto-deploy when you push to main branch.

**Or manual deploy:**
1. Go to Render Dashboard
2. Click your service
3. Click "Manual Deploy" → "Deploy latest commit"

## Post-Deployment Verification

### 1. Check Render Logs (30 seconds after deploy)
Look for these messages:
```
✅ [KeepAlive] Render detected - enabling self-ping every 40s
✅ [KeepAlive] Self-ping successful
✅ [DB] Keepalive query successful
```

### 2. Test Health Endpoint
```bash
curl https://reverse-turing-1.onrender.com/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-01-30T...","uptime":123.45,"activeSockets":0}
```

### 3. Test Login from Frontend
1. Go to https://your-vercel-app.vercel.app/login
2. Enter credentials: `ray@gmail.com` / password
3. Should redirect to `/game/lobby`

**Check browser console for:**
```
✅ Socket connected
✅ No 401 errors
✅ No "prepared statement" errors
```

### 4. Monitor for 2 Minutes
Watch Render logs for:
- Self-ping messages every ~40 seconds
- DB keepalive every ~30 seconds
- No error messages
- No instance restarts

## Success Indicators

### Render Logs (Healthy)
```
[Server] HTTP server listening on 0.0.0.0:3003
[KeepAlive] Render detected - enabling self-ping every 40s
[Connection] User ray@gmail.com connected
[KeepAlive] Self-ping successful
[DB] Keepalive query successful
[KeepAlive] Self-ping successful
[DB] Keepalive query successful
```

### Browser Console (Healthy)
```
Socket connected
Sign in result: { ok: true, ... }
```

### No More These Errors
- ❌ ~~`prepared statement "s0" already exists`~~
- ❌ ~~`Instance failed multiple times`~~
- ❌ ~~`api/auth/callback/credentials:1 Failed to load resource: 401`~~
- ❌ ~~`Error in PostgreSQL connection: Error { kind: Closed }`~~

## If Issues Persist

### Issue: Still seeing 401 errors
**Solution:**
1. Check `NEXTAUTH_SECRET` matches in both Vercel and Render
2. Verify `DATABASE_URL` is correct
3. Check Render logs for `[Auth] Database error`

### Issue: Self-ping not working
**Solution:**
1. Verify `RENDER_EXTERNAL_URL` is set correctly
2. Should be exactly: `https://reverse-turing-1.onrender.com`
3. No trailing slash

### Issue: DB connection errors
**Solution:**
1. Check `DATABASE_URL` includes `?pgbouncer=true`
2. Verify `DIRECT_URL` is set
3. Test DB connection manually:
   ```bash
   # From Render shell
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.$queryRaw\`SELECT 1\`.then(console.log)"
   ```

### Issue: Instance still restarting
**Solution:**
1. Check Render plan (Free tier has 750 hrs/month limit)
2. Verify no memory leaks (check memory usage in dashboard)
3. Review full error logs in Render dashboard

## Rollback (If Needed)

If the fix causes issues, rollback:
```bash
git revert HEAD
git push
```

Render will auto-deploy the previous version.

## Next Steps After Successful Deploy

1. ✅ Monitor for 24 hours
2. ✅ Check login works consistently
3. ✅ Verify no instance failures
4. ✅ Document any issues found

## Support

- **Render Logs:** https://dashboard.render.com → Your Service → Logs
- **Vercel Logs:** https://vercel.com → Your Project → Deployments → Logs
- **Database Logs:** Supabase Dashboard → Database → Logs

---

**Estimated Time:** 5-10 minutes
**Risk Level:** Low (includes automatic reconnect fallbacks)
**Rollback Time:** 2 minutes

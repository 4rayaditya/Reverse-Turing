# Render Deployment Fix for WebSocket Issues

## Problem
WebSocket connections failing with "websocket error" due to:
1. CORS/origin mismatch
2. Auth middleware blocking handshakes
3. Missing environment variables

## Solution Applied

### 1. Client Changes (src/lib/socket-client.ts)
- Changed transport priority to `['polling', 'websocket']` to allow fallback
- Polling will establish connection first, then upgrade to websocket if possible

### 2. Server Changes (socket-server.js)
- Added handshake logging to debug origin/transport issues
- Logs: origin, referer, transport type, and secure flag

### 3. Auth Middleware (lib/socket-auth.js)
- Changed from **blocking** to **permissive** mode
- Missing/invalid tokens now allow connection as guest user
- Prevents auth from blocking socket handshakes during debugging

### 4. Environment Variables (.env)
Updated local `.env` with:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://reverse-turing-aljm.vercel.app,https://reverse-turing-1.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://reverse-turing-1.onrender.com
```

## **CRITICAL: Update Render Environment Variables**

### On Render Dashboard (Socket Server Service)

1. Go to: https://dashboard.render.com
2. Select your socket service: **reverse-turing-1**
3. Go to **Environment** tab
4. Update/add these variables:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://reverse-turing-aljm.vercel.app,https://reverse-turing-1.onrender.com
NEXTAUTH_SECRET=7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385
DATABASE_URL=postgresql://postgres.pvjlovvejtmrpryybyvg:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres
PORT=3003
NODE_ENV=production
ADMIN_EMAIL=ray@gmail.com
```

5. Click **Save Changes**
6. Render will auto-redeploy the service

### On Vercel Dashboard (Frontend)

1. Go to: https://vercel.com/dashboard
2. Select your project: **reverse-turing**
3. Go to **Settings** → **Environment Variables**
4. Add/update:

```env
NEXT_PUBLIC_SOCKET_URL=https://reverse-turing-1.onrender.com
NEXTAUTH_SECRET=7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385
NEXTAUTH_URL=https://reverse-turing-aljm.vercel.app
DATABASE_URL=postgresql://postgres.pvjlovvejtmrpryybyvg:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres
```

5. Redeploy from **Deployments** tab

## Testing After Deployment

1. Open browser DevTools → Console
2. Navigate to https://reverse-turing-aljm.vercel.app
3. Watch for socket connection logs:
   - Should see `[Socket] Connected to server` (success)
   - OR `[Socket] Connection error: ...` with details

4. Check Render logs:
   ```
   [Socket] Handshake: { origin: 'https://reverse-turing-aljm.vercel.app', ... }
   [SocketAuth] Authenticated user: ...
   ```

## If Still Failing

### Check Render Service Type
- Service **must** be a **Web Service** (not Background Worker)
- Go to service settings → verify it's exposed on HTTP/HTTPS

### Check Render Logs
```bash
# On Render dashboard → Logs tab
# Look for:
# - CORS errors
# - Auth middleware rejections
# - Origin mismatches
```

### Force Polling Only (Temporary Test)
In `src/lib/socket-client.ts`:
```typescript
transports: ['polling'],  // Remove 'websocket' entirely
```

### Verify CORS in Browser
Open DevTools → Network tab → filter "socket.io"
- Check request headers: `Origin: https://reverse-turing-aljm.vercel.app`
- Check response headers: `Access-Control-Allow-Origin: ...`
- Should NOT see 403 or CORS policy errors

## Rollback Plan

If these changes cause issues, revert:

```bash
git checkout HEAD~1 -- src/lib/socket-client.ts lib/socket-auth.js socket-server.js .env
npm run build
```

## Next Steps After Fix

1. **Restore strict auth** once connection works:
   - Change auth middleware back to blocking mode
   - Remove guest fallback logic

2. **Test with real users**:
   - Create test accounts
   - Join pools
   - Verify real-time updates work

3. **Monitor production**:
   - Watch Render logs for errors
   - Check Sentry/error tracking if enabled

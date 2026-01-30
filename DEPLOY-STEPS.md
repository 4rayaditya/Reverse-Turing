# Quick Deploy Steps

## Step 1: Commit and Push Code Changes

```powershell
git add .
git commit -m "fix: socket connection - allow polling fallback, add CORS origins, permissive auth"
git push origin main
```

## Step 2: Update Render Environment Variables (CRITICAL)

### Option A: Via Render Dashboard (Recommended)
1. Go to https://dashboard.render.com
2. Click your service: **reverse-turing-1**
3. Click **Environment** on left sidebar
4. Add/Update these variables:

```
ALLOWED_ORIGINS = http://localhost:3000,https://reverse-turing-aljm.vercel.app,https://reverse-turing-1.onrender.com
```

5. Click **Save Changes** → Render will auto-redeploy

### Option B: Via Render CLI (if installed)
```powershell
# Install if needed
npm install -g @render/cli

# Login
render login

# Update env vars
render env set ALLOWED_ORIGINS="http://localhost:3000,https://reverse-turing-aljm.vercel.app,https://reverse-turing-1.onrender.com" --service reverse-turing-1

# Trigger manual deploy
render deploy --service reverse-turing-1
```

## Step 3: Update Vercel Environment Variables

### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select project: **reverse-turing**
3. Settings → Environment Variables
4. Add if missing:

```
NEXT_PUBLIC_SOCKET_URL = https://reverse-turing-1.onrender.com
```

5. Go to Deployments tab
6. Click ⋯ on latest deployment → **Redeploy**

### Via Vercel CLI
```powershell
# Install if needed
npm i -g vercel

# Login
vercel login

# Set env var (production)
vercel env add NEXT_PUBLIC_SOCKET_URL production
# Enter: https://reverse-turing-1.onrender.com

# Redeploy
vercel --prod
```

## Step 4: Test Connection

### Open Browser DevTools Console
1. Navigate to https://reverse-turing-aljm.vercel.app
2. Open DevTools (F12) → Console tab
3. Look for:
   - ✅ `[Socket] Connected to server` (SUCCESS)
   - ❌ `❌ Socket connection error: ...` (check Render logs)

### Check Render Logs
1. Go to Render dashboard → **reverse-turing-1** service
2. Click **Logs** tab
3. Watch for:
```
[Socket] Handshake: { origin: 'https://reverse-turing-aljm.vercel.app', ... }
[SocketAuth] Authenticated user: ... OR allowing connection as guest
```

## Step 5: If Still Failing

### Test Locally First
```powershell
# Terminal 1: Start socket server
npm run dev:socket

# Terminal 2: Start Next.js dev
npm run dev

# Open http://localhost:3000
# Check if socket connects locally
```

### Force Polling Test (Production)
Edit `src/lib/socket-client.ts`:
```typescript
transports: ['polling'],  // Remove 'websocket'
```
Commit, push, redeploy → if this works, issue is WebSocket upgrade

### Check Render Service Settings
1. Go to Render dashboard → **reverse-turing-1**
2. Settings tab
3. Verify:
   - **Type:** Web Service (not Background Worker)
   - **Plan:** Free or Starter
   - **Region:** Any
   - **Branch:** main
   - **Build Command:** `npm install`
   - **Start Command:** `node socket-server.js`

## Step 6: Monitor Production

### Render Logs (Real-time)
```powershell
# If using Render CLI
render logs --service reverse-turing-1 --tail
```

### Browser Network Tab
1. DevTools → Network tab
2. Filter: "socket.io"
3. Look for:
   - Initial polling request (should be 200 OK)
   - Upgrade request (may fail, but polling should work)

## Troubleshooting Checklist

- [ ] Code pushed to GitHub
- [ ] Render env var `ALLOWED_ORIGINS` updated
- [ ] Render service redeployed
- [ ] Vercel env var `NEXT_PUBLIC_SOCKET_URL` set
- [ ] Vercel frontend redeployed
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Render logs show handshake attempts
- [ ] Render logs show correct origin
- [ ] No CORS errors in browser console

## Quick Status Check

Run this in PowerShell:
```powershell
# Test socket server health
curl https://reverse-turing-1.onrender.com/

# Should return: OK (Status 200)
```

## Need Help?

If connection still fails after all steps:
1. Share Render logs (last 50 lines)
2. Share browser console errors
3. Share Network tab screenshot (socket.io requests)

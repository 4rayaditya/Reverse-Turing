# Production Deployment Guide

## 🚀 Deployment for Live Event (FREE TIER)

### Prerequisites
- GitHub account
- Vercel account (free)
- Railway/Render account (free)
- Supabase account (free)

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project (free tier)
3. Wait for database to provision (~2 minutes)

### 1.2 Get Connection Strings
1. Go to Settings → Database
2. Copy **Connection Pooling** string (with `pgbouncer=true`) for `DATABASE_URL`
3. Copy **Direct Connection** string (port 5432) for `DIRECT_URL`

### 1.3 Run Migrations
```bash
# Update .env with your Supabase credentials
DATABASE_URL="postgresql://postgres:your-password@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres"

# Push schema to database
npm run db:push
```

### 1.4 Create Test Users (Optional)
```bash
node scripts/create-test-users.js
```

---

## Step 2: Frontend Deployment (Vercel)

### 2.1 Push to GitHub
```bash
git init
git add .
git commit -m "Production ready"
git branch -M main
git remote add origin https://github.com/yourusername/reverse-turing-poker.git
git push -u origin main
```

### 2.2 Deploy to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables:
   ```
   DATABASE_URL=postgresql://...?pgbouncer=true
   DIRECT_URL=postgresql://...
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   ```
5. Deploy

**Note:** Vercel URL will be `https://your-project.vercel.app`

---

## Step 3: Socket Server Deployment (Railway)

### 3.1 Create Railway Project
1. Go to https://railway.app
2. Create new project → Deploy from GitHub repo
3. Select your repository

### 3.2 Configure Service
1. Add service → Select "socket-server.js"
2. Set start command:
   ```bash
   node socket-server.js
   ```

### 3.3 Set Environment Variables
Add these in Railway dashboard:
```
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=same-as-vercel
PORT=3003
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
NODE_ENV=production
```

### 3.4 Get Public URL
1. Railway will provide a public URL: `https://your-app.up.railway.app`
2. Note this URL - you'll need it for frontend config

---

## Step 4: Connect Frontend to Socket Server

### 4.1 Update Frontend Environment
In Vercel dashboard, add:
```
NEXT_PUBLIC_SOCKET_URL=https://your-app.up.railway.app
```

### 4.2 Update Socket Client
Edit `src/lib/socket-client.ts`:
```typescript
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003';
```

### 4.3 Redeploy
Vercel will auto-redeploy when you push changes.

---

## Alternative: Render (Instead of Railway)

### Render Setup
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node socket-server.js`
   - **Environment:** Node
   - **Plan:** Free

5. Add environment variables (same as Railway)

6. Get public URL: `https://your-app.onrender.com`

**Note:** Render free tier spins down after 15 min of inactivity. Warm up before event!

---

## Pre-Event Checklist

### 1 Day Before
- [ ] Test complete game flow with 6 players
- [ ] Verify AI responses are working
- [ ] Check connection stability
- [ ] Verify points system working correctly
- [ ] Test reconnection handling

### 2 Hours Before
- [ ] Wake up Render service (if using Render)
- [ ] Run test game with all features
- [ ] Clear any test data from database
- [ ] Verify leaderboard displays correctly

### 30 Minutes Before
- [ ] Create game pools
- [ ] Share join links with players
- [ ] Have backup plan (local server) ready

---

## Monitoring

### Check Socket Server Health
```bash
curl https://your-socket-server.com/health
```

### View Logs
- **Railway:** Dashboard → Logs tab
- **Render:** Dashboard → Logs
- **Vercel:** Dashboard → Functions → Logs

### Database Status
- **Supabase:** Dashboard → Database → Connections

---

## Troubleshooting

### "Address already in use"
```bash
# Kill existing process
lsof -ti:3003 | xargs kill -9
# Or on Windows:
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

### Socket Connection Failed
1. Check CORS in socket server: `ALLOWED_ORIGINS`
2. Verify socket URL in frontend matches deployed URL
3. Check Railway/Render service is running

### AI Not Working
1. Verify server logs show no unexpected errors
2. Verify API key has quota remaining
3. Check logs for AI timeout errors
4. Fallback templates will be used automatically

### Database Connection Issues
1. Verify connection strings are correct
2. Check Supabase project is active (free tier pauses after 1 week inactivity)
3. Wake up database: open Supabase dashboard

### Players Can't Join
1. Check pool isn't full (6 players max)
2. Verify authentication is working
3. Check user has sufficient points
4. Verify no duplicate joins

---

## Cost Breakdown (Free Tier Limits)

| Service | Free Tier | Sufficient For |
|---------|-----------|----------------|
| Supabase | 500MB DB, 2GB bandwidth | ✅ 12 players |
| Vercel | 100GB bandwidth | ✅ Unlimited |
| Railway | 500 hrs/month, $5 credit | ✅ 1 event |
| Render | 750 hrs/month | ✅ 1 event |
| Local AI | N/A | ✅ local templates |

**Total Cost: $0/month** for live event usage.

---

## Production Best Practices

### Security
✅ JWT authentication on socket connections  
✅ Input validation with Zod  
✅ Rate limiting (100 req/10sec per user)  
✅ CORS restricted to frontend domain  
✅ SQL injection protected (Prisma)  

### Reliability
✅ Reconnection handling (60 second window)  
✅ Race condition prevention (locks)  
✅ AI timeout fallback (8 seconds)  
✅ Graceful error handling  
✅ Server-side points validation  

### Performance
✅ In-memory game state (fast)  
✅ Pooled DB connections (Supabase)  
✅ Event-based updates (not full state)  
✅ Optimized 3D rendering  

---

## Support

If issues arise during event:

1. **Check logs first** (Railway/Render dashboard)
2. **Restart socket server** (Railway: Settings → Restart)
3. **Failover to local** (if critical): `npm run dev:socket`
4. **Database issue**: Check Supabase dashboard

---

## Post-Event

### Export Results
```sql
-- Connect to Supabase SQL Editor
SELECT 
  u.email, 
  u.name, 
  u.points, 
  u.games_played, 
  u.wins 
FROM users u 
ORDER BY u.points DESC;
```

### Cleanup
- Keep database for leaderboard
- Archive game logs
- Download any important data
- Deactivate API keys if not continuing

---

## Going Live

```bash
# 1. Test everything locally first
npm run dev              # Terminal 1
npm run dev:socket       # Terminal 2

# 2. Deploy to production
git push                 # Triggers Vercel + Railway deploys

# 3. Verify deployments
# - Visit Vercel URL
# - Check Railway logs
# - Test socket connection
# - Run test game with 2 players

# 4. Go live! 🎉
```

**You're production-ready. Good luck with your event! 🚀**

# Production Checklist ✅

## Pre-Deployment

### Code Ready
- [x] Production socket server (`socket-server.js`)
- [x] JWT authentication middleware
- [x] Zod input validation
- [x] Rate limiting (100 req/10sec)
- [x] Reconnection handling (60sec window)
- [x] Local AI-style answer generation
- [x] Race condition prevention (locks)
- [x] Server-side points validation
- [x] Graceful error handling
- [x] CORS security

### Database
- [x] Prisma schema with indexes
- [x] User model with stats (gamesPlayed, wins)
- [x] Pooled connection support
- [x] Migration ready

### Dependencies
- [x] jsonwebtoken  
- [x] validator
- [x] zod
- [x] socket.io

---

## Configuration Checklist

### Environment Variables (.env)
```bash
# Required
✅ DATABASE_URL (with ?pgbouncer=true)
✅ DIRECT_URL (for migrations)
✅ NEXTAUTH_SECRET (generate: openssl rand -base64 32)
✅ NEXTAUTH_URL (production URL)

# Socket Server
✅ PORT (default: 3003)
✅ ALLOWED_ORIGINS (comma-separated frontend URLs)

```

### Deployment Platforms

#### Vercel (Frontend)
```bash
# Add these in Vercel dashboard:
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.railway.app
```

#### Railway/Render (Socket Server)
```bash
# Add these in Railway/Render dashboard:
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=same-as-vercel
PORT=3003
ALLOWED_ORIGINS=https://your-app.vercel.app
NODE_ENV=production
```

---

## Testing Checklist

### Local Testing
- [ ] Frontend runs: `npm run dev` (port 3000)
- [ ] Socket server runs: `npm run dev:socket` (port 3003)
- [ ] Database connection works
- [ ] Login works with test users
- [ ] Create pool works
- [ ] Join pool works (2+ browsers)
- [ ] Answer submission works
- [ ] AI answer generation works (local templates)
- [ ] Betting works
- [ ] Points calculation correct
- [ ] Winner detection correct
- [ ] Reconnection works (close/reopen browser)
- [ ] Rate limiting triggers after 100 requests
- [ ] Invalid input rejected (try negative bets)

### Production Testing
- [ ] Frontend deployed successfully
- [ ] Socket server deployed successfully
- [ ] CORS configured correctly
- [ ] JWT authentication works
- [ ] Test with 2 players end-to-end
- [ ] Test with 6 players (full pool)
- [ ] Test disconnection/reconnection
- [ ] Verify logs show no errors
- [ ] Performance acceptable (< 500ms latency)

---

## Security Verification

### Authentication
- [x] Socket.io requires JWT token
- [x] Token verified with NEXTAUTH_SECRET
- [x] User ID extracted from token
- [x] No unauthenticated connections allowed

### Input Validation
- [x] All inputs validated with Zod schemas
- [x] Answer length limited (5-500 chars)
- [x] Bet amount validated (positive, <= user points)
- [x] User ID verified matches authenticated user
- [x] Strings sanitized (XSS prevention)

### Rate Limiting
- [x] 100 requests per 10 seconds per user
- [x] Tracked per userId
- [x] Automatic reset after window

### Game Integrity
- [x] Points never go negative (Math.max(0, points))
- [x] Bet amount validated against current points
- [x] Duplicate bets prevented
- [x] Race conditions prevented (locks)
- [x] Server-side validation (never trust client)

---

## Performance Checklist

### Optimization
- [x] In-memory game state (fast)
- [x] Pooled database connections
- [x] Event-based socket updates (not full state)
- [x] AI timeout (8 seconds max)
- [x] Automatic cleanup (disconnected players)

### Capacity
- [x] Max 2 pools
- [x] Max 6 players per pool
- [x] Max 12 concurrent players
- [x] Supabase free tier sufficient
- [x] Local answer generator sufficient (no external rate limits)

---

## Live Event Checklist

### 1 Day Before
- [ ] Deploy to production
- [ ] Run full test with 2+ players
- [ ] Verify all features work
- [ ] Check logs for errors
- [ ] Document any issues

### 2 Hours Before
- [ ] Restart services (Railway/Render)
- [ ] Clear test data from database
- [ ] Verify services healthy
- [ ] Test create/join pool
- [ ] Prepare backup plan (local server)

### 30 Minutes Before
- [ ] Create game pools
- [ ] Share join URLs with players
- [ ] Monitor logs
- [ ] Have terminal ready for emergency fixes

### During Event
- [ ] Monitor Railway/Render logs
- [ ] Watch for connection issues
- [ ] Track player count
- [ ] Note any bugs for post-event fix

### After Event
- [ ] Export final leaderboard
- [ ] Backup database
- [ ] Review logs
- [ ] Document lessons learned

---

## Emergency Procedures

### Socket Server Down
```bash
# Quick restart on Railway:
Railway Dashboard → Settings → Restart

# Or deploy local backup:
npm run dev:socket
# Then use ngrok: ngrok http 3003
# Update NEXT_PUBLIC_SOCKET_URL
```

### Database Connection Lost
```bash
# Wake up Supabase (if paused):
1. Open Supabase dashboard
2. Wait for database to wake
3. Restart socket server
```

### Too Many Players (> 12)
```bash
# Server will reject joining full pools
# Create additional pools manually:
# Players click "Create New Pool" button
```

### AI Not Working
```bash
# Server automatically falls back to templates
# No action needed - game continues normally
# Check logs for "AI generation failed, using fallback"
```

---

## Monitoring URLs

### Health Checks
```bash
# Frontend
https://your-app.vercel.app

# Socket Server (check logs)
Railway: https://railway.app/dashboard
Render: https://dashboard.render.com

# Database
Supabase: https://supabase.com/dashboard/project/xxx
```

### Logs
```bash
# Vercel Logs
Vercel Dashboard → Project → Logs

# Railway Logs  
Railway Dashboard → Service → Logs tab

# Render Logs
Render Dashboard → Service → Logs
```

---

## Success Metrics

### Game Must:
✅ Support 12 concurrent players  
✅ Handle disconnection/reconnection  
✅ Prevent cheating (server validation)  
✅ Complete games without crashes  
✅ Calculate points correctly  
✅ Generate AI answers (or fallback)  

### Performance Must:
✅ < 500ms socket latency  
✅ < 2s page load  
✅ < 8s AI answer generation  
✅ No database connection errors  
✅ No crashes during gameplay  

### Security Must:
✅ Authenticated connections only  
✅ Input validation on all events  
✅ Rate limiting active  
✅ CORS restricted to frontend  
✅ No negative points possible  

---

## Known Limitations (Acceptable)

- **Max 12 players** - By design for live event
- **In-memory state** - Lost on server restart (acceptable)
- **No Redis** - Not needed for 12 players
- **No horizontal scaling** - Single server sufficient
- **AI fallback** - If API fails, templates used (still playable)
- **Reconnect window** - 60 seconds only

---

## Post-Launch Todo (If Expanding)

- [ ] Add Redis for horizontal scaling
- [ ] Implement persistent game history
- [ ] Add spectator mode
- [ ] Add custom questions
- [ ] Add avatars/profiles
- [ ] Add tournament mode
- [ ] Add mobile optimization
- [ ] Add admin dashboard
- [ ] Add analytics
- [ ] Add A/B testing

---

## ✅ Ready for Production?

Run through this checklist. If all items marked ✅, you're ready to go live!

**Final Command to Deploy:**
```bash
git add .
git commit -m "Production ready - all systems go"
git push origin main
# Vercel and Railway will auto-deploy
```

**Good luck with your live event! 🎉🚀**

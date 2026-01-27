# 🚀 FINAL SETUP CHECKLIST

## ✅ What's Been Fixed

1. **Database Connection**
   - Supabase Postgres configured in `.env`
   - Prisma schema ready for Supabase

2. **Test Users Created**
   - Script ready: `scripts/create-test-users.js`
   - Creates 6 non-admin players with 1000 points each
   - Login: player1@test.com to player6@test.com / password123

3. **Game Logic Implemented**
   - Turn-based answering system
   - Betting mechanism (others bet while one answers)
   - Auto-rotation through players
   - Real-time synchronization via Socket.io
   - 10-round game format
   - Win/loss calculation and point updates

4. **UI Enhancements**
   - Answering phase with text input
   - Betting phase with slider and buttons
   - Result display with winners
   - Player status tracking
   - Beautiful animations

## 📋 STEPS TO RUN (In Order)

### 1. Configure Supabase
Ensure `.env` has your Supabase connection strings.

### 2. Setup Database
```bash
npm run db:push
```

### 3. Create Test Users
```bash
node scripts/create-test-users.js
```

### 4. Start Next.js (Terminal 1)
```bash
npm run dev
```

### 5. Start Socket Server (Terminal 2 - NEW WINDOW)
```bash
node socket-server.js
```

## 🎮 TO PLAY

1. Open **6 browser windows** (use different browsers or incognito):
   - Chrome window
   - Firefox window
   - Edge window
   - Chrome incognito
   - Firefox private
   - Edge InPrivate

2. Login to each with different accounts:
   - player1@test.com / password123
   - player2@test.com / password123
   - player3@test.com / password123
   - player4@test.com / password123
   - player5@test.com / password123
   - player6@test.com / password123

3. All players navigate to: http://localhost:3000/game/lobby

4. Join or create a pool

5. Navigate to the same game room

6. Click "START GAME" when 2+ players are ready

7. Play!
   - Answerer types response to prompt
   - Others bet HUMAN or AI
   - Reveal to see results
   - Points update automatically

## 🔍 Troubleshooting

### "Can't reach database server"
→ Verify `DATABASE_URL` and `DIRECT_URL` in `.env`, then run `npm run db:push`

### "Port 3000 already in use"
→ Run `npx kill-port 3000` then restart

### "Port 3003 already in use"
→ Run `npx kill-port 3003` then restart socket server

### Slow initial load (80 sec)
→ This is NORMAL for first compilation. Next loads are fast.

### Socket not connecting
→ Ensure socket-server.js is running in separate terminal

## 📁 Important Files

- `socket-server.js` - Game logic and real-time sync
- `src/components/game/game-ui.tsx` - UI with answer input and betting
- `src/components/game/game-client.tsx` - Socket connection manager
- `scripts/create-test-users.js` - Creates 6 test players
- `.env` - Database connection (Supabase)
- `QUICKSTART.md` - Full documentation

## 🎯 Game Features

✅ Turn-based answering (one player at a time)
✅ Other players bet on answer authenticity
✅ Real-time point updates
✅ 10-round format
✅ Auto-rotation of answerer
✅ Beautiful 3D UI with animations
✅ Persistent scores in database

## 🎊 YOU'RE READY!

Follow the steps above and enjoy the game!

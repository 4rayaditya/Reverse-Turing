# 🎮 Complete Setup Guide - Reverse Turing Poker

## ✅ What's Been Updated

### 1. **Supabase Connection Restored**
- Database connection configured for Supabase
- Connection strings updated in `.env`
- Direct URL added for migrations

### 2. **Game Logic Updated - Each Player Answers Once**
- In a pool with 6 players → 6 rounds total
- Each player answers exactly **1 question**
- The other 5 players bet on each answer
- Game ends when all players have answered once

### 3. **Game Flow**
```
Round 1: Player 1 answers → Players 2,3,4,5,6 bet
Round 2: Player 2 answers → Players 1,3,4,5,6 bet
Round 3: Player 3 answers → Players 1,2,4,5,6 bet
Round 4: Player 4 answers → Players 1,2,3,5,6 bet
Round 5: Player 5 answers → Players 1,2,3,4,6 bet
Round 6: Player 6 answers → Players 1,2,3,4,5 bet
Game Finished! → Show final scores
```

## 🚀 Setup Steps

### Step 1: Wake Up Supabase Database

**Your Supabase database is currently PAUSED.** You need to wake it up:

#### Option A: Wake Existing Database
1. Go to https://supabase.com/dashboard
2. Login and find your project
3. Click **"Restore"** or **"Unpause"** button
4. Wait 1-2 minutes

#### Option B: Create New Database (Recommended)
See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for detailed instructions.

**Quick steps:**
1. Go to https://supabase.com → New Project
2. Name: `reverse-turing-poker`, set password
3. Copy connection strings from Settings → Database
4. Update `.env` file (see below)

### Step 2: Update .env File

After getting your Supabase connection strings:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-xx-xxxx-x.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-xx-xxxx-x.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 3: Test Connection

```bash
node scripts/test-connection.js
```

If this passes ✅, continue. If it fails ❌, see troubleshooting below.

### Step 4: Setup Database

```bash
# Push database schema
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Create 6 test users
node scripts/create-test-users.js
```

### Step 5: Start the Application

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
node socket-server.js
```

### Step 6: Test with 6 Players

1. Open **6 browser windows** (use different browsers or incognito)
2. Go to http://localhost:3000 in each
3. Login with different accounts:
   - player1@test.com / password123
   - player2@test.com / password123
   - player3@test.com / password123
   - player4@test.com / password123
   - player5@test.com / password123
   - player6@test.com / password123
4. All join the same game room
5. Click "START GAME"
6. **Play the game!**

## 🎯 How the Game Works Now

### For the Answerer:
1. You receive a random question prompt
2. Type your answer (you can write as a human or copy from ChatGPT to pretend it's AI)
3. Click "SUBMIT ANSWER"
4. Wait for others to bet
5. See the reveal and move to next round

### For the Bettors:
1. Wait for the answerer to submit
2. Read the answer
3. Choose bet amount (10-1000 points)
4. Click "👤 HUMAN" or "🤖 AI"
5. Wait for reveal
6. If correct: Get 2x your bet back
7. If wrong: Lose your bet

### Game Rules:
- **6 players = 6 rounds** (each player answers once)
- **5 players = 5 rounds** (each player answers once)
- The answerer **cannot bet** on their own answer
- Everyone else **must bet**
- Winners get **2x their bet**
- Game ends when all players have answered

## 🐛 Troubleshooting

### ❌ "Can't reach database server"
**Problem:** Supabase database is paused

**Solution:**
1. Go to Supabase dashboard
2. Wake up the database
3. Or create a new database (see SUPABASE-SETUP.md)

### ❌ "Tenant or user not found"
**Problem:** Wrong connection string or deleted project

**Solution:**
1. Create a new Supabase project
2. Get fresh connection strings
3. Update `.env` file

### ❌ "Port 3000 already in use"
```bash
npx kill-port 3000
npm run dev
```

### ❌ "Port 3003 already in use"
```bash
npx kill-port 3003
node socket-server.js
```

### ❌ Players not seeing each other
**Problem:** Socket server not running

**Solution:**
1. Make sure `node socket-server.js` is running
2. Check terminal for "Socket.io server running on port 3003"
3. Refresh browser windows

### ⏱️ Compilation takes 60-80 seconds
**This is normal** for the first compile. Next.js is building and caching everything. Subsequent compilations are much faster (~2-3 seconds).

## 📊 Game Stats Tracking

Points are saved to database after each round:
- Check current points: Open http://localhost:3000/leaderboard
- View database: `npx prisma studio`

## 🎨 UI Features

- **3D Animated Poker Table** with dynamic lighting
- **Glassmorphic overlays** for modern UI
- **Real-time updates** via Socket.io
- **Smooth animations** with Framer Motion
- **Responsive design** works on desktop

## ✨ Next Steps

1. **Wake up Supabase** (or create new project)
2. **Update .env** with correct connection strings
3. **Run:** `node scripts/test-connection.js`
4. **If test passes:** Run setup commands
5. **Start both servers** (Next.js + Socket)
6. **Test with 6 players!**

## 📚 Documentation Files

- **SUPABASE-SETUP.md** - Detailed Supabase setup guide
- **QUICKSTART.md** - Quick reference guide
- **README.md** - Full project documentation

---

**Need help?** Check the troubleshooting section or review SUPABASE-SETUP.md for detailed database instructions.

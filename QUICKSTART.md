# Reverse Turing Poker - Complete Setup Guide

A multiplayer game where players take turns answering questions while others bet on whether the answer was written by a human or AI.

## 🎮 Game Flow

1. **Players join a pool/game room**
2. **Rounds rotate through players:**
   - One player receives a question prompt
   - They write an answer (or use AI)
   - Other players see the answer and bet points on whether it's HUMAN or AI
3. **Reveal phase:**
   - The truth is revealed
   - Winners get 2x their bet
   - Losers lose their bet
4. **Game continues for 10 rounds**

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- Supabase project (free tier)

### Step 1: Configure Supabase
Copy `.env.example` to `.env` and add your Supabase connection strings.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Push Schema & Generate Prisma Client
```bash
npm run db:push
```

### Step 4: Create Test Users
```bash
node scripts/create-test-users.js
```

This creates 6 test players:
- **Email:** player1@test.com to player6@test.com
- **Password:** password123
- **Starting Points:** 1000 each
- **Admin:** No (can only play, not admin)

### Step 5: Start the Development Server
```bash
npm run dev
```

### Step 6: Start the Socket Server (New Terminal)
Open a **new terminal window** and run:
```bash
node socket-server.js
```

## 🎯 How to Play with Multiple Users

1. Open http://localhost:3000 in **6 different browser windows**
   - Use different browsers (Chrome, Firefox, Edge)
   - Or use incognito/private windows
   
2. Login with different test accounts in each window:
   - Window 1: player1@test.com / password123
   - Window 2: player2@test.com / password123
   - Window 3: player3@test.com / password123
   - Window 4: player4@test.com / password123
   - Window 5: player5@test.com / password123
   - Window 6: player6@test.com / password123

3. All players navigate to the same game room (or create a pool and join)

4. When 2+ players are in the lobby, click **"START GAME"**

5. **Game begins!**
   - Each round, one player is chosen as the "answerer"
   - The answerer sees a question prompt and types a response
   - Other players see the answer and must bet on whether it's HUMAN or AI
   - After betting, click "Reveal" to see who won
   - Winners receive 2x their bet!
   - Game continues for 10 rounds

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, TailwindCSS, Framer Motion
- **3D Graphics:** React Three Fiber (Three.js)
- **Backend:** Next.js API Routes, Socket.io
- **Database:** PostgreSQL (Supabase), Prisma ORM
- **Auth:** NextAuth.js
- **Real-time:** Socket.io for live game updates

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, pools, games)
│   ├── game/          # Game pages
│   │   ├── [id]/      # Individual game room
│   │   └── lobby/     # Game lobby
│   ├── login/         # Authentication
│   └── signup/
├── components/
│   ├── game/          # Game UI components
│   │   ├── game-client.tsx
│   │   ├── game-ui.tsx
│   │   └── game-canvas.tsx
│   └── providers/     # Context providers (Socket, Theme)
├── lib/
│   ├── auth.ts        # Auth configuration
│   ├── db.ts          # Prisma database client
│   └── socket-client.ts
└── types/

prisma/
└── schema.prisma      # Database schema

scripts/
├── create-test-users.js  # Generate test players
└── make-admin.js

socket-server.js       # WebSocket server for real-time game
```

## 🐛 Troubleshooting

### Database Connection Issues
**Error:** `Can't reach database server`

**Solution:**
1. Verify `DATABASE_URL` and `DIRECT_URL` in `.env`
2. Ensure your Supabase project is running
3. Re-run `npm run db:push`

### Socket Connection Issues
**Error:** Can't connect to game server

**Solution:**
1. Make sure `socket-server.js` is running in a separate terminal
2. Check if port 3003 is available:
   ```bash
   netstat -ano | findstr :3003
   ```
3. Restart the socket server

### Slow Compilation
The first compilation may take 60-80 seconds. This is normal. Subsequent compilations are much faster due to Next.js caching.

### Port Already in Use
If port 3000 or 3003 is already in use:
- For Next.js (3000): `npx kill-port 3000` then restart
- For Socket.io (3003): `npx kill-port 3003` then restart

## 📝 Environment Variables

The `.env` file contains:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/reverse_turing_poker"
NEXTAUTH_SECRET="7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385"
NEXTAUTH_URL="http://localhost:3000"
```

## 🎲 Test Accounts

All test accounts created with `create-test-users.js`:

| Email | Username | Password | Points | Admin |
|-------|----------|----------|--------|-------|
| player1@test.com | player1 | password123 | 1000 | No |
| player2@test.com | player2 | password123 | 1000 | No |
| player3@test.com | player3 | password123 | 1000 | No |
| player4@test.com | player4 | password123 | 1000 | No |
| player5@test.com | player5 | password123 | 1000 | No |
| player6@test.com | player6 | password123 | 1000 | No |

## 🔄 Reset Database

To reset the database and start fresh:
```bash
npx prisma migrate reset
node scripts/create-test-users.js
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `node socket-server.js` | Start WebSocket server (port 3003) |
| `npx prisma studio` | Open Prisma Studio (database GUI) |
| `npx prisma migrate dev` | Create and apply database migrations |
| `npx prisma generate` | Generate Prisma Client |

## 🎨 Features

- ✅ Real-time multiplayer gameplay
- ✅ Turn-based answering system
- ✅ Betting mechanism with point system
- ✅ Beautiful 3D animated UI with glassmorphism
- ✅ Responsive design
- ✅ User authentication
- ✅ Persistent score tracking
- ✅ 10-round game format
- ✅ Auto-rotation of answerer
- ✅ Live game state synchronization
- ✅ Player join/leave handling

## 🎯 Game Rules

1. **Answering Phase (60 seconds)**
   - Selected player sees a prompt and types their answer
   - Other players wait

2. **Betting Phase (30 seconds)**
   - All non-answering players see the answer
   - Place bets (10-1000 points) on HUMAN or AI
   - Can only bet once per round

3. **Reveal Phase**
   - Truth is revealed (Human or AI)
   - Winners receive 2x their bet
   - Losers lose their bet
   - Answerer neither gains nor loses points

4. **Next Round**
   - Next player becomes the answerer
   - Cycle continues for 10 rounds

## 🚧 Future Enhancements

- [ ] AI integration (OpenAI API) for auto-generating answers
- [ ] Leaderboard system with rankings
- [ ] Tournament mode
- [ ] In-game chat system
- [ ] Spectator mode
- [ ] Custom question pools
- [ ] Achievement system
- [ ] Daily challenges
- [ ] Profile customization

## 📸 Screenshots

The game features:
- 3D animated poker table with dynamic lighting
- Glassmorphic UI overlays
- Smooth animations with Framer Motion
- Real-time updates for all players
- Beautiful gradient effects

## 🤝 Contributing

This is a demonstration project. Feel free to fork and enhance!

## 📄 License

MIT License - feel free to use this project as you wish.

---

**Ready to play?** Follow the setup instructions above and start your first game! 🎮

# Reverse Turing Poker 🎲🤖

**A production-ready multiplayer game where players distinguish between Human and AI answers.**

> ⚡ **Built for live events** - Zero paid services required for 12 players.

---

## 🎮 Game Features

- **Real-time Multiplayer**: Up to 12 players across 2 pools (6 per table)
- **AI vs Human**: Players guess which answer is human-generated
- **Poker-Style Betting**: Stake points on your guess (2x payout for correct)
- **3D Poker Table**: Stunning React Three Fiber visuals
- **Smart AI**: Local AI-style responses (no external services)
- **Production-Ready**: JWT auth, input validation, rate limiting, reconnection handling

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React, TypeScript, TailwindCSS |
| **3D Graphics** | React Three Fiber (Three.js) |
| **Real-time** | Socket.io with JWT authentication |
| **Database** | PostgreSQL (Supabase) + Prisma ORM |
| **Auth** | NextAuth.js with credential-based login |
| **AI** | Local answer generator (no external services) |
| **Validation** | Zod schemas |
| **Deployment** | Vercel (frontend) + Railway/Render (socket server) |

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- Supabase account (free tier)

### 1. Clone & Install
```bash
git clone <your-repo>
cd reverse-turing-poker
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials (see below)
```

### 3. Setup Database
```bash
# Push schema to Supabase
npm run db:push

# Create 6 test users (optional)
node scripts/create-test-users.js
```

### 4. Run Development Servers
```bash
# Terminal 1: Frontend (localhost:3000)
npm run dev

# Terminal 2: Socket Server (localhost:3003)
npm run dev:socket
```

### 5. Test the Game
- Open 2+ browser windows (or incognito)
- Login with test accounts:
  - `player1@test.com` / `password123`
  - `player2@test.com` / `password123`
- Join same pool and play!

---

## 🔐 Environment Variables

Create `.env` file with these values:

```env
# Database (Required - Supabase)
DATABASE_URL="postgresql://postgres:your-password@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres"

# NextAuth (Required)
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Socket Server (Optional - defaults shown)
PORT=3003
ALLOWED_ORIGINS=http://localhost:3000

```

---

## 📁 Project Structure

```
reverse-turing-poker/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── api/               # API routes
│   │   ├── game/              # Game pages
│   │   ├── login/             # Auth pages
│   │   └── leaderboard/       # Leaderboard
│   ├── components/            # React components
│   │   ├── game/              # Game UI & 3D canvas
│   │   └── providers/         # Context providers
│   └── lib/                   # Utilities
│       ├── auth.ts            # NextAuth config
│       ├── db.ts              # Prisma client
│       └── socket-client.ts   # Socket.io client
├── lib/                       # Backend modules
│   ├── game-state-manager.js  # Core game logic
│   ├── (no external AI)       # Local answer generator
│   ├── socket-auth.js         # JWT auth middleware
│   └── validation-schemas.js  # Zod validators
├── prisma/
│   └── schema.prisma          # Database schema
├── socket-server.js           # Socket server
├── DEPLOYMENT.md              # Full deployment guide
└── ARCHITECTURE.md            # System design docs
```

---

## 🎯 Game Flow

### Phase 1: Waiting
- Players join pool (2-6 players)
- Game auto-starts at 2+ players

### Phase 2: Answering (60 seconds)
- One player receives question
- Submits answer
- AI generates competing answer
- Both randomly assigned as "Answer A" and "Answer B"

### Phase 3: Betting (30 seconds)
- Other 5 players see both answers
- Bet points (10-1000) on which is human
- Lock in guess (A or B)

### Phase 4: Revealing (5 seconds)
- Correct answer revealed
- Winners get 2x their bet
- Losers lose their bet
- Leaderboard updates

### Repeat
- Rotates through all 6 players
- Each player answers exactly once
- Game ends after 6 rounds

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Supabase (from Settings → API)
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE="your-service-role-key"
```

### 4. Initialize the Database

Push the Prisma schema to your Supabase database:

```bash
npx prisma generate
npx prisma db push
```

For production, use migrations:
```bash
npx prisma migrate dev --name init
# On production: npx prisma migrate deploy
```

### 5. Run the Application

You need to run **both** the Socket.io server and the Next.js app:

**Terminal 1 (Socket Server):**
```bash
node socket-server.js
```

**Terminal 2 (Next.js App):**
```bash
npm run dev
```

### 6. Access the Game

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Home Page**: Landing page with game overview
- **Login**: `/login` - Create an account or sign in
- **Game**: `/game/[id]` - Join a game room
- **Leaderboard**: `/leaderboard` - View global rankings

## Game Rules

- **12 Players** divided into 2 pools (6 players each)
- Each player starts with **1000 points**
- **Each Round**:
  1. One player receives a question/prompt
  2. That player submits an answer (human-written or AI-generated)
  3. The other 5 players bet points and guess: Human or AI?
  4. Correct guesses win **2x the bet amount**
  5. Incorrect guesses lose the bet amount
- Question receiver rotates each round
- Game continues for 10 rounds (configurable)
- Player with the most points wins!

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Authentication
│   │   ├── game/[id]/         # Game room
│   │   └── leaderboard/       # Rankings
│   ├── components/
│   │   ├── game/              # 3D game components
│   │   │   ├── game-canvas.tsx   # Three.js 3D scene
│   │   │   ├── game-client.tsx   # Client wrapper
│   │   │   └── game-ui.tsx       # 2D UI overlay
│   │   ├── ui/                # ShadCN UI components
│   │   └── providers/         # Context providers (Socket, Theme)
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── auth.ts            # NextAuth config
│       └── validations/       # Zod schemas
├── prisma/
│   └── schema.prisma          # Database schema
├── socket-server.js           # Real-time game server
└── public/                    # Static assets
```

## Production Deployment

### Supabase Free Tier Considerations

The free tier includes:
- 500 MB database storage
- 50,000 MAU (Monthly Active Users)
- Unlimited API requests
- Real-time capabilities
- 5-10 GB bandwidth

**Recommendations for Competition/Live Event:**
- Monitor database connections and concurrent users
- Use conditional updates to prevent race conditions
- Enable connection pooling if running multiple server instances
- Consider upgrading to Pro tier ($25/month) for better performance and support

### Deployment Checklist

1. **Environment Variables** (Production)
   - Use strong `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
   - Add production domain to `NEXTAUTH_URL`
   - Never expose `SUPABASE_SERVICE_ROLE` to client

2. **Database Migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Deploy Next.js App** (Vercel recommended)
   ```bash
   vercel --prod
   ```

4. **Deploy Socket.io Server** (Railway, Render, or any Node.js host)
   - Ensure Socket.io server URL is accessible
   - Update client Socket connection URL in `src/lib/socket-client.ts`

5. **Security**
   - Enable Supabase Row Level Security (RLS) for sensitive operations
   - Add rate limiting to API routes
   - Sanitize all user inputs
   - Use HTTPS in production

## Development Tips

- **Hot Reload**: Next.js dev server auto-reloads; restart `socket-server.js` manually
- **3D Performance**: Reduce `dpr` in `<Canvas>` if frame rate is low
- **Database Inspection**: Use `npx prisma studio` to view/edit data
- **Socket Debugging**: Check browser console for Socket.io connection status

## Troubleshooting

**"Module not found: next-themes"**
```bash
npm install next-themes
```

**Database connection errors**
- Verify `DATABASE_URL` in `.env` matches Supabase credentials
- Check Supabase project status (Settings → Database)
- Ensure SSL mode is included: `?sslmode=require`

**Socket.io not connecting**
- Verify `socket-server.js` is running on port 3001
- Check CORS settings in `socket-server.js`
- Update client Socket URL if using different port

## License

MIT

## Credits

Built with ❤️ for the Reverse Turing Competition

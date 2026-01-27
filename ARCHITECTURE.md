# Reverse Turing Poker - Production Architecture

## System Design

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
│                    (Cloudflare/AWS)                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐           ┌────▼─────┐
    │ Next.js  │           │ Next.js  │
    │ Instance │           │ Instance │
    │   (Web)  │           │   (Web)  │
    └────┬─────┘           └────┬─────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Socket.io Cluster   │
         │  (with Redis Adapter) │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐           ┌────▼─────┐
    │  Redis   │           │ Supabase │
    │ (State)  │           │(Postgres)│
    └──────────┘           └──────────┘
```

## Component Responsibilities

### 1. Frontend (Next.js)
- **Pages:**
  - `/` - Landing page
  - `/login` - Authentication
  - `/lobby` - Pool selection & matchmaking
  - `/game/[poolId]` - Active game (3D scene)
  - `/leaderboard` - Global rankings

- **State Management:** Zustand or Jotai
- **Real-time:** Socket.io client
- **3D Rendering:** React Three Fiber (optimized)

### 2. Backend Services

#### A. Game Server (Socket.io + Node.js)
**Responsibilities:**
- Manage real-time game state
- Validate moves
- Broadcast events to players
- Handle disconnections

**Critical Fixes Needed:**
```javascript
// ❌ Current (Insecure)
const io = new Server(3003, {
  cors: { origin: "*" }
});

// ✅ Recommended
const io = new Server(3003, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
  }
});

// Add authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await verifyJWT(token);
    socket.userId = user.id;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Add rate limiting per user
const rateLimiter = new Map();
io.use((socket, next) => {
  const userId = socket.userId;
  const now = Date.now();
  const userLimit = rateLimiter.get(userId) || { count: 0, resetTime: now };
  
  if (now > userLimit.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + 10000 });
    next();
  } else if (userLimit.count < 100) {
    userLimit.count++;
    next();
  } else {
    next(new Error('Rate limit exceeded'));
  }
});
```

#### B. Redis Integration
**Purpose:** Distributed game state + pub/sub for multi-server scaling

```javascript
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Store game state in Redis instead of memory
async function getGameState(gameId) {
  const state = await pubClient.get(`game:${gameId}`);
  return JSON.parse(state);
}

async function setGameState(gameId, state) {
  await pubClient.setex(`game:${gameId}`, 3600, JSON.stringify(state));
}
```

#### C. Database Schema Optimization

```sql
-- Current issue: No indexes, no game history tracking

-- Improved schema:
CREATE TABLE pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL, -- 'waiting', 'active', 'finished'
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE INDEX idx_pools_status ON pools(status);

CREATE TABLE pool_players (
  pool_id UUID REFERENCES pools(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  final_points INTEGER,
  final_rank INTEGER,
  PRIMARY KEY (pool_id, user_id)
);

CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES pools(id),
  round_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  answerer_id UUID REFERENCES users(id),
  human_answer TEXT,
  ai_answer TEXT,
  correct_choice TEXT, -- 'human' or 'ai'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rounds_pool ON rounds(pool_id, round_number);

CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  guess TEXT NOT NULL, -- 'A' or 'B'
  was_correct BOOLEAN,
  points_change INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_round ON bets(round_id);

-- Add global leaderboard view
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
  u.id,
  u.email,
  u.name,
  COUNT(DISTINCT pp.pool_id) as games_played,
  AVG(pp.final_points) as avg_points,
  SUM(CASE WHEN pp.final_rank = 1 THEN 1 ELSE 0 END) as wins,
  u.points as current_points
FROM users u
LEFT JOIN pool_players pp ON u.id = pp.user_id
GROUP BY u.id, u.email, u.name, u.points
ORDER BY current_points DESC;

CREATE UNIQUE INDEX idx_leaderboard_id ON leaderboard(id);
```

### 3. AI Answer Generation (Local Templates)

AI answers are generated locally using simple templates in `lib/game-state-manager.js`.
This keeps the system fully self-contained with no external AI services.

### 4. Bottlenecks & Solutions

#### Bottleneck 1: Socket.io Broadcasting
**Problem:** Broadcasting game state to all players every update is expensive

**Solution:** Event-based updates instead of state broadcasting
```javascript
// ❌ Current (sends entire game state every time)
io.to(gameId).emit("game_state", game);

// ✅ Optimized (send only changes)
io.to(gameId).emit("round_started", {
  roundNumber: game.roundNumber,
  question: game.currentRound.question,
  answererId: game.currentRound.answerer
});

io.to(gameId).emit("answer_submitted", {
  answerA: game.currentRound.answerA,
  answerB: game.currentRound.answerB
});

io.to(gameId).emit("player_bet", {
  userId: bet.userId,
  hasBet: true // Don't reveal amount/guess to others
});
```

#### Bottleneck 2: 3D Rendering Performance
**Problem:** React Three Fiber can be heavy, especially with many meshes

**Solution:** Optimize 3D scene
```javascript
// Use instances for repeated geometry
import { Instances, Instance } from '@react-three/drei';

function ChipStacks() {
  return (
    <Instances limit={16}>
      <cylinderGeometry args={[0.25, 0.25, 0.1, 16]} />
      <meshStandardMaterial />
      
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} color={colors[i]} />
      ))}
    </Instances>
  );
}

// Enable frame budget limiting
<Canvas frameloop="demand" dpr={[1, 1.5]}>
  {/* Only re-render when needed */}
</Canvas>
```

#### Bottleneck 3: Database Writes
**Problem:** Writing to Supabase on every bet/point change

**Solution:** Batch updates + optimistic locking
```javascript
// Buffer updates, write every 5 seconds
const pendingUpdates = new Map();

function queuePointsUpdate(userId, points) {
  pendingUpdates.set(userId, points);
}

setInterval(async () => {
  if (pendingUpdates.size === 0) return;
  
  const updates = Array.from(pendingUpdates.entries()).map(([id, points]) => ({
    id,
    points
  }));
  
  await prisma.user.updateMany({
    data: updates
  });
  
  pendingUpdates.clear();
}, 5000);
```

### 5. Cost Optimization

**Monthly Cost Breakdown (1000 concurrent players):**

| Service | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| Supabase DB | $25 (Pro) | $25 | - |
| Vercel Hosting | $20 | $20 | - |
| Redis (Upstash) | N/A | $10 | - |
| AI Generation | N/A | $30 | - |
| Cloudflare | $0 (Free) | $0 | - |
| **Total** | **$45** | **$85** | - |

**Scaling to 10K players:**
| Service | Cost |
|---------|------|
| Supabase | $25 (pooler handles it) |
| Redis | $40 (Upstash Pro) |
| AI | $300 (can switch to local LLM) |
| Server | $100 (dedicated Socket.io) |
| **Total** | **$465/mo** |

**Revenue Model Suggestions:**
- Entry fee: 100 points = $0.50
- Premium accounts: $5/mo (unlimited games, custom avatars)
- Sponsorships: In-game ads
- **Break-even:** 93 premium users or 930 games/day

### 6. Security Improvements

```javascript
// Input sanitization
const validator = require('validator');

socket.on('submit_answer', async ({ gameId, userId, answer }) => {
  // Validate inputs
  if (!validator.isUUID(gameId) || !validator.isUUID(userId)) {
    return socket.emit('error', { message: 'Invalid IDs' });
  }
  
  // Sanitize answer
  const sanitized = validator.escape(answer.substring(0, 500));
  
  // Verify user owns this socket
  if (socket.userId !== userId) {
    return socket.emit('error', { message: 'Unauthorized' });
  }
  
  // Check if user is answerer
  const game = await getGameState(gameId);
  if (game.currentRound.answerer !== userId) {
    return socket.emit('error', { message: 'Not your turn' });
  }
  
  // Process answer...
});

// Add cheating detection
function detectCheating(userId, betHistory) {
  // Flag if user is consistently correct (>80%)
  const winRate = betHistory.filter(b => b.correct).length / betHistory.length;
  if (winRate > 0.85 && betHistory.length > 20) {
    flagUser(userId, 'Suspicious win rate');
  }
}
```

### 7. Implementation Priority

**Week 1: Critical Fixes**
1. ✅ Fix UI overlaps
2. ⚠️ Add authentication to Socket.io
3. ⚠️ Implement Redis for state management
4. ⚠️ Add input validation & rate limiting

**Week 2: Game Improvements**
5. ⚠️ Replace hardcoded AI with GPT-4o-mini
6. ⚠️ Fix game rotation logic
7. ⚠️ Improve database schema with proper indexes
8. ⚠️ Add game history tracking

**Week 3: Optimization**
9. ⚠️ Optimize 3D rendering
10. ⚠️ Implement event-based socket updates
11. ⚠️ Add caching layer
12. ⚠️ Performance testing & monitoring

**Week 4: Polish**
13. ⚠️ Add reconnection handling
14. ⚠️ Improve error handling
15. ⚠️ Add analytics
16. ⚠️ Security audit

---

## Immediate Action Items

Let me implement the most critical fixes right now:

1. Secure Socket.io server
2. Add proper validation
3. Integrate GPT-4o-mini for AI answers
4. Fix remaining UI issues

Should I proceed with these implementations?

// socket-server.js
/**
 * Production-ready Socket.io server for Reverse Turing Poker
 * 
 * Features:
 * - JWT authentication
 * - Rate limiting
 * - Input validation
 * - Race condition prevention
 * - Reconnection handling
 * - Local AI-style answer generation (no external services)
 */

require('dotenv').config();
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { GameStateManager } = require("./lib/game-state-manager");
const { socketAuthMiddleware, RateLimiter } = require("./lib/socket-auth");
const { schemas, validateInput, sanitizeString } = require("./lib/validation-schemas");
const http = require('http');

// Initialize services
const prisma = new PrismaClient();
const gameManager = new GameStateManager();
const rateLimiter = new RateLimiter(100, 10000); // 100 requests per 10 seconds
const connectedSockets = new Map(); // userId -> socketId
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ray@gmail.com';

function isAdminUser(user) {
  return !!(user?.isAdmin || user?.email === ADMIN_EMAIL);
}

function getTimerState(game) {
  if (!game) return { timerKind: null, timerPaused: false, timerRemainingMs: null };
  const remaining = game.timerPaused
    ? (game.timerRemainingMs || 0)
    : Math.max(0, (game.timerEndsAt || Date.now()) - Date.now());
  return {
    timerKind: game.timerKind || null,
    timerPaused: !!game.timerPaused,
    timerRemainingMs: remaining
  };
}

function buildAdminPoolState(game) {
  const timer = getTimerState(game);
  return {
    poolId: game.poolId,
    ownerId: game.ownerId,
    phase: game.phase,
    players: game.players.map(p => ({
      userId: p.userId,
      name: p.name,
      points: p.points,
      isConnected: p.isConnected
    })),
    pendingRequests: (game.pendingJoinRequests || []).map(r => ({
      userId: r.userId,
      name: r.name,
      requestedAt: r.requestedAt
    })),
    currentRound: game.currentRound ? {
      question: game.currentRound.question,
      answerer: game.currentRound.answerer
    } : null,
    timer
  };
}

function emitAdminPools() {
  const pools = gameManager.getAllGames().map(buildAdminPoolState);
  io.to('admins').emit('admin_pools', { pools });
  console.log(`[Admins] Emitted admin_pools to admins room (${pools.length} pools)`);
}

function emitAdminJoinRequests() {
  const requests = gameManager.getAllPendingRequests();
  io.to('admins').emit('admin_join_requests', { requests });
  console.log(`[Admins] Emitted admin_join_requests to admins room (${requests.length} requests)`);

  // Fallback: emit directly to sockets with admin flag in case room join failed
  try {
    for (const [uid, sid] of connectedSockets.entries()) {
      const s = io.sockets.sockets.get(sid);
      if (s && (s.userIsAdmin || s.tokenIsAdmin)) {
        s.emit('admin_join_requests', { requests });
      }
    }
  } catch (err) {
    console.error('[Admins] Fallback emit failed:', err);
  }
}

// Validate environment
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[Server] NEXTAUTH_SECRET not set. Exiting.');
  process.exit(1);
}


// Create HTTP server and attach Socket.io with security
const PORT = process.env.PORT || 3003;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  // simple health check endpoint
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log(`[Server] HTTP server listening on ${addr.address}:${addr.port}`);
});

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

console.log(`[Server] Socket.io server starting on port ${PORT}`);
console.log(`[Server] Allowed origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
console.log('[Server] AI enabled: false (local templates)');

// Apply authentication middleware
io.use(socketAuthMiddleware(process.env.NEXTAUTH_SECRET));

// Game state event listeners
gameManager.on('round_started', ({ poolId, game }) => {
  io.to(poolId).emit('round_started', {
    roundNumber: game.roundNumber,
    question: game.currentRound.question,
    answererId: game.currentRound.answerer,
    phase: game.phase,
    timer: getTimerState(game)
  });
});

gameManager.on('answer_submitted', ({ poolId, game }) => {
  io.to(poolId).emit('answer_submitted', {
    answerA: game.currentRound.answerA,
    answerB: game.currentRound.answerB,
    phase: game.phase,
    timer: getTimerState(game)
  });
});

gameManager.on('bet_placed', ({ poolId, game }) => {
  // Don't reveal who bet what, just update status
  io.to(poolId).emit('bet_placed', {
    betsCount: Object.keys(game.bets).length,
    phase: game.phase,
    timer: getTimerState(game)
  });
});

gameManager.on('round_revealed', ({ poolId, game, winners }) => {
  io.to(poolId).emit('round_revealed', {
    correctChoice: game.currentRound.correctChoice,
    humanAnswer: game.currentRound.humanAnswer,
    aiAnswer: game.currentRound.aiAnswer,
    winners: winners.map(w => ({ userId: w.userId, name: w.name, won: w.won })),
    players: game.players.map(p => ({
      userId: p.userId,
      name: p.name,
      points: p.points,
      isConnected: p.isConnected
    }))
  });
  // Emit global leaderboard update (top players) after round reveal
  (async () => {
    try {
      const top = await prisma.user.findMany({ orderBy: { points: 'desc' }, take: 20, select: { id: true, name: true, points: true } });
      io.emit('leaderboard_updated', { leaderboard: top.map(u => ({ userId: u.id, name: u.name, points: u.points })) });
    } catch (err) {
      console.error('[Leaderboard] Failed to fetch top users:', err);
    }
  })();
});

gameManager.on('game_finished', ({ poolId, game }) => {
  io.to(poolId).emit('game_finished', {
    finalRankings: game.players.map(p => ({
      rank: p.rank,
      userId: p.userId,
      name: p.name,
      points: p.points
    }))
  });

  // Persist final results to database
  persistGameResults(poolId, game).catch(console.error);
  // Emit global leaderboard update when game finishes
  (async () => {
    try {
      const top = await prisma.user.findMany({ orderBy: { points: 'desc' }, take: 20, select: { id: true, name: true, points: true } });
      io.emit('leaderboard_updated', { leaderboard: top.map(u => ({ userId: u.id, name: u.name, points: u.points })) });
    } catch (err) {
      console.error('[Leaderboard] Failed to fetch top users after finish:', err);
    }
  })();
});

// Socket connection handler
io.on("connection", async (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (dbErr) {
    console.error('[DB] Failed to fetch user on socket connection, proceeding with token/email fallback:', dbErr.message || dbErr);
  }

  const userIsAdmin = isAdminUser(user);
  // Check admin: token flag, DB flag, or email match
  const isAdminByEmail = (userEmail === ADMIN_EMAIL);
  socket.userIsAdmin = !!socket.tokenIsAdmin || userIsAdmin || isAdminByEmail;
  socket.userName = sanitizeString(user?.name || socket.userEmail || 'Player');
  connectedSockets.set(userId, socket.id);

  console.log(`[Admin Check] tokenIsAdmin=${!!socket.tokenIsAdmin}, userIsAdmin=${userIsAdmin}, emailMatch=${isAdminByEmail}, final=${socket.userIsAdmin}`);

  if (socket.userIsAdmin) {
    socket.join('admins');
    console.log(`[Admins] Socket ${socket.id} (user ${userEmail || userId}) joined admins room`);
  }

  console.log(`[Connection] User ${userEmail} (${userId}) connected`);

  // Apply rate limiting per event
  socket.use((packet, next) => {
    const result = rateLimiter.check(userId);
    if (!result.allowed) {
      socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
    next();
  });

  // Check for reconnection
  const reconnected = gameManager.reconnectPlayer(userId, socket.id);
  if (reconnected) {
    socket.join(reconnected.poolId);
    socket.emit('reconnected', {
      poolId: reconnected.poolId,
      game: sanitizeGameState(reconnected.game, userId)
    });
    io.to(reconnected.poolId).emit('player_reconnected', {
      userId,
      playerName: reconnected.game.players.find(p => p.userId === userId)?.name
    });
  }

  /**
   * Create new pool
   */
  socket.on('create_pool', async (data) => {
    try {
      const validation = validateInput(schemas.createPool, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      if (!socket.userIsAdmin) {
        return socket.emit('error', { message: 'Only admin can create pools' });
      }

      // Check if user already in a game (only count active/connected players)
      const existingGames = gameManager.getAllGames();
      const alreadyInGame = existingGames.some(g => g.players.some(p => p.userId === userId && p.isConnected));
      if (alreadyInGame) {
        return socket.emit('error', { message: 'Already in a game' });
      }

      // Generate pool ID
      const poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get user info (fallback if DB is unavailable)
      let user = null;
      try {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } catch (dbErr) {
        console.error('[DB] Failed to fetch user in create_pool, using fallback:', dbErr.message || dbErr);
      }
      const fallbackName = sanitizeString(user?.name || user?.email || socket.userEmail || 'Player');
      const fallbackPoints = typeof user?.points === 'number' ? user.points : gameManager.INITIAL_POINTS;

      // Create pool
      const game = gameManager.createPool(poolId, userId);
      
      // Auto-join creator
      gameManager.addPlayer(poolId, userId, socket.id, fallbackName, fallbackPoints);

      socket.join(poolId);

      socket.emit('pool_created', {
        poolId,
        game: sanitizeGameState(game, userId)
      });

      emitAdminPools();

      console.log(`[Pool] ${fallbackName} created pool ${poolId}`);

    } catch (error) {
      console.error('[create_pool] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Join existing pool
   */
  socket.on('join_game', async (data) => {
    try {
      const validation = validateInput(schemas.joinGame, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId, userId: requestUserId } = validation.data;

      // Verify userId matches authenticated user
      if (requestUserId !== userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }

      // Get user from database (fallback if DB is unavailable)
      let user = null;
      try {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } catch (dbErr) {
        console.error('[DB] Failed to fetch user in join_game, using fallback:', dbErr.message || dbErr);
      }
      const fallbackName = sanitizeString(user?.name || user?.email || socket.userEmail || 'Player');
      const fallbackPoints = typeof user?.points === 'number' ? user.points : gameManager.INITIAL_POINTS;

      // Check if user already in an active game (exclude finished games and disconnected players)
      const existingGames = gameManager.getAllGames();
      const alreadyInGame = existingGames.some(g => 
        g.phase !== 'finished' && g.players.some(p => p.userId === userId && p.isConnected)
      );
      if (alreadyInGame) {
        return socket.emit('error', { message: 'Already in a game' });
      }

      // Auto-create pool if it doesn't exist (first-join creates the room)
      if (!gameManager.getGame(gameId)) {
        // Create pool with requesting user as owner
        const newGame = gameManager.createPool(gameId, userId);
        console.log(`[Pool] Auto-created pool ${gameId} for user ${userId}`);
        emitAdminPools();
      }

      // Add to pool
      const game = gameManager.addPlayer(
        gameId,
        userId,
        socket.id,
        fallbackName,
        fallbackPoints
      );

      socket.join(gameId);

      socket.emit('joined_game', {
        poolId: gameId,
        game: sanitizeGameState(game, userId)
      });

      emitAdminPools();

      io.to(gameId).emit('player_joined', {
        userId,
        playerName: fallbackName,
        playersCount: game.players.length
      });

      console.log(`[Pool] ${fallbackName} joined pool ${gameId}. Players: ${game.players.length}/6`);

      // Auto-start the game when minimum players reached
      try {
        if (game.players.length >= 2 && game.phase === 'waiting') {
          console.log(`[AutoStart] Pool ${gameId} reached ${game.players.length} players — starting game`);
          gameManager.startGame(gameId);
          emitAdminPools();
        }
      } catch (err) {
        console.error('[AutoStart] Failed to auto-start game:', err);
      }

    } catch (error) {
      console.error('[join_game] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });



  /**
   * Submit answer
   */
  socket.on('submit_answer', async (data) => {
    try {
      const validation = validateInput(schemas.answer, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId, userId: requestUserId, answer } = validation.data;

      // Verify userId matches authenticated user
      if (requestUserId !== userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }

      // Sanitize answer
      const sanitizedAnswer = sanitizeString(answer);

      // Submit answer with AI generation
      await gameManager.submitAnswer(
        gameId,
        userId,
        sanitizedAnswer,
        async (question) => gameManager.getFallbackAIAnswer(question)
      );

      console.log(`[Answer] User ${userId} submitted answer in pool ${gameId}`);

    } catch (error) {
      console.error('[submit_answer] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Place bet
   */
  socket.on('place_bet', async (data) => {
    try {
      const validation = validateInput(schemas.bet, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId, userId: requestUserId, amount, guess } = validation.data;

      // Verify userId matches authenticated user
      if (requestUserId !== userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }

      // Place bet with database update
      await gameManager.placeBet(
        gameId,
        userId,
        amount,
        guess,
        async (userId, newPoints) => {
          await prisma.user.update({
            where: { id: userId },
            data: { points: Math.max(0, newPoints) } // Ensure never negative
          });
        }
      );

      socket.emit('bet_confirmed', { amount, guess });

      console.log(`[Bet] User ${userId} bet ${amount} on ${guess} in pool ${gameId}`);

    } catch (error) {
      console.error('[place_bet] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });



  /**
   * Admin: start game
   */
  socket.on('start_game', async (data) => {
    try {
      if (!socket.userIsAdmin) {
        return socket.emit('error', { message: 'Admin only' });
      }

      const validation = validateInput(schemas.adminGame, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId } = validation.data;
      const game = gameManager.startGame(gameId);
      io.to(gameId).emit('game_started', {
        poolId: gameId,
        phase: game.phase
      });
      emitAdminPools();
    } catch (error) {
      console.error('[start_game] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Admin: pause game timer
   */
  socket.on('pause_game', async (data) => {
    try {
      if (!socket.userIsAdmin) {
        return socket.emit('error', { message: 'Admin only' });
      }

      const validation = validateInput(schemas.adminGame, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId } = validation.data;
      const remaining = gameManager.pauseGame(gameId);
      io.to(gameId).emit('game_paused', { poolId: gameId, timerRemainingMs: remaining });
      emitAdminPools();
    } catch (error) {
      console.error('[pause_game] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Admin: resume game timer
   */
  socket.on('resume_game', async (data) => {
    try {
      if (!socket.userIsAdmin) {
        return socket.emit('error', { message: 'Admin only' });
      }

      const validation = validateInput(schemas.adminGame, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId } = validation.data;
      const remaining = gameManager.resumeGame(gameId);
      io.to(gameId).emit('game_resumed', { poolId: gameId, timerRemainingMs: remaining });
      emitAdminPools();
    } catch (error) {
      console.error('[resume_game] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Admin: add time to timer
   */
  socket.on('add_time', async (data) => {
    try {
      if (!socket.userIsAdmin) {
        return socket.emit('error', { message: 'Admin only' });
      }

      const validation = validateInput(schemas.addTime, data);
      if (!validation.success) {
        return socket.emit('error', { message: validation.error });
      }

      const { gameId, userId: targetUserId, seconds } = validation.data;
      const remaining = gameManager.addTime(gameId, seconds, targetUserId || null);
      io.to(gameId).emit('timer_updated', { poolId: gameId, timerRemainingMs: remaining });
      emitAdminPools();
    } catch (error) {
      console.error('[add_time] Error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Admin: get pool list
   */
  socket.on('admin_get_pools', () => {
    if (!socket.userIsAdmin) return;
    const pools = gameManager.getAllGames().map(buildAdminPoolState);
    socket.emit('admin_pools', { pools });
  });

  /**
   * Admin: get pending join requests
   */
  socket.on('admin_get_join_requests', () => {
    if (!socket.userIsAdmin) return;
    const requests = gameManager.getAllPendingRequests();
    socket.emit('admin_join_requests', { requests });
  });

  /**
   * Get available pools
   */
  socket.on('get_available_pools', () => {
    try {
      const availablePools = gameManager.getAvailablePools();
      socket.emit('available_pools', {
        pools: availablePools.map(g => ({
          poolId: g.poolId,
          playersCount: g.players.length,
          maxPlayers: gameManager.PLAYERS_PER_POOL
        }))
      });
    } catch (error) {
      console.error('[get_available_pools] Error:', error);
      socket.emit('error', { message: 'Failed to fetch pools' });
    }
  });

  /**
   * Disconnect handler
   */
  socket.on('disconnect', () => {
    console.log(`[Disconnect] User ${userEmail} (${userId}) disconnected`);
    connectedSockets.delete(userId);
    gameManager.removePendingRequestsForUser(userId);
    emitAdminJoinRequests();
    emitAdminPools();

    // Find which pool the user was in
    const games = gameManager.getAllGames();
    for (const game of games) {
      const player = game.players.find(p => p.userId === userId);
      if (player) {
        gameManager.removePlayer(game.poolId, userId);
        io.to(game.poolId).emit('player_disconnected', {
          userId,
          playerName: player.name,
          reconnectWindow: 60000
        });
        break;
      }
    }
  });
});

/**
 * Sanitize game state for client (hide sensitive info)
 */
function sanitizeGameState(game, requestingUserId) {
  const timer = getTimerState(game);
  const sanitized = {
    poolId: game.poolId,
    phase: game.phase,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
    paused: !!game.paused,
    timer,
    players: game.players.map(p => ({
      userId: p.userId,
      name: p.name,
      points: p.points,
      isConnected: p.isConnected
    })),
    currentRound: null
  };

  if (game.currentRound) {
    sanitized.currentRound = {
      question: game.currentRound.question,
      answerer: game.currentRound.answerer,
      isAnswerer: game.currentRound.answerer === requestingUserId
    };

    // Only show answers during betting/revealing
    if (game.phase === 'betting' || game.phase === 'revealing') {
      sanitized.currentRound.answerA = game.currentRound.answerA;
      sanitized.currentRound.answerB = game.currentRound.answerB;
    }

    // Only show correct answer during revealing
    if (game.phase === 'revealing') {
      sanitized.currentRound.correctChoice = game.currentRound.correctChoice;
      sanitized.currentRound.humanAnswer = game.currentRound.humanAnswer;
      sanitized.currentRound.aiAnswer = game.currentRound.aiAnswer;
    }

    // Show user's own bet
    if (game.bets[requestingUserId]) {
      sanitized.currentRound.myBet = game.bets[requestingUserId];
    }
  }

  return sanitized;
}

/**
 * Persist game results to database
 */
async function persistGameResults(poolId, game) {
  try {
    // Update all player points
    for (const player of game.players) {
      await prisma.user.update({
        where: { id: player.userId },
        data: {
          points: Math.max(0, player.points),
          gamesPlayed: { increment: 1 },
          ...(player.rank === 1 && { wins: { increment: 1 } })
        }
      });
    }

    console.log(`[Database] Persisted game results for pool ${poolId}`);
  } catch (error) {
    console.error('[Database] Failed to persist game results:', error);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  
  // Notify all connected clients
  io.emit('server_shutdown', { message: 'Server is restarting. Reconnect in 10 seconds.' });
  
  // Close server
  io.close(() => {
    console.log('[Server] Socket.io server closed');
  });
  
  // Close database
  await prisma.$disconnect();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down');
  await prisma.$disconnect();
  process.exit(0);
});

console.log('[Server] Socket.io server ready');

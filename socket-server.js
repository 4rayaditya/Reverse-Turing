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

// Initialize services
const prisma = new PrismaClient();
const gameManager = new GameStateManager();
const rateLimiter = new RateLimiter(100, 10000); // 100 requests per 10 seconds

// Validate environment
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[Server] NEXTAUTH_SECRET not set. Exiting.');
  process.exit(1);
}


// Create Socket.io server with security
const io = new Server(process.env.PORT || 3003, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

console.log(`[Server] Socket.io server starting on port ${process.env.PORT || 3003}`);
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
    phase: game.phase
  });
});

gameManager.on('answer_submitted', ({ poolId, game }) => {
  io.to(poolId).emit('answer_submitted', {
    answerA: game.currentRound.answerA,
    answerB: game.currentRound.answerB,
    phase: game.phase
  });
});

gameManager.on('bet_placed', ({ poolId, game }) => {
  // Don't reveal who bet what, just update status
  io.to(poolId).emit('bet_placed', {
    betsCount: Object.keys(game.bets).length,
    phase: game.phase
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
});

// Socket connection handler
io.on("connection", async (socket) => {
  const userId = socket.userId;
  const userEmail = socket.userEmail;

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

      // Check if user already in a game
      const existingGames = gameManager.getAllGames();
      const alreadyInGame = existingGames.some(g => g.players.some(p => p.userId === userId));
      if (alreadyInGame) {
        return socket.emit('error', { message: 'Already in a game' });
      }

      // Generate pool ID
      const poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get user info
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Create pool
      const game = gameManager.createPool(poolId);
      
      // Auto-join creator
      gameManager.addPlayer(poolId, userId, socket.id, sanitizeString(user.name || user.email), user.points);

      socket.join(poolId);

      socket.emit('pool_created', {
        poolId,
        game: sanitizeGameState(game, userId)
      });

      console.log(`[Pool] ${user.name} created pool ${poolId}`);

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

      // Get user from database
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Check if user already in a game
      const existingGames = gameManager.getAllGames();
      const alreadyInGame = existingGames.some(g => g.players.some(p => p.userId === userId));
      if (alreadyInGame) {
        return socket.emit('error', { message: 'Already in a game' });
      }

      // Create pool if it doesn't exist (allows custom pool IDs like "test1")
      if (!gameManager.getGame(gameId)) {
        gameManager.createPool(gameId);
      }

      // Add to pool
      const game = gameManager.addPlayer(
        gameId,
        userId,
        socket.id,
        sanitizeString(user.name || user.email),
        user.points
      );

      socket.join(gameId);

      socket.emit('joined_game', {
        poolId: gameId,
        game: sanitizeGameState(game, userId)
      });

      io.to(gameId).emit('player_joined', {
        userId,
        playerName: sanitizeString(user.name || user.email),
        playersCount: game.players.length
      });

      console.log(`[Pool] ${user.name} joined pool ${gameId}. Players: ${game.players.length}/6`);

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
  const sanitized = {
    poolId: game.poolId,
    phase: game.phase,
    roundNumber: game.roundNumber,
    totalRounds: game.totalRounds,
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

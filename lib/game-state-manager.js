// lib/game-state-manager.js
/**
 * Production-safe in-memory game state manager
 * Handles 2 pools of 6 players each (12 players max)
 */

const { EventEmitter } = require('events');

class GameStateManager extends EventEmitter {
  constructor() {
    super();
    this.games = new Map(); // poolId -> game state
    this.playerSockets = new Map(); // userId -> socketId
    this.locks = new Map(); // poolId -> lock state
    this.disconnectedPlayers = new Map(); // userId -> {poolId, disconnectTime, state}
    
    // Constants
    this.MAX_POOLS = 2;
    this.PLAYERS_PER_POOL = 6;
    this.INITIAL_POINTS = 1000;
    this.ANSWER_TIMEOUT = 60000; // 60 seconds
    this.BETTING_TIMEOUT = 30000; // 30 seconds
    this.RECONNECT_WINDOW = 60000; // 60 seconds
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new game pool
   */
  createPool(poolId) {
    if (this.games.has(poolId)) {
      throw new Error('Pool already exists');
    }
    
    if (this.games.size >= this.MAX_POOLS) {
      throw new Error('Maximum pools reached');
    }

    const game = {
      poolId,
      players: [],
      phase: 'waiting', // waiting, answering, betting, revealing, finished
      currentRound: null,
      roundNumber: 0,
      totalRounds: this.PLAYERS_PER_POOL,
      answeredPlayerIds: [],
      bets: {},
      startedAt: null,
      finishedAt: null,
      timer: null
    };

    this.games.set(poolId, game);
    this.locks.set(poolId, false);
    
    console.log(`[GameState] Pool ${poolId} created`);
    return game;
  }

  /**
   * Add player to pool with validation
   */
  addPlayer(poolId, userId, socketId, userName, userPoints) {
    const game = this.games.get(poolId);
    if (!game) {
      throw new Error('Pool not found');
    }

    // Check if player already in game
    if (game.players.some(p => p.userId === userId)) {
      console.log(`[GameState] Player ${userId} already in pool ${poolId}`);
      return game;
    }

    // Check pool capacity
    if (game.players.length >= this.PLAYERS_PER_POOL) {
      throw new Error('Pool is full');
    }

    // Check if game already started
    if (game.phase !== 'waiting' && game.phase !== 'answering') {
      throw new Error('Game already in progress');
    }

    // Add player
    game.players.push({
      userId,
      socketId,
      name: userName,
      points: userPoints,
      isConnected: true,
      joinedAt: Date.now()
    });

    this.playerSockets.set(userId, socketId);
    
    console.log(`[GameState] Player ${userName} (${userId}) joined pool ${poolId}. Players: ${game.players.length}/${this.PLAYERS_PER_POOL}`);

    // Auto-start if we have enough players
    if (game.players.length >= 2 && game.phase === 'waiting') {
      console.log(`[GameState] Auto-starting pool ${poolId}`);
      this.startGame(poolId);
    }

    return game;
  }

  /**
   * Remove player from pool
   */
  removePlayer(poolId, userId) {
    const game = this.games.get(poolId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    
    // Mark as disconnected instead of removing immediately
    player.isConnected = false;
    
    // Store for potential reconnection
    this.disconnectedPlayers.set(userId, {
      poolId,
      disconnectTime: Date.now(),
      state: { ...player }
    });

    this.playerSockets.delete(userId);
    
    console.log(`[GameState] Player ${player.name} disconnected from pool ${poolId}. Reconnection window: 60s`);

    // If all players disconnected, end game
    const connectedPlayers = game.players.filter(p => p.isConnected);
    if (connectedPlayers.length === 0) {
      console.log(`[GameState] All players disconnected. Ending pool ${poolId}`);
      this.endGame(poolId);
    }
  }

  /**
   * Reconnect player to pool
   */
  reconnectPlayer(userId, socketId) {
    const disconnectedData = this.disconnectedPlayers.get(userId);
    if (!disconnectedData) {
      return null;
    }

    const { poolId, disconnectTime } = disconnectedData;
    const timeSinceDisconnect = Date.now() - disconnectTime;

    // Check if within reconnection window
    if (timeSinceDisconnect > this.RECONNECT_WINDOW) {
      this.disconnectedPlayers.delete(userId);
      return null;
    }

    const game = this.games.get(poolId);
    if (!game) {
      this.disconnectedPlayers.delete(userId);
      return null;
    }

    // Reconnect player
    const player = game.players.find(p => p.userId === userId);
    if (player) {
      player.isConnected = true;
      player.socketId = socketId;
      this.playerSockets.set(userId, socketId);
      this.disconnectedPlayers.delete(userId);
      
      console.log(`[GameState] Player ${player.name} reconnected to pool ${poolId}`);
      return { poolId, game };
    }

    return null;
  }

  /**
   * Start game with first round
   */
  startGame(poolId) {
    const game = this.games.get(poolId);
    if (!game) throw new Error('Pool not found');

    if (game.phase !== 'waiting') {
      throw new Error('Game already started');
    }

    game.startedAt = Date.now();
    game.totalRounds = game.players.length;
    
    this.startNewRound(poolId);
    
    console.log(`[GameState] Game started in pool ${poolId} with ${game.players.length} players`);
    return game;
  }

  /**
   * Start a new round
   */
  startNewRound(poolId) {
    const game = this.games.get(poolId);
    if (!game) return;

    // Check if all players have answered
    if (game.answeredPlayerIds.length >= game.totalRounds) {
      this.endGame(poolId);
      return;
    }

    // Select next answerer
    const answererId = this.selectNextAnswerer(poolId);
    if (!answererId) {
      this.endGame(poolId);
      return;
    }

    game.roundNumber++;
    game.currentRound = {
      question: this.getRandomQuestion(),
      answerer: answererId,
      answer: null,
      humanAnswer: null,
      aiAnswer: null,
      answerA: null,
      answerB: null,
      correctChoice: null,
      startTime: Date.now()
    };
    game.phase = 'answering';
    game.bets = {};

    // Clear any existing timer
    if (game.timer) {
      clearTimeout(game.timer);
    }

    // Set answer timeout
    game.timer = setTimeout(() => {
      this.handleAnswerTimeout(poolId);
    }, this.ANSWER_TIMEOUT);

    console.log(`[GameState] Round ${game.roundNumber} started in pool ${poolId}. Answerer: ${answererId}`);
    
    this.emit('round_started', { poolId, game });
  }

  /**
   * Select next player who hasn't answered yet
   */
  selectNextAnswerer(poolId) {
    const game = this.games.get(poolId);
    if (!game) return null;

    const connectedPlayers = game.players.filter(p => p.isConnected);
    const nextPlayer = connectedPlayers.find(p => !game.answeredPlayerIds.includes(p.userId));
    
    return nextPlayer ? nextPlayer.userId : null;
  }

  /**
   * Handle answer submission with lock to prevent race conditions
   */
  async submitAnswer(poolId, userId, answer, aiGeneratorFn) {
    // Acquire lock
    if (this.locks.get(poolId)) {
      throw new Error('Another operation in progress');
    }
    this.locks.set(poolId, true);

    try {
      const game = this.games.get(poolId);
      if (!game) throw new Error('Pool not found');
      if (game.phase !== 'answering') throw new Error('Not in answering phase');
      if (game.currentRound?.answerer !== userId) throw new Error('Not your turn');
      if (game.currentRound?.answer !== null) throw new Error('Answer already submitted');

      // Clear answer timer
      if (game.timer) {
        clearTimeout(game.timer);
        game.timer = null;
      }

      // Validate answer length
      if (!answer || answer.length < 5 || answer.length > 500) {
        throw new Error('Answer must be 5-500 characters');
      }

      // Mark player as answered
      if (!game.answeredPlayerIds.includes(userId)) {
        game.answeredPlayerIds.push(userId);
      }

      // Store human answer
      game.currentRound.answer = answer;
      game.currentRound.humanAnswer = answer;

      // Generate AI answer with timeout
      let aiAnswer;
      try {
        aiAnswer = await Promise.race([
          aiGeneratorFn(game.currentRound.question, [answer]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 8000))
        ]);
      } catch (error) {
        console.error(`[GameState] AI generation failed, using fallback:`, error.message);
        aiAnswer = this.getFallbackAIAnswer(game.currentRound.question);
      }

      game.currentRound.aiAnswer = aiAnswer;

      // Randomly assign positions
      const humanIsA = Math.random() > 0.5;
      game.currentRound.answerA = humanIsA ? answer : aiAnswer;
      game.currentRound.answerB = humanIsA ? aiAnswer : answer;
      game.currentRound.correctChoice = humanIsA ? 'A' : 'B';

      // Move to betting phase
      game.phase = 'betting';

      // Set betting timeout
      game.timer = setTimeout(() => {
        this.handleBettingTimeout(poolId);
      }, this.BETTING_TIMEOUT);

      console.log(`[GameState] Answer submitted in pool ${poolId}. Moving to betting phase.`);
      
      this.emit('answer_submitted', { poolId, game });
      
      return game;
    } finally {
      // Release lock
      this.locks.set(poolId, false);
    }
  }

  /**
   * Handle bet placement with validation
   */
  async placeBet(poolId, userId, amount, guess, updatePointsFn) {
    // Acquire lock
    if (this.locks.get(poolId)) {
      throw new Error('Another operation in progress');
    }
    this.locks.set(poolId, true);

    try {
      const game = this.games.get(poolId);
      if (!game) throw new Error('Pool not found');
      if (game.phase !== 'betting') throw new Error('Not in betting phase');
      if (userId === game.currentRound?.answerer) throw new Error('Answerer cannot bet');
      if (game.bets[userId]) throw new Error('Bet already placed');

      const player = game.players.find(p => p.userId === userId);
      if (!player) throw new Error('Player not found');

      // Validate bet amount
      if (amount <= 0) throw new Error('Bet amount must be positive');
      if (amount > player.points) throw new Error('Insufficient points');

      // Validate guess
      if (guess !== 'A' && guess !== 'B') throw new Error('Invalid guess');

      // Deduct points
      player.points -= amount;
      
      // Update in database
      await updatePointsFn(userId, player.points);

      // Store bet
      game.bets[userId] = { amount, guess, placed: Date.now() };

      console.log(`[GameState] Bet placed in pool ${poolId}: ${player.name} bet ${amount} on ${guess}`);

      // Check if all players have bet
      const bettingPlayers = game.players.filter(p => p.userId !== game.currentRound.answerer && p.isConnected);
      const betsPlaced = Object.keys(game.bets).length;

      if (betsPlaced >= bettingPlayers.length) {
        console.log(`[GameState] All players bet. Revealing results.`);
        if (game.timer) {
          clearTimeout(game.timer);
          game.timer = null;
        }
        await this.revealRound(poolId, updatePointsFn);
      }

      this.emit('bet_placed', { poolId, game });
      
      return game;
    } finally {
      // Release lock
      this.locks.set(poolId, false);
    }
  }

  /**
   * Reveal round results and update points
   */
  async revealRound(poolId, updatePointsFn) {
    const game = this.games.get(poolId);
    if (!game || !game.currentRound) return;

    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }

    game.phase = 'revealing';

    const correctChoice = game.currentRound.correctChoice;
    const winners = [];

    // Process bets and award points
    for (const [userId, bet] of Object.entries(game.bets)) {
      const player = game.players.find(p => p.userId === userId);
      if (!player) continue;

      if (bet.guess === correctChoice) {
        // Winner - award 2x bet
        const winnings = bet.amount * 2;
        player.points += winnings;
        winners.push({ userId, name: player.name, won: winnings });
        
        // Update in database
        await updatePointsFn(userId, player.points);
      }
    }

    console.log(`[GameState] Round ${game.roundNumber} revealed in pool ${poolId}. Winners: ${winners.length}`);

    this.emit('round_revealed', { poolId, game, winners });

    // Wait 5 seconds then start next round
    setTimeout(() => {
      this.startNewRound(poolId);
    }, 5000);
  }

  /**
   * Handle answer timeout
   */
  async handleAnswerTimeout(poolId) {
    const game = this.games.get(poolId);
    if (!game || game.phase !== 'answering') return;

    console.log(`[GameState] Answer timeout in pool ${poolId}. Auto-submitting fallback.`);

    const answererId = game.currentRound.answerer;
    const fallbackAnswer = '[No answer - Time expired]';

    // Mark as answered
    if (!game.answeredPlayerIds.includes(answererId)) {
      game.answeredPlayerIds.push(answererId);
    }

    game.currentRound.answer = fallbackAnswer;
    game.currentRound.humanAnswer = fallbackAnswer;
    game.currentRound.aiAnswer = this.getFallbackAIAnswer(game.currentRound.question);

    const humanIsA = Math.random() > 0.5;
    game.currentRound.answerA = humanIsA ? fallbackAnswer : game.currentRound.aiAnswer;
    game.currentRound.answerB = humanIsA ? game.currentRound.aiAnswer : fallbackAnswer;
    game.currentRound.correctChoice = humanIsA ? 'A' : 'B';

    game.phase = 'betting';

    game.timer = setTimeout(() => {
      this.handleBettingTimeout(poolId);
    }, this.BETTING_TIMEOUT);

    this.emit('answer_submitted', { poolId, game });
  }

  /**
   * Handle betting timeout
   */
  async handleBettingTimeout(poolId) {
    const game = this.games.get(poolId);
    if (!game || game.phase !== 'betting') return;

    console.log(`[GameState] Betting timeout in pool ${poolId}. Revealing results.`);
    
    await this.revealRound(poolId, async (userId, points) => {
      // Empty update function for timeout - points already deducted
    });
  }

  /**
   * End game and calculate final rankings
   */
  endGame(poolId) {
    const game = this.games.get(poolId);
    if (!game) return;

    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }

    game.phase = 'finished';
    game.finishedAt = Date.now();

    // Sort players by points
    game.players.sort((a, b) => b.points - a.points);
    
    // Assign ranks
    game.players.forEach((player, index) => {
      player.rank = index + 1;
    });

    console.log(`[GameState] Game finished in pool ${poolId}`);
    console.log(`[GameState] Final rankings:`, game.players.map(p => `${p.rank}. ${p.name} - ${p.points} pts`));

    this.emit('game_finished', { poolId, game });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.games.delete(poolId);
      this.locks.delete(poolId);
      console.log(`[GameState] Pool ${poolId} cleaned up`);
    }, 300000);
  }

  /**
   * Get random question
   */
  getRandomQuestion() {
    const questions = [
      "Write a haiku about artificial intelligence.",
      "Describe your perfect day in 3 sentences.",
      "If you could have dinner with anyone, who and why?",
      "What's the most important lesson you've learned?",
      "Describe your hometown without naming it.",
      "What's your unpopular opinion?",
      "If you won the lottery tomorrow, what would you do?",
      "What's a skill you wish you had?",
      "Describe your ideal weekend.",
      "What's the last book or movie that made you think?",
      "If you could time travel, where would you go?",
      "What's something you're proud of but rarely talk about?"
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Get fallback AI answer
   */
  getFallbackAIAnswer(question) {
    const templates = [
      "I think that's an interesting question. I'd say it really depends on the context and personal perspective.",
      "Hmm, I've thought about this before. In my opinion, there's no one right answer, but I lean towards a balanced approach.",
      "That's tough to answer briefly. I guess if I had to choose, I'd focus on what brings the most value.",
      "Honestly, I'm not entirely sure. Maybe something practical that also allows for some creativity?",
      "Good question! I suppose it would involve a mix of personal growth and meaningful experiences."
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      // Clean up old disconnected players
      const now = Date.now();
      for (const [userId, data] of this.disconnectedPlayers.entries()) {
        if (now - data.disconnectTime > this.RECONNECT_WINDOW) {
          this.disconnectedPlayers.delete(userId);
          console.log(`[GameState] Cleaned up disconnected player ${userId}`);
        }
      }
    }, 30000); // Run every 30 seconds
  }

  /**
   * Get game state
   */
  getGame(poolId) {
    return this.games.get(poolId);
  }

  /**
   * Get all games
   */
  getAllGames() {
    return Array.from(this.games.values());
  }

  /**
   * Get available pools
   */
  getAvailablePools() {
    return Array.from(this.games.values())
      .filter(g => g.phase === 'waiting' && g.players.length < this.PLAYERS_PER_POOL);
  }
}

module.exports = { GameStateManager };

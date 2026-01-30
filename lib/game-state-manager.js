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
    this.playerSockets = new Map(); // userId -> socketId (single mapping)
    this.locks = new Map(); // poolId -> lock state
    this.disconnectedPlayers = new Map(); // userId -> {poolId, disconnectTime, state}
    this.pendingJoinRequests = new Map(); // poolId -> [{ userId, name, socketId, requestedAt }]

    // Constants
    this.MAX_POOLS = 5;
    this.PLAYERS_PER_POOL = 6;
    this.INITIAL_POINTS = 1000;
    this.ANSWER_TIMEOUT = 60000; // 60 seconds
    this.BETTING_TIMEOUT = 30000; // 30 seconds
    this.RECONNECT_WINDOW = 60000; // 60 seconds

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Add a pending join request
   */
  requestJoin(poolId, { userId, name, socketId }) {
    const game = this.games.get(poolId);
    if (!game) {
      throw new Error('Pool not found');
    }

    if (game.players.some(p => p.userId === userId)) {
      throw new Error('Already in pool');
    }

    const pending = this.pendingJoinRequests.get(poolId) || [];
    if (pending.some(r => r.userId === userId)) {
      return pending;
    }

    const request = { userId, name, socketId, requestedAt: Date.now() };
    pending.push(request);
    this.pendingJoinRequests.set(poolId, pending);
    game.pendingJoinRequests = pending;

    return request;
  }

  /**
   * Approve a pending join request
   */
  approveJoin(poolId, userId) {
    const pending = this.pendingJoinRequests.get(poolId) || [];
    const index = pending.findIndex(r => r.userId === userId);
    if (index === -1) {
      throw new Error('Join request not found');
    }
    const [request] = pending.splice(index, 1);
    this.pendingJoinRequests.set(poolId, pending);

    const game = this.games.get(poolId);
    if (game) {
      game.pendingJoinRequests = pending;
    }

    return request;
  }

  /**
   * Deny a pending join request
   */
  denyJoin(poolId, userId) {
    const pending = this.pendingJoinRequests.get(poolId) || [];
    const index = pending.findIndex(r => r.userId === userId);
    if (index === -1) {
      throw new Error('Join request not found');
    }
    const [request] = pending.splice(index, 1);
    this.pendingJoinRequests.set(poolId, pending);

    const game = this.games.get(poolId);
    if (game) {
      game.pendingJoinRequests = pending;
    }

    return request;
  }

  getPendingRequests(poolId) {
    return this.pendingJoinRequests.get(poolId) || [];
  }

  getAllPendingRequests() {
    const all = [];
    for (const [poolId, requests] of this.pendingJoinRequests.entries()) {
      requests.forEach(r => all.push({ poolId, ...r }));
    }
    return all;
  }

  removePendingRequestsForUser(userId) {
    for (const [poolId, requests] of this.pendingJoinRequests.entries()) {
      const filtered = requests.filter(r => r.userId !== userId);
      if (filtered.length !== requests.length) {
        this.pendingJoinRequests.set(poolId, filtered);
        const game = this.games.get(poolId);
        if (game) {
          game.pendingJoinRequests = filtered;
        }
      }
    }
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

    console.log(`[GameState] Player ${player.name} disconnected from pool ${poolId}. Reconnection window: ${this.RECONNECT_WINDOW / 1000}s`);

    // If all players disconnected, end game
    const connectedPlayers = game.players.filter(p => p.isConnected);
    if (connectedPlayers.length === 0) {
      console.log(`[GameState] All players disconnected. Ending pool ${poolId}`);
      this.endGame(poolId);
    }
    game.timerPaused = true;
    return game.timerRemainingMs || 0;
  }

  /**
   * Attempt to reconnect a previously disconnected player.
   * Returns { poolId, game } on success, or null if not found/expired.
   */
  reconnectPlayer(userId, socketId) {
    const data = this.disconnectedPlayers.get(userId);
    if (!data) return null;

    const { poolId, disconnectTime, state } = data;
    const game = this.games.get(poolId);
    if (!game) {
      // Pool cleaned up
      this.disconnectedPlayers.delete(userId);
      return null;
    }

    // Check reconnect window
    if (Date.now() - disconnectTime > this.RECONNECT_WINDOW) {
      this.disconnectedPlayers.delete(userId);
      return null;
    }

    // Restore player state in game.players
    let player = game.players.find(p => p.userId === userId);
    if (player) {
      Object.assign(player, state);
      player.isConnected = true;
      player.socketId = socketId;
    } else {
      player = { ...state, isConnected: true, socketId };
      game.players.push(player);
    }

    // Update socket mapping (single mapping - replace existing)
    this.playerSockets.set(userId, socketId);

    // Remove from disconnected map
    this.disconnectedPlayers.delete(userId);

    console.log(`[GameState] Player ${player.name} reconnected to pool ${poolId}`);

    return { poolId, game };
  }

  /**
   * Resume paused timer
   */
  resumeGame(poolId) {
    const game = this.games.get(poolId);
    if (!game) throw new Error('Pool not found');

    if (!game.timerPaused || !game.timerKind) {
      game.paused = false;
      return 0;
    }

    const remaining = Math.max(0, game.timerRemainingMs || 0);
    game.timerPaused = false;
    game.paused = false;

    if (remaining > 0) {
      this.scheduleTimer(poolId, game.timerKind, remaining);
    }

    return remaining;
  }

  /**
   * Add time to current timer (seconds)
   */
  addTime(poolId, seconds, targetUserId = null) {
    const game = this.games.get(poolId);
    if (!game) throw new Error('Pool not found');
    if (!game.timerKind) throw new Error('No active timer');

    if (game.phase === 'answering' && targetUserId && game.currentRound?.answerer !== targetUserId) {
      throw new Error('Only the current answerer can receive time in answering phase');
    }

    const addMs = Math.max(0, seconds * 1000);
    const remaining = game.timerPaused
      ? Math.max(0, (game.timerRemainingMs || 0) + addMs)
      : Math.max(0, (game.timerEndsAt || Date.now()) - Date.now() + addMs);

    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }

    if (game.timerPaused) {
      game.timerRemainingMs = remaining;
      return remaining;
    }

    this.scheduleTimer(poolId, game.timerKind, remaining);
    return remaining;
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

    game.paused = false;

    // Clear any existing timer
    if (game.timer) {
      clearTimeout(game.timer);
    }

    // Set answer timeout
    this.scheduleTimer(poolId, 'answering', this.ANSWER_TIMEOUT);

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
      if (game.paused) throw new Error('Game is paused');
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

      // Randomly assign positions - TRUE 50/50 chance
      const humanIsA = Math.random() >= 0.5;
      game.currentRound.answerA = humanIsA ? answer : aiAnswer;
      game.currentRound.answerB = humanIsA ? aiAnswer : answer;
      game.currentRound.correctChoice = humanIsA ? 'A' : 'B';
      
      console.log(`[GameState] Answers randomized: Human=${humanIsA ? 'A' : 'B'}, AI=${humanIsA ? 'B' : 'A'}`);

      // Move to betting phase
      game.phase = 'betting';

      // Set betting timeout
      this.scheduleTimer(poolId, 'betting', this.BETTING_TIMEOUT);

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
      if (game.paused) throw new Error('Game is paused');
      if (game.phase !== 'betting') throw new Error('Not in betting phase');
      if (userId === game.currentRound?.answerer) throw new Error('Answerer cannot bet');
      if (game.bets[userId]) throw new Error('Bet already placed');

      const player = game.players.find(p => p.userId === userId);
      if (!player) throw new Error('Player not found');

      // Validate bet amount
      if (amount <= 0) {
        console.error(`[GameState] Invalid bet amount: ${amount}`);
        throw new Error('Bet amount must be positive');
      }
      if (amount > player.points) {
        console.error(`[GameState] Insufficient points: ${amount} > ${player.points}`);
        throw new Error('Insufficient points');
      }

      // Validate guess
      if (guess !== 'A' && guess !== 'B') {
        console.error(`[GameState] Invalid guess: ${guess}`);
        throw new Error('Invalid guess');
      }
      
      console.log(`[GameState] Bet validation passed: ${player.name} betting ${amount} on ${guess}`);

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

    this.clearTimer(game);

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

    const humanIsA = Math.random() >= 0.5;
    game.currentRound.answerA = humanIsA ? fallbackAnswer : game.currentRound.aiAnswer;
    game.currentRound.answerB = humanIsA ? game.currentRound.aiAnswer : fallbackAnswer;
    game.currentRound.correctChoice = humanIsA ? 'A' : 'B';
    
    console.log(`[GameState] Timeout answers: Human=${humanIsA ? 'A' : 'B'}, AI=${humanIsA ? 'B' : 'A'}`);

    game.phase = 'betting';

    this.scheduleTimer(poolId, 'betting', this.BETTING_TIMEOUT);

    this.emit('answer_submitted', { poolId, game });
  }

  /**
   * Handle betting timeout
   */
  async handleBettingTimeout(poolId) {
    const game = this.games.get(poolId);
    if (!game || game.phase !== 'betting') return;

    console.log(`[GameState] Betting timeout in pool ${poolId}. Auto-betting for non-bettors.`);

    // Auto-bet 'B' for players who didn't bet (B is often human in the randomization)
    const bettingPlayers = game.players.filter(p => p.userId !== game.currentRound.answerer && p.isConnected);
    for (const player of bettingPlayers) {
      if (!game.bets[player.userId]) {
        // Auto-bet minimum amount (100) on 'B'
        const autoBetAmount = Math.min(100, player.points);
        if (autoBetAmount > 0) {
          player.points -= autoBetAmount;
          game.bets[player.userId] = { 
            amount: autoBetAmount, 
            guess: 'B',  // Auto-select B (schema requires 'A' or 'B')
            placed: Date.now(),
            auto: true 
          };
          console.log(`[GameState] Auto-bet for ${player.name}: ${autoBetAmount} on B`);
        }
      }
    }

    await this.revealRound(poolId, async (userId, points) => {
      // Empty update function for timeout - points already deducted
    });
  }

  /**
   * Reset/clear pool (admin function)
   */
  resetPool(poolId) {
    const game = this.games.get(poolId);
    if (!game) throw new Error('Pool not found');

    this.clearTimer(game);

    // Store owner for new game
    const ownerId = game.ownerId;

    // Clear all player data
    for (const player of game.players) {
      if (this.playerSockets.has(player.userId)) {
        this.playerSockets.delete(player.userId);
      }
      if (this.disconnectedPlayers.has(player.userId)) {
        this.disconnectedPlayers.delete(player.userId);
      }
    }

    // Clear pending requests
    this.pendingJoinRequests.delete(poolId);

    // Reset game state
    const resetGame = {
      poolId,
      ownerId,
      players: [],
      phase: 'waiting',
      currentRound: null,
      roundNumber: 0,
      totalRounds: this.PLAYERS_PER_POOL,
      answeredPlayerIds: [],
      bets: {},
      pendingJoinRequests: [],
      startedAt: null,
      finishedAt: null,
      timer: null,
      timerKind: null,
      timerEndsAt: null,
      timerRemainingMs: null,
      timerPaused: false,
      paused: false
    };

    this.games.set(poolId, resetGame);

    console.log(`[GameState] Pool ${poolId} reset to waiting state`);
    return resetGame;
  }

  /**
   * End game and calculate final rankings
   */
  endGame(poolId) {
    const game = this.games.get(poolId);
    if (!game) return;

    this.clearTimer(game);

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

    // Mark all players as disconnected so they can join new pools immediately
    for (const player of game.players) {
      player.isConnected = false;
      // remove socket mapping so re-join checks don't treat them as connected
      if (this.playerSockets.has(player.userId)) {
        this.playerSockets.delete(player.userId);
      }
      // store in disconnectedPlayers so reconnection window still works
      this.disconnectedPlayers.set(player.userId, {
        poolId,
        disconnectTime: Date.now(),
        state: { ...player }
      });
    }

    this.emit('game_finished', { poolId, game });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.games.delete(poolId);
      this.locks.delete(poolId);
      console.log(`[GameState] Pool ${poolId} cleaned up`);
    }, 300000);
  }

  /**
   * Get random question that hasn't been used yet
   */
  getRandomQuestion(game) {
    // Ordered pool of 6 questions (no randomization)
    const questions = [
      "If you could time travel, where would you go?",
      "What is your biggest fear?",
      "What's your most embarrassing college moment?",
      "What would you do with a million dollars?",
      "Describe your ideal weekend",
      "What's the worst advice you've ever received?"
    ];

    if (!game) {
      // Fallback: return first question
      return questions[0];
    }

    // Ensure index exists
    if (typeof game.nextQuestionIndex !== 'number') game.nextQuestionIndex = 0;

    const idx = game.nextQuestionIndex % questions.length;
    const selected = questions[idx];

    // Advance index for next round
    game.nextQuestionIndex = (idx + 1) % questions.length;

    console.log(`[GameState] Ordered question selected for pool ${game.poolId}: index=${idx} question="${selected}"`);

    return selected;
  }

  /**
   * Get fallback AI answer - designed to sound extremely human-like
   */
  getFallbackAIAnswer(question) {
    const lowerQ = (question || '').toLowerCase();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Natural 1-2 sentence fallback answers (calm, clear, sometimes light Hinglish)
    if (lowerQ.includes('time travel')) {
      return pick([
        "I'd visit the 1960s for the music and culture — it must have been an amazing vibe to experience in person.",
        "I'd go a few decades into the future to see how everyday life and tech have changed.",
        "I'd go back to a simpler summer from my childhood and relive that calm for a bit.",
        "Seeing Renaissance art and architecture up close would be unforgettable."
      ]);
    }

    if (lowerQ.includes('fear')) {
      return pick([
        "Losing my memory or not being able to take care of myself — that thought scares me the most.",
        "Failing at something important in public is a big fear; it's embarrassing and heavy.",
        "Running out of money and options is something I worry about sometimes.",
        "Growing old alone without close people around is something that unsettles me."
      ]);
    }

    if (lowerQ.includes('keeps you up')) {
      return pick([
        "Money and future plans — small doubts build up and keep me awake sometimes.",
        "Random embarrassing moments that replay in my head at night.",
        "Thinking whether I'm on the right path career-wise or wasting time.",
        "Little practical worries, like how I'll manage a big unexpected expense."
      ]);
    }

    if (lowerQ.includes('embarrass')) {
      return pick([
        "I once fell asleep in a lecture and woke up mid-snore; I still cringe about it sometimes.",
        "Sent a message meant for one person to a group chat — instant regret and a lesson learned.",
        "Tripped in front of a crowd and had to laugh it off; it felt awful then, but it's a story now.",
        "Called a teacher 'mom' by accident in school — classic embarrassing moment."
      ]);
    }

    if (lowerQ.includes('million')) {
      return pick([
        "I'd pay off debts and support my family first, then invest the rest for stability.",
        "Travel a bit to reset, put most into safe long-term investments, and keep some for experiences.",
        "Buy a modest place for security, save and invest, and spend a little on meaningful trips.",
        "Give a portion to my parents, set aside an emergency fund, and invest the remainder."
      ]);
    }

    if (lowerQ.includes('weekend')) {
      return pick([
        "Sleep in, meet friends for brunch, and spend the afternoon relaxing — my ideal weekend.",
        "A morning hike, good coffee, and a lazy afternoon with a movie feels perfect.",
        "Just hanging out with close friends and good food, nothing too planned.",
        "A short road trip with music, snacks, and no strict schedule."
      ]);
    }

    if (lowerQ.includes('advice')) {
      return pick([
        "'Follow your passion' sounds good, but practical planning and small steps matter too.",
        "'Fake it till you make it' can work short-term, but don't burn out — be honest with yourself.",
        "Advice is personal; what helps one person might not help another, so choose carefully.",
        "Sometimes stepping back and re-evaluating is the best move you can make."
      ]);
    }

    if (lowerQ.includes('unpopular opinion')) {
      return pick([
        "I think some very hyped shows are overrated — tastes vary a lot.",
        "It's okay to disconnect from social media sometimes; constant noise isn't healthy for everyone.",
        "I sometimes prefer small, quiet plans over big group outings.",
        "Pineapple on pizza is fine by me — not a hill to die on."
      ]);
    }

    if (lowerQ.includes('comfort') && (lowerQ.includes('movie') || lowerQ.includes('show'))) {
      return pick([
        "A familiar, gentle show like a light comedy or a Studio Ghibli film — something comforting and warm.",
        "A slow, cozy movie that doesn't demand too much attention and feels reassuring.",
        "An easy sitcom I can rewatch for comfort and laughs.",
        "Something soft and familiar that helps me unwind."
      ]);
    }

    // Generic fallback
    return pick([
      "That's a thoughtful question — I'd probably choose something simple and relaxing.",
      "I'm not sure right now; I'd go with whatever feels right later.",
      "Depends on the moment, but usually something calm and practical."
    ]);
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

  /**
   * Clear timer helpers
   */
  clearTimer(game) {
    if (game?.timer) {
      clearTimeout(game.timer);
    }
    if (game) {
      game.timer = null;
      game.timerKind = null;
      game.timerEndsAt = null;
      game.timerRemainingMs = null;
      game.timerPaused = false;
    }
  }

  /**
   * Schedule a timer with kind and remaining duration
   */
  scheduleTimer(poolId, kind, durationMs) {
    const game = this.games.get(poolId);
    if (!game) return;

    if (game.timer) {
      clearTimeout(game.timer);
    }

    game.timerKind = kind;
    game.timerPaused = false;
    game.timerRemainingMs = durationMs;
    game.timerEndsAt = Date.now() + durationMs;

    if (kind === 'answering') {
      game.timer = setTimeout(() => this.handleAnswerTimeout(poolId), durationMs);
    } else if (kind === 'betting') {
      game.timer = setTimeout(() => this.handleBettingTimeout(poolId), durationMs);
    }
  }
}

module.exports = { GameStateManager };

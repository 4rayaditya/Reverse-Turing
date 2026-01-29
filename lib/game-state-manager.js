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
   * Create a new game pool
   */
  createPool(poolId, ownerId = null) {
    if (this.games.has(poolId)) {
      throw new Error('Pool already exists');
    }

    if (this.games.size >= this.MAX_POOLS) {
      throw new Error('Maximum pools reached');
    }

    const game = {
      poolId,
      ownerId,
      players: [],
      phase: 'waiting', // waiting, answering, betting, revealing, finished
      currentRound: null,
      roundNumber: 0,
      totalRounds: this.PLAYERS_PER_POOL,
      answeredPlayerIds: [],
      bets: {},
      usedQuestions: [], // Track used questions to prevent repeats
      pendingJoinRequests: [],
      startedAt: null,
      finishedAt: null,
      timer: null,
      timerKind: null, // answering | betting
      timerEndsAt: null,
      timerRemainingMs: null,
      timerPaused: false,
      paused: false
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

    // Allow joining during waiting or early answering phase
    if (game.phase !== 'waiting' && game.phase !== 'answering') {
      throw new Error('Game already in progress - cannot join during betting or revealing');
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

    return game;
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

    if (game.players.length < 2) {
      throw new Error('Not enough players to start');
    }

    game.startedAt = Date.now();
    game.totalRounds = game.players.length;

    this.startNewRound(poolId);

    console.log(`[GameState] Game started in pool ${poolId} with ${game.players.length} players`);
    return game;
  }

  /**
   * Pause current game timer
   */
  pauseGame(poolId) {
    const game = this.games.get(poolId);
    if (!game) throw new Error('Pool not found');

    if (game.timer && !game.timerPaused) {
      const remaining = Math.max(0, (game.timerEndsAt || Date.now()) - Date.now());
      clearTimeout(game.timer);
      game.timer = null;
      game.timerRemainingMs = remaining;
      game.timerEndsAt = null;
      game.timerPaused = true;
      game.paused = true;
      return remaining;
    }

    game.paused = true;
    game.timerPaused = true;
    return game.timerRemainingMs || 0;
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
    const questions = [
      "If you could time travel, where would you go?",
      "What is your biggest fear?",
      "What's your most embarrassing college moment?",
      "What would you do with a million dollars?",
      "Describe your ideal weekend",
      "What's the worst advice you've ever received?",
      "What keeps you up at night?",
      "What's your unpopular opinion?",
      "What's your comfort movie or show?"
    ];
    
    // Filter out used questions
    const usedQuestions = game?.usedQuestions || [];
    const availableQuestions = questions.filter(q => !usedQuestions.includes(q));
    
    // If all questions used, reset the pool
    if (availableQuestions.length === 0) {
      console.log('[GameState] All questions used, resetting pool');
      if (game) game.usedQuestions = [];
      return questions[Math.floor(Math.random() * questions.length)];
    }
    
    // Pick random from available
    const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    
    // Mark as used
    if (game) {
      game.usedQuestions.push(selected);
      console.log(`[GameState] Question selected: "${selected}" (${game.usedQuestions.length}/${questions.length} used)`);
    }
    
    return selected;
  }

  /**
   * Get fallback AI answer - designed to sound extremely human-like
   */
  getFallbackAIAnswer(question) {
    const lowerQ = question.toLowerCase();
    
    // Time travel question
    if (lowerQ.includes('time travel')) {
      const answers = [
        "The 60s to see a Beatles concert. My parents won't shut up about that era lol",
        "Ancient Rome. Been obsessed since high school.",
        "Back to when I was 10 to chill out more. So much wasted anxiety.",
        "Renaissance era. Though I'd probably die from the plague."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Biggest fear question
    if (lowerQ.includes('fear')) {
      const answers = [
        "Dying alone tbh. Keeps me up sometimes.",
        "Deep water. Jaws ruined me for life.",
        "Failing publicly at something I care about.",
        "Getting dementia like my grandma did."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // What keeps you up at night
    if (lowerQ.includes('keeps you up')) {
      const answers = [
        "Money stress mostly. Student loans are killing me.",
        "Existential dread and random cringe memories from 5 years ago.",
        "Overthinking every conversation I had that day.",
        "Climate change and whether I'll ever afford a house."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Embarrassing moment question
    if (lowerQ.includes('embarrass')) {
      const answers = [
        "Fell asleep in a final and woke up drooling. Everyone saw.",
        "Drunk texted my ex a novel. It got screenshot and shared.",
        "Walked around with my fly down for 2 hours.",
        "Called my professor 'mom' in front of 200 people."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Million dollars question
    if (lowerQ.includes('million dollar')) {
      const answers = [
        "Pay off loans, buy parents a house, invest the rest.",
        "Invest half, travel for a year on the other half.",
        "House, trust fund, then spend on experiences not stuff.",
        "Index funds and a house near the beach."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Ideal weekend question
    if (lowerQ.includes('weekend')) {
      const answers = [
        "Sleep in, brunch, bookstore, Netflix. Nothing crazy.",
        "Hiking Saturday morning, brewery afternoon. Sunday: nothing.",
        "Literally just sleep without an alarm. Maybe see friends.",
        "Road trip with good music and random diner stops."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Unpopular opinion
    if (lowerQ.includes('unpopular opinion')) {
      const answers = [
        "The Office isn't that funny. There I said it.",
        "Coffee tastes like burnt sadness. Fight me.",
        "Dogs are way too much work. Cats are superior.",
        "Social media was a mistake for society."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Comfort movie/show
    if (lowerQ.includes('comfort') && (lowerQ.includes('movie') || lowerQ.includes('show'))) {
      const answers = [
        "Parks and Rec. Watched it like 6 times.",
        "Any Studio Ghibli movie. Instant calm.",
        "The Office for the millionth time. Don't judge.",
        "Brooklyn Nine-Nine. Always makes me feel better."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Worst advice question  
    if (lowerQ.includes('advice')) {
      const answers = [
        "'Follow your passion.' Now I have debt and no job.",
        "'Fake it till you make it.' Faked it and crashed hard.",
        "'Never give up.' Sometimes you gotta pivot dude.",
        "'College is the best time.' Set unrealistic expectations."
      ];
      return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Generic fallback
    const generic = [
      "Tough question. Probably something practical I'd actually use.",
      "Not sure honestly. Never thought about it. You?",
      "Depends on the situation but whatever feels right."
    ];
    return generic[Math.floor(Math.random() * generic.length)];
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

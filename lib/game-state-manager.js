// lib/game-state-manager.js
/**
 * Production-safe in-memory game state manager
 * Handles 2 pools of 6 players each (12 players max)
 */

const { EventEmitter } = require('events');

class GameStateManager extends EventEmitter {
    const lowerQ = (question || '').toLowerCase();

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Add light Hinglish occasionally and keep language simple
    const maybeHinglish = (s) => {
      if (Math.random() < 0.16) {
        const p = pick([' yaar', ' thoda', ' bas', ' acha']);
        return s + p;
      }
      return s;
    };

    const humanize = (s) => {
      let out = s;
      // small chance to lower case or add a tiny spacing quirk
      if (Math.random() < 0.12) out = out.toLowerCase();
      if (Math.random() < 0.06) out = out.replace(/\s/, '  ');
      return maybeHinglish(out);
    };

    if (lowerQ.includes('time travel')) {
      return humanize(pick([
        "I'd go to the future to see how life changes.",
        "I'd visit a happy childhood summer again.",
        "See new tech and how people live later on.",
        "Go back to a simple summer day from when I was a kid."
      ]));
    }

    if (lowerQ.includes('fear')) {
      return humanize(pick([
        "Being alone and not having done much would scare me.",
        "Losing my memory or mind — that's a big fear.",
        "Failing at something important in front of people.",
        "Not being able to support my family financially."
      ]));
    }

    if (lowerQ.includes('keeps you up')) {
      return humanize(pick([
        "Worrying about money and bills mostly.",
        "Embarrassing moments that pop back in my head.",
        "Thinking if I'm making the right choices for future.",
        "Little things like my phone dying on a trip."
      ]));
    }

    if (lowerQ.includes('embarrass')) {
      return humanize(pick([
        "Fell asleep in class once and woke up to snoring.",
        "Sent a message to the wrong chat and regretted it.",
        "Tripped on stage in front of people — still cringe.",
        "Called someone the wrong name by accident."
      ]));
    }

    if (lowerQ.includes('million')) {
      return humanize(pick([
        "Pay off debts, help family, then save and invest.",
        "Travel a bit and put most into safe savings.",
        "Buy a small home, save, and enjoy a few trips.",
        "Give some to parents and keep the rest for future."
      ]));
    }

    if (lowerQ.includes('weekend')) {
      return humanize(pick([
        "Sleep in, go for brunch with friends, relax.",
        "A short hike and then a lazy afternoon with a show.",
        "Just hang out with friends and enjoy good food.",
        "A quick road trip with music and diner stops."
      ]));
    }

    if (lowerQ.includes('advice')) {
      return humanize(pick([
        "'Follow your passion' is good, but plan practical steps too.",
        "'Fake it till you make it' can wear you out — be careful.",
        "People give advice, but pick what actually works for you.",
        "Sometimes it's OK to step back and rethink."
      ]));
    }

    if (lowerQ.includes('unpopular opinion')) {
      return humanize(pick([
        "I think some popular shows are a bit overrated.",
        "Not being online all the time can be peaceful.",
        "I like small gatherings more than big parties sometimes.",
        "Pineapple on pizza? It's fine honestly."
      ]));
    }

    if (lowerQ.includes('comfort') && (lowerQ.includes('movie') || lowerQ.includes('show'))) {
      return humanize(pick([
        "A light comedy or a familiar show I can rewatch.",
        "A calm movie that doesn't need too much attention.",
        "Something warm and familiar, easy to watch again.",
        "A gentle animated film that feels cosy."
      ]));
    }

    // Generic fallback
    return humanize(pick([
      "Not sure, maybe something simple and relaxing.",
      "I would pick something calm and easy to enjoy.",
      "Probably something practical and low stress."
    ]));
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
      const lowerQ = (question || '').toLowerCase();

      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // Humanize subtly: short, natural sentences, occasional small imperfection
      const humanize = (s) => {
        let out = s;
        // Occasionally remove or add a small char/space to feel human, but keep professionalism
        if (Math.random() < 0.12) out = out.replace(/\s{1}/, '  '); // small extra space
        if (Math.random() < 0.08) out = out.replace(/(\w)\1?/, (m) => m); // noop or tiny chance
        if (Math.random() < 0.06) out = out.replace(/\bthe\b/gi, 'the'); // keep mostly correct
        return out;
      };

      if (lowerQ.includes('time travel')) {
        return humanize(pick([
          "I'd visit the 1960s — the music and atmosphere seem amazing.",
          "Probably the near future, just to see how things change.",
          "I'd go back to a simpler summer from my childhood.",
          "Visiting Renaissance art would be incredible, though risky."
        ]));
      }

      if (lowerQ.includes('fear')) {
        return humanize(pick([
          "Honestly, dying without having done much would scare me.",
          "Losing my memory — that thought freaks me out.",
          "Failing in public on something that matters to me.",
          "Being stuck in a situation with no way out, financially or otherwise."
        ]));
      }

      if (lowerQ.includes('keeps you up')) {
        return humanize(pick([
          "Money worries — bills and student loans mostly.",
          "Random embarrassing moments that replay in my head.",
          "Thinking about whether I'm on the right path career-wise.",
          "Little things like my phone dying on a long trip, lol."
        ]));
      }

      if (lowerQ.includes('embarrass')) {
        return humanize(pick([
          "I once fell asleep in a lecture and woke up mid-snore — mortifying.",
          "Sent the wrong message to a group chat and instantly regretted it.",
          "Tripped in front of a crowd once; still cringe about it sometimes.",
          "Called a teacher 'mom' by accident — classic."
        ]));
      }

      if (lowerQ.includes('million')) {
        return humanize(pick([
          "I'd pay off debts, help my family, then invest the rest.",
          "Travel for a bit and put most into safe investments.",
          "Buy a modest place, save some, spend a little on experiences.",
          "Give some to my parents and set up long-term savings."
        ]));
      }

      if (lowerQ.includes('weekend')) {
        return humanize(pick([
          "Sleep in, meet friends for brunch, and relax — perfect.",
          "A morning hike, coffee, then a lazy afternoon with a show.",
          "Just hanging out with friends and good food, nothing fancy.",
          "A short road trip with music and stops at small diners."
        ]));
      }

      if (lowerQ.includes('advice')) {
        return humanize(pick([
          "'Follow your passion' is nice, but practical planning matters too.",
          "'Fake it till you make it' can burn you out — be cautious.",
          "Advice is personal; what's right for one person isn't always right for another.",
          "Sometimes stepping back and rethinking is the best move."
        ]));
      }

      if (lowerQ.includes('unpopular opinion')) {
        return humanize(pick([
          "I think some popular comedies are overrated, personally.",
          "Not everyone needs to be online all the time — it's okay to disconnect.",
          "I prefer quieter plans over big group outings sometimes.",
          "Pineapple on pizza? It's fine, honestly."
        ]));
      }

      if (lowerQ.includes('comfort') && (lowerQ.includes('movie') || lowerQ.includes('show'))) {
        return humanize(pick([
          "A light comedy or a familiar show — effortless comfort.",
          "A slow, cozy movie like a Studio Ghibli film.",
          "Something predictable and warm that I can rewatch.",
          "An easy sitcom that doesn't need much attention."
        ]));
      }

      // Generic fallback
      return humanize(pick([
        "That's a good question — I'd probably pick something simple and relaxing.",
        "Not sure right now, maybe whatever feels right later.",
        "I'd go with a calm, practical option most times."
      ]));
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

    // Make answers feel like a casual 20yo: short, slang, sometimes messy
    const humanize = (s) => {
      // random lowercase, remove punctuation, or add spaced typo
      let out = s;
      if (Math.random() < 0.35) out = out.toLowerCase();
      if (Math.random() < 0.25) out = out.replace(/\bthe\b/gi, 'teh');
      if (Math.random() < 0.18) out = out.replace(/\s/g, (m, i) => (Math.random() < 0.06 ? '  ' : m));
      if (Math.random() < 0.12) out = out.replace(/s/gi, (m) => (Math.random() < 0.2 ? m + m : m));
      // sometimes drop a char
      if (Math.random() < 0.08) out = out.replace(/\w(?=\w)/, '');
      return out;
    };

    // Extremely short, youthful replies per question type
    if (lowerQ.includes('time travel')) {
      return humanize(pick([
        "def the 60s, live music and vibes",
        "prob go back to 10yo me and say chill lol",
        "future a bit, see if flying cars r real",
        "any era with good music tbh"
      ]));
    }

    if (lowerQ.includes('fear')) {
      return humanize(pick([
        "dying alone, ngl",
        "losing my mind, big nope",
        "huge fear: public fail",
        "being stuck w/out $$, freaks me out"
      ]));
    }

    if (lowerQ.includes('keeps you up')) {
      return humanize(pick([
        "bills and money stress, always",
        "that 3am cringe replay in my head",
        "worrying bout future plans lol",
        "dumb stuff like phone battery dying"
      ]));
    }

    if (lowerQ.includes('embarrass')) {
      return humanize(pick([
        "fell asleep in lecture and snored",
        "sent a drunk text to the wrong person lol",
        "tripped in front of my crush, iconic",
        "called teacher mom by accident"
      ]));
    }

    if (lowerQ.includes('million')) {
      return humanize(pick([
        "pay loans, help fam, then travel",
        "invest most, treat myself a bit",
        "tiny house, some trips, index funds",
        "give parents some, save rest"
      ]));
    }

    if (lowerQ.includes('weekend')) {
      return humanize(pick([
        "sleep in, brunch, vibe",
        "hike + nap, perfect",
        "lazy day w/ netflix and snacks",
        "roadtrip w friends, messy playlist"
      ]));
    }

    if (lowerQ.includes('advice')) {
      return humanize(pick([
        "'follow ur passion' is kinda sus sometimes",
        "fake it til u make it burnt me out",
        "dont take random advice from ppl",
        "sometimes quit is ok lol"
      ]));
    }

    if (lowerQ.includes('unpopular opinion')) {
      return humanize(pick([
        "the office is meh",
        "pineapple on pizza = yes",
        "avocado toast overrated",
        "i lowkey hate small talk"
      ]));
    }

    if (lowerQ.includes('comfort') && (lowerQ.includes('movie') || lowerQ.includes('show'))) {
      return humanize(pick([
        "parks and rec, always",
        "any chill anime, instant calm",
        "totoro or something soft",
        "b99 for dumb laughs"
      ]));
    }

    // fallback
    return humanize(pick([
      "idk, maybe something chill rn",
      "hmm not sure, ask later",
      "depends, but probs something simple"
    ]));
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

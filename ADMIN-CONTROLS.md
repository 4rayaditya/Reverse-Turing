# Admin Game Controls Guide

## Issues Fixed

### 1. ✅ Betting Auto-Selection Fixed
**Problem:** Players who didn't bet before timeout had no bet recorded.  
**Solution:** System now auto-bets 100 points on "human" for players who didn't bet before timeout.

### 2. ✅ Admin Must Start Games
**Problem:** Games auto-started when 2 players joined.  
**Solution:** Auto-start disabled. Admin must manually click "Start Game" button.

### 3. ✅ Reset Pool Function Added
**Problem:** No way to clear pools after games finish.  
**Solution:** Admin can now reset pools to allow new games.

## Admin Controls

### Starting a Game
1. Wait for players to join pool (minimum 2 players)
2. Click **"Start Game"** button in admin panel
3. Game begins with first round

### Resetting a Pool
1. Open admin panel
2. Find the pool you want to reset
3. Click **"Reset Pool"** button
4. All players are disconnected
5. Pool returns to waiting state
6. New players can join

### Other Controls
- **Pause Game**: Freezes the current timer
- **Resume Game**: Continues paused timer
- **Add Time**: Adds seconds to current timer

## Betting Behavior

### Normal Betting
- Players select "AI" or "Human" and bet amount
- Submit bet before timer expires

### Auto-Betting (Timeout)
- If timer expires and player hasn't bet:
  - System auto-bets **100 points** (or player's remaining balance if less)
  - Auto-selects **"human"** as the guess
  - Player sees notification: "Time expired - auto-bet placed"

## Game Flow

1. **Waiting Phase**
   - Players join pool
   - Admin clicks "Start Game" when ready

2. **Answering Phase**
   - Selected player answers question
   - 60 second timer
   - If timeout: fallback answer used

3. **Betting Phase**
   - Other players bet on AI vs Human
   - 30 second timer
   - If timeout: auto-bet on "human" for 100 pts

4. **Revealing Phase**
   - Shows correct answer
   - Awards points to winners (2x bet amount)
   - 5 second pause

5. **Next Round**
   - Repeats until all players have answered

6. **Finished**
   - Shows final rankings
   - Admin can reset pool

## Socket Events

### Client → Server
- `start_game` - Admin starts game
- `reset_pool` - Admin resets pool to waiting
- `pause_game` - Admin pauses timer
- `resume_game` - Admin resumes timer
- `add_time` - Admin adds time to timer

### Server → Client
- `game_started` - Game began
- `pool_reset` - Pool was reset by admin
- `game_paused` - Timer paused
- `game_resumed` - Timer resumed
- `timer_updated` - Time added

## Notes

- Minimum 2 players required to start
- Maximum 6 players per pool
- Each player answers once per game
- Auto-bet prevents players from being stuck in betting phase
- Reset pool clears all state and disconnects players

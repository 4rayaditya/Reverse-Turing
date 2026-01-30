// scripts/clear-player-data.js
/**
 * Clear all player game data (reset points, games played, wins)
 * Usage: node scripts/clear-player-data.js
 * 
 * For production (hosted sites):
 * 1. Set DATABASE_URL in .env to your production database
 * 2. Run: node scripts/clear-player-data.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearPlayerData() {
  try {
    console.log('[Clear Data] Starting...');
    
    // Reset all users to initial state
    const result = await prisma.user.updateMany({
      data: {
        points: 1000,
        gamesPlayed: 0,
        wins: 0
      }
    });

    console.log(`[Clear Data] ✅ Reset ${result.count} users to initial state (1000 points, 0 games, 0 wins)`);
    
  } catch (error) {
    console.error('[Clear Data] ❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearPlayerData();

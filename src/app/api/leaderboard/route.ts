import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const top = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 50,
      select: { 
        id: true, 
        username: true, 
        name: true, 
        points: true,
        gamesPlayed: true,
        wins: true
      }
    })

    return NextResponse.json({ 
      leaderboard: top.map((u, index) => ({ 
        rank: index + 1,
        userId: u.id, 
        name: u.username || u.name || 'Unknown', 
        points: u.points,
        gamesPlayed: u.gamesPlayed,
        wins: u.wins,
        winRate: u.gamesPlayed > 0 ? ((u.wins / u.gamesPlayed) * 100).toFixed(1) : '0.0'
      })) 
    })
  } catch (error) {
    console.error('[API] /api/leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

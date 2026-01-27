import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const top = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 50,
      select: { id: true, name: true, points: true }
    })

    return NextResponse.json({ leaderboard: top.map(u => ({ userId: u.id, name: u.name, points: u.points })) })
  } catch (error) {
    console.error('[API] /api/leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/components/providers/socket-provider"

interface LeaderboardEntry { 
  rank: number
  userId: string
  name: string | null
  points: number
  gamesPlayed: number
  wins: number
  winRate: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLive, setIsLive] = useState(false)
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    let mounted = true
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setEntries(data.leaderboard || [])
      } catch (err) {
        console.error('Failed to load leaderboard', err)
      }
    }

    fetchLeaderboard()
    // Refresh every 10 seconds as backup
    const interval = setInterval(fetchLeaderboard, 10000)

    return () => { 
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!socket) {
      setIsLive(false)
      return
    }

    setIsLive(isConnected)

    const onLeaderboard = (payload: any) => {
      console.log('🔴 LIVE UPDATE:', payload)
      if (payload?.leaderboard) {
        setEntries(payload.leaderboard)
        // Flash the live indicator
        setIsLive(false)
        setTimeout(() => setIsLive(true), 150)
      }
    }

    socket.on('leaderboard_updated', onLeaderboard)
    return () => { socket.off('leaderboard_updated', onLeaderboard) }
  }, [socket, isConnected])

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-slate-300'
    if (rank === 3) return 'text-amber-600'
    return 'text-slate-500'
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400">
            🏆 Global Leaderboard
          </h1>
          
          {/* Live Indicator */}
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-full border border-slate-700">
            <div className={`w-3 h-3 rounded-full transition-all duration-150 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-sm font-semibold tracking-wide">
              {isLive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center text-slate-400 p-12 bg-slate-900/40 rounded-xl border border-slate-800">
              No leaderboard data available yet
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Player</div>
                <div className="col-span-2 text-right">Points</div>
                <div className="col-span-2 text-right">Games</div>
                <div className="col-span-2 text-right">Wins</div>
                <div className="col-span-1 text-right">Win %</div>
              </div>

              {/* Entries */}
              {entries.map((entry) => (
                <div 
                  key={entry.userId} 
                  className={`grid grid-cols-12 gap-4 items-center p-6 rounded-xl border transition-all hover:scale-[1.02] ${
                    entry.rank <= 3 
                      ? 'bg-gradient-to-r from-slate-900/90 to-purple-900/30 border-purple-500/30 shadow-lg shadow-purple-500/10' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    <div className={`text-3xl font-bold ${getRankColor(entry.rank)}`}>
                      {getRankBadge(entry.rank)}
                    </div>
                  </div>

                  {/* Player */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                      {(entry.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-lg font-bold">{entry.name || entry.userId.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">Player #{entry.userId.slice(0, 8)}</div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-right">
                    <div className="text-2xl font-mono font-bold text-blue-400">{entry.points}</div>
                    <div className="text-xs text-slate-500">points</div>
                  </div>

                  {/* Games Played */}
                  <div className="col-span-2 text-right">
                    <div className="text-xl font-mono text-slate-300">{entry.gamesPlayed}</div>
                    <div className="text-xs text-slate-500">games</div>
                  </div>

                  {/* Wins */}
                  <div className="col-span-2 text-right">
                    <div className="text-xl font-mono text-green-400">{entry.wins}</div>
                    <div className="text-xs text-slate-500">wins</div>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-1 text-right">
                    <div className="text-lg font-mono text-yellow-400">{entry.winRate}%</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

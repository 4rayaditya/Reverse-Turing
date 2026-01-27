"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/components/providers/socket-provider"

interface LeaderboardEntry { userId: string; name: string | null; points: number }

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const { socket } = useSocket()

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

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!socket) return

    const onLeaderboard = (payload: any) => {
      if (payload?.leaderboard) setEntries(payload.leaderboard)
    }

    socket.on('leaderboard_updated', onLeaderboard)
    return () => { socket.off('leaderboard_updated', onLeaderboard) }
  }, [socket])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
        Global Leaderboard
      </h1>

      <div className="max-w-4xl mx-auto space-y-4">
        {entries.length === 0 ? (
          <div className="text-center text-slate-400">No leaderboard data</div>
        ) : (
          entries.map((entry, idx) => (
            <div key={entry.userId} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-mono text-slate-500 w-8">#{idx + 1}</div>
                <div className="w-10 h-10 bg-slate-700 rounded-full" />
                <div className="text-xl font-bold">{entry.name || entry.userId.slice(0, 8)}</div>
              </div>
              <div className="text-xl font-mono text-blue-400">{entry.points} pts</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

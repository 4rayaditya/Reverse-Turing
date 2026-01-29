"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

interface Pool {
  poolId: string
  players: number
  maxPlayers: number
  phase: string
}

export default function LobbyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pools, setPools] = useState<Pool[]>([])
  const [newPoolName, setNewPoolName] = useState("")
  const isAdmin = session?.user?.email === "ray@gmail.com" || (session?.user as any)?.isAdmin

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const handleCreatePool = () => {
    if (!newPoolName.trim()) {
      alert("Please enter a pool name")
      return
    }
    const poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    router.push(`/game/${poolId}`)
  }

  const handleJoinPool = (poolId: string) => {
    router.push(`/game/${poolId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              Game Lobby
            </h1>
            <p className="text-slate-400 mt-2">Welcome, {session?.user?.name || "Player"}</p>
          </div>

          <div className="flex gap-4">
            <Link href="/leaderboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-purple-500/20 hover:bg-slate-800 transition-all"
              >
                Leaderboard
              </motion.button>
            </Link>

            {isAdmin && (
              <Link href="/admin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  Admin Panel
                </motion.button>
              </Link>
            )}
          </div>
        </div>

        {/* Create Pool Section */}
        <div className="mb-8 p-6 rounded-xl bg-slate-900/40 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Create New Game</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              placeholder="Enter pool name (e.g., Pool 1, Game Room A)"
              className="flex-1 px-4 py-3 bg-slate-800/50 text-white rounded-lg border border-purple-500/20 focus:border-purple-500/40 focus:outline-none"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreatePool}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Create & Join
            </motion.button>
          </div>
          <p className="text-slate-400 text-sm mt-3">💡 Tip: Share the pool URL with other players so they can join!</p>
        </div>

        {/* Quick Join Presets */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Join</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {['Pool-1', 'Pool-2', 'Pool-3', 'Pool-4'].map((name) => (
              <motion.div
                key={name}
                whileHover={{ y: -5 }}
                className="backdrop-blur-xl bg-slate-900/40 rounded-xl border border-purple-500/20 p-6 cursor-pointer hover:border-purple-500/40 transition-all"
                onClick={() => handleJoinPool(name)}
              >
                <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
                <p className="text-slate-400 text-sm">Click to join or create</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-3">How to Play</h3>
          <ol className="text-slate-300 space-y-2 list-decimal list-inside">
            <li>Create a pool or join an existing one</li>
            <li>Wait for admin to start the game (minimum 2 players)</li>
            <li>Take turns answering questions - try to sound human!</li>
            <li>Bet on whether answers are from AI or human</li>
            <li>Earn points by guessing correctly</li>
          </ol>
        </div>

        {pools.length === 0 && (
          <div className="text-center text-slate-400 mt-12">
            <p className="text-lg">No active pools. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

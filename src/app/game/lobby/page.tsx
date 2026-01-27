"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

interface Pool {
  id: string
  name: string
  status: string
  _count: { users: number }
}

export default function LobbyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    fetchPools()
  }, [])

  const fetchPools = async () => {
    try {
      const res = await fetch("/api/pools")
      if (res.ok) {
        setPools(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch pools:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePool = async () => {
    const name = prompt("Enter pool name:")
    if (!name) return

    const res = await fetch("/api/pools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })

    if (res.ok) {
      const pool = await res.json()
      router.push(`/game/${pool.id}`)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
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
            
            {session?.user?.email === "ray@gmail.com" && (
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

        {/* Create Pool Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreatePool}
          className="w-full mb-6 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
        >
          + Create New Game Pool
        </motion.button>

        {/* Active Pools */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              className="backdrop-blur-xl bg-slate-900/40 rounded-xl border border-purple-500/20 p-6 cursor-pointer hover:border-purple-500/40 transition-all"
              onClick={() => router.push(`/game/${pool.id}`)}
            >
              <h3 className="text-xl font-bold text-white mb-2">{pool.name}</h3>
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>{pool._count.users} players</span>
                <span
                  className={`px-2 py-1 rounded ${
                    pool.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : pool.status === "waiting"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  {pool.status}
                </span>
              </div>
            </motion.div>
          ))}
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

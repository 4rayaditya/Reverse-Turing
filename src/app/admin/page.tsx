"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface User {
  id: string
  username: string
  email: string
  points: number
  isAdmin: boolean
  createdAt: string
}

interface Game {
  id: string
  status: string
  createdAt: string
  _count: { rounds: number }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"users" | "games">("users")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [usersRes, gamesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/games"),
      ])
      
      if (usersRes.ok) setUsers(await usersRes.json())
      if (gamesRes.ok) setGames(await gamesRes.json())
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== userId))
    }
  }

  const handleUpdatePoints = async (userId: string, newPoints: number) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: newPoints }),
    })
    
    if (res.ok) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, points: newPoints } : u)))
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Manage users, games, and system settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${ 
              activeTab === "users"
                ? "bg-purple-600 text-white"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("games")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "games"
                ? "bg-purple-600 text-white"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
            }`}
          >
            Games ({games.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-slate-900/40 rounded-xl border border-purple-500/20 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Points</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <input
                          type="number"
                          value={user.points}
                          onChange={(e) => handleUpdatePoints(user.id, parseInt(e.target.value))}
                          className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.isAdmin ? (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs font-medium">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Games Tab */}
        {activeTab === "games" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-slate-900/40 rounded-xl border border-purple-500/20 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Game ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Rounds</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">{game.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            game.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : game.status === "finished"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {game.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{game._count.rounds}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

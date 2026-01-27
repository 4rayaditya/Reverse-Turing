export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
        Global Leaderboard
      </h1>
      
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-slate-600 transition-colors cursor-default">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono text-slate-500 w-8">#{item}</div>
              <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
              <div className="text-xl font-bold">Player {item}</div>
            </div>
            <div className="text-xl font-mono text-blue-400">
              {Math.floor(Math.random() * 5000) + 1000} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/providers/socket-provider"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"

export function GameUI({
  gameState,
  gameId,
  joinPending,
  joinError
}: {
  gameState: any
  gameId: string
  joinPending?: boolean
  joinError?: string | null
}) {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const [betAmount, setBetAmount] = useState(50)
  const [answerText, setAnswerText] = useState("")
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  
  useEffect(() => {
    if (gameState?.phase === "answering") {
      setTimeLeft(120) // 2 minutes
    } else if (gameState?.phase === "betting") {
      setTimeLeft(60) // 1 minute
    }
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [gameState?.phase])
  
  if (!gameState) {
    return (
      <div className="w-full h-full flex items-start justify-center p-6 pointer-events-auto">
        <div className="bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-white shadow-2xl max-w-xl w-full">
          <div className="text-xl font-bold mb-2">Joining game…</div>
          <div className="text-sm text-slate-300">Room: {gameId}</div>
          {joinPending && (
            <div className="mt-3 text-yellow-300">Waiting for server response…</div>
          )}
          {joinError && (
            <div className="mt-3 text-red-400">{joinError}</div>
          )}
          <div className="mt-4 text-sm text-slate-400">
            If this persists, refresh and make sure the socket server is running.
          </div>
        </div>
      </div>
    )
  }

  const userId = session?.user?.id
  const isAnswerer = gameState.currentRound?.answerer === userId
  const currentPlayer = gameState.players?.find((p: any) => p.userId === userId)
  const hasBet = gameState.bets && gameState.bets[userId || ""]

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBet = (choice: 'A' | 'B') => {
      if (!userId || !selectedBet) return
      socket.emit("place_bet", { gameId, userId, amount: selectedBet, guess: choice })
  }

  const handleSubmitAnswer = () => {
    if (!userId || !answerText.trim()) return
    socket.emit("submit_answer", { gameId, userId, answer: answerText })
    setAnswerText("")
  }

  const handleReveal = (actualType: 'human' | 'ai') => {
    socket.emit("reveal_round", { gameId, actualType })
  }

  const handleStartGame = () => {
    socket.emit("start_game", { gameId })
  }

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 pointer-events-auto">
      {/* Top Bar: Game Info with glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 justify-between items-start"
      >
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-white shadow-2xl">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Room: {gameId.slice(0, 8)}
          </h2>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Round: {gameState.roundNumber || 0}/{gameState.totalRounds || gameState.players?.length || 6}</span>
            </div>
            <div>Phase: <span className="text-purple-400 font-semibold capitalize">{gameState.phase || "Waiting"}</span></div>
            <div>Players: {gameState.players?.length || 0}</div>
            {(gameState.phase === "answering" || gameState.phase === "betting") && (
              <div className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Question Panel with enhanced styling */}
        <AnimatePresence>
          {(gameState.phase === "answering" || gameState.phase === "betting") && gameState.currentRound?.question && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: "spring", damping: 15 }}
              className="order-last md:order-none w-full md:w-auto bg-gradient-to-br from-blue-900/80 to-purple-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-blue-400/30 max-w-2xl text-center shadow-[0_0_50px_rgba(59,130,246,0.4)]"
            >
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-sm text-blue-300 uppercase tracking-[0.3em] mb-3 font-bold"
                >
                  ✨ Prompt ✨
                </motion.div>
                <div className="text-3xl font-bold text-white leading-tight">
                    {gameState.currentRound.question}
                </div>
                {gameState.phase === "answering" && (
                  <div className="mt-4 text-yellow-300 text-sm">
                    {isAnswerer ? "🎯 You're answering!" : `⏳ Waiting for ${gameState.players?.find((p: any) => p.userId === gameState.currentRound.answerer)?.name || 'player'} to answer...`}
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-white shadow-2xl">
           <div className="text-right">
             <div className="text-sm text-slate-400 mb-1">Your Balance</div>
             <motion.div 
               key={currentPlayer?.points}
               initial={{ scale: 1.2, color: "#10b981" }}
               animate={{ scale: 1, color: "#34d399" }}
               className="text-3xl font-mono font-bold"
             >
               {currentPlayer?.points || 1000} PTS
             </motion.div>
           </div>
        </div>
      </motion.div>


      {/* Answer Display Area (Center) with enhanced animation */}
      <AnimatePresence>
        {gameState.phase === 'betting' && gameState.currentRound?.answerA && gameState.currentRound?.answerB && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotateX: 90 }}
            transition={{ type: "spring", damping: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
          >
            <div className="bg-gradient-to-br from-black/95 to-slate-900/95 p-6 md:p-8 rounded-3xl border-2 border-white/20 backdrop-blur-xl max-w-5xl max-h-[45vh] overflow-auto shadow-[0_0_80px_rgba(139,92,246,0.6)]">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-purple-300 mb-6 text-xl font-semibold tracking-wider text-center"
              >
                ⚡ Which answer is from the HUMAN? ⚡
              </motion.div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Answer A */}
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-5 rounded-2xl border-2 border-blue-400/40">
                  <div className="text-blue-300 font-bold text-lg mb-3">🅰️ ANSWER A</div>
                  <p className="text-lg italic font-serif text-white leading-relaxed">
                    "{gameState.currentRound.answerA}"
                  </p>
                </div>
                
                {/* Answer B */}
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 p-5 rounded-2xl border-2 border-purple-400/40">
                  <div className="text-purple-300 font-bold text-lg mb-3">🅱️ ANSWER B</div>
                  <p className="text-lg italic font-serif text-white leading-relaxed">
                    "{gameState.currentRound.answerB}"
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Result Display */}
        {gameState.phase === 'revealing' && gameState.lastResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
          >
            <div className="bg-gradient-to-br from-emerald-900/95 to-teal-900/95 p-6 md:p-8 rounded-3xl border-2 border-emerald-400/50 backdrop-blur-xl max-w-4xl max-h-[45vh] overflow-auto shadow-[0_0_80px_rgba(16,185,129,0.6)]">
              <div className="text-emerald-300 mb-3 text-xl font-bold text-center">
                🎊 Result 🎊
              </div>
              <div className="text-4xl font-bold text-white mb-5 text-center">
                Answer {gameState.lastResult.correctChoice} was the HUMAN!
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-white/10 p-4 rounded-xl">
                  <div className="text-sm text-emerald-300 font-bold mb-2">✅ Human Answer:</div>
                  <div className="text-white italic text-sm">"{gameState.lastResult.humanAnswer}"</div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl">
                  <div className="text-sm text-red-300 font-bold mb-2">🤖 AI Answer:</div>
                  <div className="text-white italic text-sm">"{gameState.lastResult.aiAnswer}"</div>
                </div>
              </div>
              {gameState.lastResult.winners.length > 0 ? (
                <div className="text-yellow-300 text-lg text-center">
                  🏆 Winners: {gameState.lastResult.winners.map((w: any) => w.name).join(', ')}
                </div>
              ) : (
                <div className="text-red-300 text-lg text-center">No winners this round!</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls with enhanced glassmorphism */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <AnimatePresence mode="wait">
          {gameState.phase === "waiting" && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="text-center"
            >
              <div className="text-white text-2xl mb-4">Waiting for players...</div>
              {gameState.players?.length >= 2 && (
                <Button 
                  onClick={handleStartGame}
                  className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-xl font-bold py-6 px-12 rounded-2xl"
                >
                  🚀 START GAME
                </Button>
              )}
            </motion.div>
          )}

          {gameState.phase === "answering" && isAnswerer && (
            <motion.div 
              key="answering"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-2xl p-8 rounded-3xl border-2 border-yellow-500/30 w-full max-w-2xl"
            >
              <div className="text-white text-center mb-6 text-2xl font-bold">
                🎯 Your turn to answer!
              </div>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-slate-800/50 text-white p-4 rounded-xl border border-white/20 min-h-32 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!answerText.trim()}
                className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white text-xl font-bold py-6 rounded-2xl disabled:opacity-50"
              >
                ✅ SUBMIT ANSWER
              </Button>
            </motion.div>
          )}

          {gameState.phase === "betting" && !isAnswerer && (
            <motion.div 
              key="betting"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl p-6 rounded-3xl border-2 border-purple-500/30 w-full max-w-6xl shadow-[0_0_60px_rgba(139,92,246,0.4)]"
            >
              {!hasBet ? (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white text-center mb-4 text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                  >
                    Select your bet amount
                  </motion.div>
                  
                  {/* Poker Chip Selection - Compact */}
                  <div className="flex flex-wrap justify-center gap-3 mb-5">
                    {[10, 25, 50, 100, 250, 500, 1000].map((amount) => (
                      <motion.button
                        key={amount}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedBet(amount)}
                        disabled={currentPlayer?.points < amount}
                        className={`relative w-16 h-16 rounded-full font-bold text-base shadow-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          selectedBet === amount
                            ? 'ring-4 ring-yellow-400 scale-110'
                            : ''
                        } ${
                          amount <= 50
                            ? 'bg-gradient-to-br from-red-600 to-red-800 text-white'
                            : amount <= 100
                            ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                            : amount <= 500
                            ? 'bg-gradient-to-br from-green-600 to-green-800 text-white'
                            : 'bg-gradient-to-br from-purple-600 to-purple-900 text-white'
                        }`}
                      >
                        <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-white/40"></div>
                        <div className="relative z-10">{amount}</div>
                      </motion.button>
                    ))}
                  </div>

                  {selectedBet && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="text-center mb-4 text-lg text-yellow-300 font-bold">
                        Selected: {selectedBet} points
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1"
                        >
                          <Button 
                            onClick={() => handleBet('A')}
                            className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white text-xl font-bold py-6 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] transition-all"
                          >
                            🅰️ ANSWER A
                          </Button>
                        </motion.div>
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex-1"
                        >
                          <Button 
                            onClick={() => handleBet('B')}
                            className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-500 hover:via-pink-400 hover:to-red-400 text-white text-xl font-bold py-6 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:shadow-[0_0_50px_rgba(168,85,247,0.8)] transition-all"
                          >
                            🅱️ ANSWER B
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">✅</div>
                  <div className="text-white text-xl font-bold">Bet Placed!</div>
                  <div className="text-purple-300 text-base mt-2">
                    {gameState.bets[userId].amount} points on Answer {gameState.bets[userId].guess}
                  </div>
                  <div className="text-slate-400 text-sm mt-3">
                    Waiting for other players...
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/providers/socket-provider"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// -- Cyberpunk / Turing Theme Constants --
const THEME_COLORS = {
  background: "#050b14", // Deep dark blue/black
  tableBg: "#0f172a",    // Dark slate
  tableBorder: "#1e293b",
  primaryGlow: "#0ea5e9", // Sky blue glow
  accentGlow: "#f59e0b",  // Amber/Orange glow (Human)
  dangerGlow: "#ef4444",  // Red
  textSecondary: "#94a3b8",
}

// Helper to determine seat position based on index (0-5)
// Adjusted for oval table layout
const getSeatPosition = (index: number) => {
  const positions = [
    "bottom-[-20px] left-1/2 -translate-x-1/2", // User (Bottom Center)
    "bottom-[20%] left-[-20px] md:left-[10px]",  // Left Bottom
    "top-[20%] left-[-20px] md:left-[10px]",     // Left Top
    "top-[-45px] left-1/2 -translate-x-1/2",     // Top Center
    "top-[20%] right-[-20px] md:right-[10px]",   // Right Top
    "bottom-[20%] right-[-20px] md:right-[10px]" // Right Bottom
  ]
  return positions[index] || "hidden"
}

export function GameUI({
  gameState,
  gameId,
  joinPending,
  joinError,
  joinStatus
}: {
  gameState: any
  gameId: string
  joinPending?: boolean
  joinError?: string | null
  joinStatus?: 'idle' | 'pending' | 'approved' | 'denied'
}) {
  const { socket } = useSocket()
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [answerText, setAnswerText] = useState("")
  const [selectedBet, setSelectedBet] = useState<number | null>(null)
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0)
  
  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [musicVolume, setMusicVolume] = useState([50])

  const isAdmin = (session?.user as any)?.isAdmin || session?.user?.email === "ray@gmail.com"
  
  const handleExitGame = () => {
    // Optional: Emit leave event if needed
    // socket.emit('leave_game', { gameId }) 
    router.push('/')
    toast({
      title: "Left Game",
      description: "You have returned to the lobby.",
    })
  }
  
  // Custom font injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  useEffect(() => {
    const timerMs = gameState?.timer?.timerRemainingMs
    if (typeof timerMs === "number") {
      setTimeLeftMs(timerMs)
    } else if (gameState?.phase === "answering") {
      setTimeLeftMs(120000)
    } else if (gameState?.phase === "betting") {
      setTimeLeftMs(60000)
    }

    const interval = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (gameState?.timer?.timerPaused) return prev
        return Math.max(0, prev - 1000)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState?.phase, gameState?.timer?.timerRemainingMs, gameState?.timer?.timerPaused])
  
  // -- Loading State --
  if (!gameState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050b14] font-['Space_Grotesk'] text-cyan-400 relative overflow-hidden">
        {/* Circuit background */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="text-5xl font-bold tracking-widest mb-4 animate-pulse uppercase drop-shadow-[0_0_15px_rgba(14,165,233,0.8)]">
                Initializing
            </div>
            <div className="font-['JetBrains_Mono'] text-sm text-cyan-700 typing-effect">
                &gt; Connecting to neural net: {gameId.slice(0, 8)}...
            </div>
             {joinError && (
                <div className="mt-8 bg-red-900/20 border border-red-500 text-red-400 px-6 py-4 rounded font-mono">
                  ERROR: {joinError}
                </div>
            )}
        </div>
      </div>
    )
  }

  const userId = session?.user?.id
  const isAnswerer = gameState.currentRound?.answerer === userId
  const currentPlayer = gameState.players?.find((p: any) => p.userId === userId)
  const myBet = userId ? gameState.bets?.[userId] : null
  const hasBet = !!myBet
  const timeLeftSeconds = Math.ceil(timeLeftMs / 1000)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBet = (choice: 'A' | 'B') => {
      if (!socket || !userId || !selectedBet) return
      socket.emit("place_bet", { gameId, userId, amount: selectedBet, guess: choice })
  }

  const handleSubmitAnswer = () => {
    if (!socket || !userId || !answerText.trim()) return
    socket.emit("submit_answer", { gameId, userId, answer: answerText })
    setAnswerText("")
  }

  const handleStartGame = () => {
    if (!socket) return
    socket.emit("start_game", { gameId })
  }

  // Rotate players so current user is always at bottom center (index 0)
  const sortedPlayers = [...(gameState.players || [])]
  const myIndex = sortedPlayers.findIndex((p: any) => p.userId === userId)
  if (myIndex !== -1) {
    const before = sortedPlayers.slice(0, myIndex)
    const after = sortedPlayers.slice(myIndex)
    sortedPlayers.splice(0, sortedPlayers.length, ...after, ...before)
  }

  return (
    <div className="w-full h-screen bg-[#020610] flex flex-col items-center justify-center overflow-hidden relative font-['Space_Grotesk'] text-white">
      
      {/* Background - Casino Environment */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* Dark Base */}
         <div className="absolute inset-0 bg-[#050510]"></div>
         
         {/* Blurred Casino Ambience Image */}
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596706788226-94639d675681?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-30 blur-[8px] scale-110"></div>
         
         {/* Vignette & Spotlight Effect */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020610_80%)]"></div>
         
         {/* Subtle Dust/Smoke Particles (CSS only cheap trick) */}
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
      </div>

      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex justify-between items-start z-30 opacity-80">
        <div className="flex gap-4">
             <div className="border border-cyan-800 bg-cyan-950/30 p-2 rounded-lg backdrop-blur-sm">
                <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-1">Room ID</div>
                <div className="font-mono text-cyan-200">{gameId.slice(0, 8)}</div>
             </div>
        </div>
        
        {/* Timer */}
        {(gameState.phase === "answering" || gameState.phase === "betting") && (
            <div className="flex flex-col items-center">
                <div className={`text-4xl font-mono font-bold tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] 
                    ${timeLeftSeconds <= 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                    {formatTime(timeLeftSeconds)}
                </div>
                <div className="text-[10px] text-cyan-600 uppercase tracking-[0.2em] mt-1">Time Remaining</div>
            </div>
        )}

        <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="bg-slate-900 border border-slate-700 rounded p-2 hover:bg-slate-800 cursor-pointer transition-colors">
                    <MenuIcon className="w-6 h-6 text-slate-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-900 border-slate-700 text-slate-200">
                <DropdownMenuLabel>Game Menu</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(gameId) && toast({ title: "Copied!", description: "Game ID copied to clipboard" })}>
                  Copy Room ID
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Report Issue</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-900/20" onClick={handleExitGame}>
                  Exit Game
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>


      {/* Main Game Table Area */}
      <div className="relative z-10 w-[90vw] max-w-[1400px] aspect-[16/9] md:aspect-[2.2/1] flex items-center justify-center">
        
        {/* Table Graphic - Upgraded with Texture and Leather Rail */}
        <div className="absolute inset-0 mx-auto w-full h-full rounded-[100px] md:rounded-[200px] border-[20px] md:border-[30px] border-[#1a1a2e] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_0_2px_rgba(255,255,255,0.05)_inset] overflow-hidden bg-[#0c1220]">
             
             {/* Felt Texture */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')] opacity-80 mix-blend-overlay"></div>
             
             {/* Inner Shadow/Gradient for Depth */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,rgba(0,0,0,0.8)_100%)]"></div>

             {/* Neon Rim Light inside the rail */}
             <div className="absolute inset-0 rounded-[80px] md:rounded-[170px] shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]"></div>

             {/* Center Logo/Glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-cyan-700/5 blur-[100px] rounded-full"></div>
             
             {/* Decorative Lines */}
             <div className="absolute inset-12 md:inset-20 rounded-[80px] md:rounded-[150px] border border-cyan-500/10 dashed opacity-50"></div>
        </div>


        {/* Center Console / Terminal */}
        <div className="absolute z-20 w-[60%] h-[60%] flex flex-col items-center justify-center pointer-events-none">
            
            {/* Header Text */}
            <div className="mb-4 text-center">
                 <h1 className="text-3xl md:text-5xl font-['Space_Grotesk'] font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] uppercase tracking-wider">
                    Turing Hold&apos;em
                 </h1>
                 <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-2"></div>
            </div>

            {/* Main Content Box - Dynamic based on phase */}
            <AnimatePresence mode="wait">
                 {/* Waiting Phase */}
                 {gameState.phase === "waiting" && (
                     <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-black/60 border border-cyan-500/30 backdrop-blur-md p-8 rounded-xl text-center pointer-events-auto shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                     >
                        <div className="text-cyan-400 font-mono mb-4 animate-pulse">WAITING FOR PLAYERS...</div>
                        <div className="text-sm text-cyan-600 font-mono mb-6">{gameState.players?.length} / 6 CONNECTED</div>
                         {isAdmin && gameState.players?.length >= 2 && (
                            <Button 
                                onClick={handleStartGame}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-6 px-12 rounded shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400 uppercase tracking-widest text-lg"
                            >
                                DEAL CARDS
                            </Button>
                         )}
                     </motion.div>
                 )}

                 {gameState.phase === "answering" && (
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-2xl bg-[#0c1220]/90 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-xl shadow-2xl pointer-events-auto flex flex-col gap-4"
                     >
                        <div className="font-['JetBrains_Mono'] text-xs text-cyan-500 mb-1">
                             user@turing:~/question$ cat current_topic.txt
                        </div>
                        
                        {/* The Question */}
                        <div className="font-['Space_Grotesk'] text-xl md:text-2xl text-white leading-relaxed p-4 bg-black/40 rounded border-l-2 border-cyan-500">
                             &quot;{gameState.currentRound?.question}&quot;
                        </div>

                        {/* Input Area (only for Answerer) */}
                        {isAnswerer ? (
                            <div className="mt-4">
                                <textarea
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    className="w-full bg-[#050a14] border border-cyan-800 text-cyan-100 font-['JetBrains_Mono'] p-4 rounded focus:outline-none focus:border-cyan-400 transition-colors h-32 resize-none shadow-inner"
                                    placeholder="// Type your response here to fool the humans..."
                                    autoFocus
                                />
                                <div className="flex justify-end mt-2">
                                    <Button 
                                        onClick={handleSubmitAnswer}
                                        disabled={!answerText.trim()}
                                        className="bg-orange-500 hover:bg-orange-400 text-black font-bold font-mono px-8 shadow-[0_0_15px_rgba(249,115,22,0.4)] border border-orange-300"
                                    >
                                        EXECUTE
                                    </Button>
                                </div>
                            </div>
                        ) : (
                             <div className="mt-4 flex items-center gap-3 text-cyan-500/70 font-mono text-sm bg-cyan-950/20 p-2 rounded">
                                 <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
                                 Awaiting input from neural network [{gameState.players?.find((p: any) => p.userId === gameState.currentRound.answerer)?.name}]...
                             </div>
                        )}
                    </motion.div>
                 )}

                 {(gameState.phase === "betting" || gameState.phase === "revealing") && (
                     <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="w-full max-w-3xl flex flex-col md:flex-row gap-6 pointer-events-auto"
                     >
                         {/* Option A */}
                         <div className={`flex-1 group relative p-[1px] rounded-xl transition-all duration-300
                            ${gameState.phase === 'revealing' && gameState.lastResult?.correctChoice === 'A' ? 'bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_40px_rgba(249,115,22,0.4)] z-10 scale-105' : 'bg-gradient-to-b from-cyan-800 to-transparent'}
                         `}>
                             <div className="bg-[#0c1220] h-full rounded-xl p-5 flex flex-col relative overflow-hidden">
                                {gameState.phase === 'revealing' && gameState.lastResult?.correctChoice === 'A' && (
                                     <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
                                )}
                                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                                    <span className="text-cyan-400 font-mono text-xs font-bold uppercase">OPTION A</span>
                                    {gameState.phase === "revealing" && (
                                        <Badge isHuman={gameState.lastResult?.correctChoice === 'A'} />
                                    )}
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center font-['JetBrains_Mono'] text-sm md:text-base text-gray-200 leading-relaxed min-h-[100px]">
                                    {gameState.currentRound?.answerA}
                                </div>
                                {gameState.phase === "betting" && !isAnswerer && selectedBet && (
                                    <button 
                                        onClick={() => handleBet('A')}
                                        className="mt-4 w-full py-3 bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-500 text-cyan-400 hover:text-white font-bold rounded flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                                    >
                                        BET ${selectedBet}
                                    </button>
                                )}
                             </div>
                         </div>

                         {/* VS Divider (if needed, or just space) */}
                         
                         {/* Option B */}
                         <div className={`flex-1 group relative p-[1px] rounded-xl transition-all duration-300
                            ${gameState.phase === 'revealing' && gameState.lastResult?.correctChoice === 'B' ? 'bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_40px_rgba(249,115,22,0.4)] z-10 scale-105' : 'bg-gradient-to-b from-purple-800 to-transparent'}
                         `}>
                             <div className="bg-[#0c1220] h-full rounded-xl p-5 flex flex-col relative overflow-hidden">
                                {gameState.phase === 'revealing' && gameState.lastResult?.correctChoice === 'B' && (
                                     <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
                                )}
                                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                                    <span className="text-purple-400 font-mono text-xs font-bold uppercase">OPTION B</span>
                                    {gameState.phase === "revealing" && (
                                        <Badge isHuman={gameState.lastResult?.correctChoice === 'B'} />
                                    )}
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center font-['JetBrains_Mono'] text-sm md:text-base text-gray-200 leading-relaxed min-h-[100px]">
                                    {gameState.currentRound?.answerB}
                                </div>
                                {gameState.phase === "betting" && !isAnswerer && selectedBet && (
                                    <button 
                                        onClick={() => handleBet('B')}
                                        className="mt-4 w-full py-3 bg-purple-900/30 border border-purple-500/50 hover:bg-purple-500 text-purple-400 hover:text-white font-bold rounded flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                    >
                                        BET ${selectedBet}
                                    </button>
                                )}
                             </div>
                         </div>
                     </motion.div>
                 )}
            </AnimatePresence>

        </div>

        {/* Players */}
        {sortedPlayers.map((player: any, index: number) => {
           const isMe = player.userId === userId
           const isTurn = gameState.currentRound?.answerer === player.userId
           const posClass = getSeatPosition(index)
           
           // Mock Avatar based on index
           const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`

           return (
             <motion.div 
               key={player.userId} 
               layout
               className={`absolute ${posClass} flex flex-col items-center z-30 w-32`}
             >
                 {/** BET STATUS CHIP **/}
                 {gameState.bets?.[player.userId] && (
                     <motion.div 
                        initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
                        className="mb-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold text-xs px-3 py-1 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.6)] border border-yellow-200"
                     >
                        ${gameState.bets[player.userId].amount}
                     </motion.div>
                 )}

                 {/** AVATAR CIRCLE **/}
                 <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] transition-all duration-500
                    ${isTurn ? 'bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.6)] scale-110' : 'bg-gradient-to-b from-gray-700 to-gray-900'}
                    ${isMe ? 'ring-2 ring-cyan-500 ring-offset-4 ring-offset-[#020610]' : ''}
                 `}>
                     <div className="w-full h-full rounded-full bg-[#050b14] overflow-hidden relative">
                         {/* Image */}
                         <img src={avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                         
                         {/* Glitch Overlay (optional CSS could go here) */}
                         {!player.isConnected && (
                             <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                 <span className="text-[8px] text-red-500 font-mono">DISCONNECTED</span>
                             </div>
                         )}
                     </div>
                 </div>

                 {/** INFO CARD **/}
                 <div className="mt-[-10px] relative z-10 bg-[#08101f]/90 border border-slate-700 backdrop-blur-md px-4 py-2 rounded-lg text-center shadow-lg w-full">
                     <div className={`text-xs font-bold truncate ${isMe ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {player.name}
                     </div>
                     <div className="font-mono text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <span className="text-yellow-500">$</span>
                        {(player.points / 1000).toFixed(2)}K
                     </div>
                 </div>

             </motion.div>
           )
        })}
      </div>

      {/* Bottom Interface - Chip Selection */}
      <div className="absolute bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-auto">
          {gameState.phase === "betting" && !isAnswerer && !hasBet && (
             <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-cyan-500/20 px-6 py-4 rounded-2xl flex gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                 <div className="flex flex-col justify-center items-end mr-4 border-r border-white/10 pr-4">
                     <span className="text-[10px] text-slate-400 uppercase tracking-widest">Wager</span>
                     <span className="text-xl text-white font-bold font-mono">AMOUNT</span>
                 </div>
                 {[10, 50, 100, 500, 'MAX'].map((val, idx) => {
                     const amt = val === 'MAX' ? currentPlayer?.points : (val as number)
                     return (
                         <button
                            key={idx}
                            onClick={() => setSelectedBet(amt)}
                            disabled={currentPlayer?.points < amt}
                            className={`group relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all
                                ${selectedBet === amt 
                                    ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-110' 
                                    : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'}
                            `}
                         >
                             <span className="relative z-10 font-bold text-xs">{val}</span>
                             {/* Chip Texture */}
                             <div className="absolute inset-1 rounded-full border border-dashed border-white/10"></div>
                         </button>
                     )
                 })}
                 <Button 
                    className="ml-4 h-14 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:shadow-none"
                    disabled={!selectedBet}
                 >
                    PLACE BET
                 </Button>
             </div>
          )}
          
          {gameState.phase === "betting" && hasBet && (
             <motion.div 
               initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
               className="bg-black/80 text-cyan-400 border border-cyan-500 px-8 py-3 rounded-full font-mono text-sm tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)]"
             >
               {`BET LOCK_CONFIRMED: $${myBet?.amount}`}
             </motion.div>
          )}

          {gameState.phase === "revealing" && gameState.lastResult?.winners && (
              <motion.div 
                 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                 className="flex flex-col items-center"
              >
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-10 py-4 rounded-xl font-bold text-xl shadow-[0_0_50px_rgba(234,179,8,0.5)] border-2 border-white/20">
                      WINNERS: {gameState.lastResult.winners.map((w: any) => w.name).join(', ')}
                  </div>
              </motion.div>
          )}
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-6 left-6 z-40 hidden md:block">
          <Button 
            variant="ghost" 
            onClick={handleExitGame}
            className="border border-slate-700 bg-black/40 text-slate-400 hover:text-white hover:border-white hover:bg-red-900/20 transition-all"
          >
              <ExitIcon />
              <span className="ml-2 sr-only">Exit</span>
          </Button>
      </div>
      
      <div className="absolute bottom-6 right-6 z-40 hidden md:block">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="border border-slate-700 bg-black/40 text-slate-400 hover:text-white hover:border-white transition-all">
                  <SettingsIcon />
                  <span className="ml-2 sr-only">Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f172a] border-slate-700 text-slate-200">
              <DialogHeader>
                <DialogTitle>Game Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="sound-mode">Sound Effects</Label>
                  <Switch id="sound-mode" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between">
                      <Label>Music Volume</Label>
                      <span className="text-xs text-slate-400">{musicVolume}%</span>
                   </div>
                   <Slider 
                      value={musicVolume} 
                      max={100} 
                      step={1} 
                      onValueChange={setMusicVolume}
                      className="py-4"
                   />
                </div>
              </div>
            </DialogContent>
          </Dialog>
      </div>

    </div>
  )
}

// -- Subcomponents --

function Badge({ isHuman }: { isHuman: boolean }) {
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isHuman ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'}`}>
            {isHuman ? 'HUMAN' : 'AI BOT'}
        </span>
    )
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
    )
}

function SettingsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}

function ExitIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
    )
}

"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useSocket } from "@/components/providers/socket-provider"
import { GameCanvas } from "./game-canvas"
import { GameUI } from "./game-ui"

export default function GameClient({ gameId }: { gameId: string }) {
  const { socket, isConnected } = useSocket()
  const { data: session } = useSession()
  const [gameState, setGameState] = useState<any>(null)
  const [joinPending, setJoinPending] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinStatus, setJoinStatus] = useState<'idle' | 'pending' | 'approved' | 'denied'>('idle')

  useEffect(() => {
    if (!socket || !isConnected || !session?.user?.id) return

    setJoinPending(true)
    setJoinError(null)

    // When server responds with joined game state
    const onJoined = (payload: any) => {
      setGameState(payload.game || payload)
      setJoinPending(false)
      setJoinStatus('approved')
    }

    const onPoolCreated = (payload: any) => {
      setGameState(payload.game || payload)
      setJoinPending(false)
      setJoinStatus('approved')
    }

    const onRoundStarted = (payload: any) => {
      setGameState(prev => ({
        ...(prev || {}),
        phase: payload.phase,
        roundNumber: payload.roundNumber,
        currentRound: {
          ...(prev?.currentRound || {}),
          question: payload.question,
          answerer: payload.answererId
        },
        timer: payload.timer
      }))
    }

    const onAnswerSubmitted = (payload: any) => {
      setGameState(prev => ({
        ...(prev || {}),
        phase: payload.phase,
        currentRound: { ...(prev?.currentRound || {}), answerA: payload.answerA, answerB: payload.answerB },
        timer: payload.timer
      }))
    }

    const onBetPlaced = (payload: any) => {
      setGameState(prev => ({ ...(prev || {}), phase: payload.phase, betsCount: payload.betsCount, timer: payload.timer }))
    }

    const onRoundRevealed = (payload: any) => {
      setGameState(prev => ({
        ...(prev || {}),
        phase: 'revealing',
        currentRound: {
          ...(prev?.currentRound || {}),
          correctChoice: payload.correctChoice,
          humanAnswer: payload.humanAnswer,
          aiAnswer: payload.aiAnswer
        },
        lastResult: {
          correctChoice: payload.correctChoice,
          humanAnswer: payload.humanAnswer,
          aiAnswer: payload.aiAnswer,
          winners: payload.winners || []
        },
        players: payload.players
      }))
    }

    const onGameFinished = (payload: any) => {
      setGameState(prev => ({ ...(prev || {}), phase: 'finished', finalRankings: payload.finalRankings }))
    }

    const onReconnected = (payload: any) => {
      setGameState(payload.game || payload)
      setJoinPending(false)
      setJoinStatus('approved')
    }

    const onGamePaused = (payload: any) => {
      setGameState(prev => ({ ...(prev || {}), paused: true, timer: { ...(prev?.timer || {}), timerRemainingMs: payload.timerRemainingMs, timerPaused: true } }))
    }

    const onGameResumed = (payload: any) => {
      setGameState(prev => ({ ...(prev || {}), paused: false, timer: { ...(prev?.timer || {}), timerRemainingMs: payload.timerRemainingMs, timerPaused: false } }))
    }

    const onTimerUpdated = (payload: any) => {
      setGameState(prev => ({ ...(prev || {}), timer: { ...(prev?.timer || {}), timerRemainingMs: payload.timerRemainingMs } }))
    }

    const onError = (payload: any) => {
      const message = payload?.message || "Failed to join game"
      setJoinError(message)
      setJoinPending(false)
    }

    const onPlayerJoined = (payload: any) => {
      setGameState(prev => {
        const players = prev?.players ? [...prev.players] : []
        if (!players.find((p: any) => p.userId === payload.userId)) {
          players.push({ userId: payload.userId, name: payload.playerName, points: 1000, isConnected: true })
        }
        return { ...(prev || {}), players }
      })
    }

    const onPlayerDisconnected = (payload: any) => {
      setGameState(prev => {
        if (!prev?.players) return prev
        const players = prev.players.map((p: any) => p.userId === payload.userId ? { ...p, isConnected: false } : p)
        return { ...(prev || {}), players }
      })
    }

    socket.on('joined_game', onJoined)
    socket.on('pool_created', onPoolCreated)
    socket.on('round_started', onRoundStarted)
    socket.on('answer_submitted', onAnswerSubmitted)
    socket.on('bet_placed', onBetPlaced)
    socket.on('round_revealed', onRoundRevealed)
    socket.on('game_finished', onGameFinished)
    socket.on('reconnected', onReconnected)
    socket.on('player_joined', onPlayerJoined)
    socket.on('player_disconnected', onPlayerDisconnected)
    socket.on('error', onError)
    socket.on('game_paused', onGamePaused)
    socket.on('game_resumed', onGameResumed)
    socket.on('timer_updated', onTimerUpdated)

    // Join pool/game AFTER listeners are registered
    socket.emit("join_game", {
      gameId,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Player"
    })

    const timeout = setTimeout(() => {
      setJoinError('No response from game server')
      setJoinPending(false)
    }, 5000)

    // Cleanup listeners on unmount
    return () => {
      socket.off('joined_game', onJoined)
      socket.off('pool_created', onPoolCreated)
      socket.off('round_started', onRoundStarted)
      socket.off('answer_submitted', onAnswerSubmitted)
      socket.off('bet_placed', onBetPlaced)
      socket.off('round_revealed', onRoundRevealed)
      socket.off('game_finished', onGameFinished)
      socket.off('reconnected', onReconnected)
      socket.off('player_joined', onPlayerJoined)
      socket.off('player_disconnected', onPlayerDisconnected)
      socket.off('error', onError)
      socket.off('game_paused', onGamePaused)
      socket.off('game_resumed', onGameResumed)
      socket.off('timer_updated', onTimerUpdated)
      clearTimeout(timeout)
    }
  }, [socket, isConnected, gameId, session])

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg">Connecting to game server...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <p>Please sign in to play</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <GameCanvas gameState={gameState} />
      </div>

      {/* 2D Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-auto">
        <GameUI gameState={gameState} gameId={gameId} joinPending={joinPending} joinError={joinError} joinStatus={joinStatus} />
      </div>
    </div>
  )
}

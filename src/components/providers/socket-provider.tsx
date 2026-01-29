"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io as ClientIO, Socket } from "socket.io-client"
import { useSession } from "next-auth/react"

type SocketContextType = {
  socket: Socket | null
  isConnected: boolean
  connectError: string | null
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectError: null,
})

export const useSocket = () => {
  return useContext(SocketContext)
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    // Don't connect without authentication
    if (!session?.user) {
      return
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3003"

    // Get JWT token from session
    const token = (session as any).accessToken || (session as any).token

    const socketInstance = ClientIO(SOCKET_URL, {
      auth: {
        token: token || ''
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000
    })

    socketInstance.on("connect", () => {
      setIsConnected(true)
      setConnectError(null)
      console.log("✅ Socket connected!")
    })

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false)
      console.log("❌ Socket disconnected:", reason)
    })

    socketInstance.on("connect_error", (error: any) => {
      const msg = error?.message || String(error)
      setConnectError(msg)
      console.error("❌ Socket connection error:", msg)
    })

    socketInstance.on("reconnected", (data) => {
      console.log("🔄 Reconnected to pool:", data.poolId)
    })

    socketInstance.on("server_shutdown", (data) => {
      console.warn("⚠️ Server maintenance:", data.message)
    })

    socketInstance.on("error", (error) => {
      console.error("❌ Socket error:", error.message)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
    }
  }, [session])

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectError }}>
      {children}
    </SocketContext.Provider>
  )
}


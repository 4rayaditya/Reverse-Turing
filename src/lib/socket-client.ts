import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3003";

let socket: Socket | null = null;

export const getSocket = (token?: string) => {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      auth: {
        token: token || '' // JWT token from NextAuth
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, attempt to reconnect
        socket?.connect();
      }
    });

    socket.on('reconnected', (data) => {
      console.log('[Socket] Reconnected to pool:', data.poolId);
    });

    socket.on('server_shutdown', (data) => {
      console.warn('[Socket] Server shutting down:', data.message);
      // Could show user notification here
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error.message);
      // Could show user notification here
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};


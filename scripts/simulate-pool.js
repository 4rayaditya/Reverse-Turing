require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const { io } = require('socket.io-client')

const prisma = new PrismaClient()
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.PORT || 3003}`
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
const SIM_POOL_ID = process.env.SIM_POOL_ID || null

if (!NEXTAUTH_SECRET) {
  console.error('NEXTAUTH_SECRET not set in .env')
  process.exit(1)
}

async function main() {
  // Get up to 6 test users
  const users = await prisma.user.findMany({ take: 6 })
  if (!users || users.length === 0) {
    console.error('No users found in database. Run scripts/create-test-users.js first.')
    process.exit(1)
  }

  console.log('Found users:')
  users.forEach(u => console.log(`- ${u.id} ${u.email || u.username}`))

  const clients = []

  // Helper to create socket client with JWT auth
  function createClient(user) {
    const token = jwt.sign({ sub: user.id, email: user.email || user.username, name: user.name || user.username }, NEXTAUTH_SECRET, { expiresIn: '1h' })
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'], timeout: 20000 })
    socket.user = user
    socket.on('connect', () => console.log(`[client ${user.username}] connected ${socket.id}`))
    socket.on('connect_error', (err) => console.error(`[client ${user.username}] connect_error`, err.message))
    socket.on('disconnect', (reason) => console.log(`[client ${user.username}] disconnected: ${reason}`))
    socket.on('pool_created', (p) => console.log(`[client ${user.username}] pool_created:`, p.poolId))
    socket.on('joined_game', (p) => console.log(`[client ${user.username}] joined_game:`, p.poolId))
    socket.on('player_joined', (p) => console.log(`[client ${user.username}] player_joined:`, p))
    socket.on('round_started', (p) => console.log(`[client ${user.username}] round_started:`, p))
    socket.on('answer_submitted', (p) => console.log(`[client ${user.username}] answer_submitted:`, p))
    socket.on('bet_placed', (p) => console.log(`[client ${user.username}] bet_placed:`, p))
    socket.on('round_revealed', (p) => console.log(`[client ${user.username}] round_revealed:`, p))
    socket.on('game_finished', (p) => console.log(`[client ${user.username}] game_finished:`, p))
    socket.on('error', (e) => console.error(`[client ${user.username}] error:`, e))
    return socket
  }

  // Create clients
  for (let i = 0; i < users.length; i++) {
    const c = createClient(users[i])
    clients.push(c)
    // small delay to avoid spamming
    await new Promise(r => setTimeout(r, 200))
  }

  // Wait for first client to connect
  await new Promise(r => setTimeout(r, 1500))

  const creator = clients[0]
  const creatorUser = creator.user

  let poolId = null
  if (SIM_POOL_ID) {
    poolId = SIM_POOL_ID
    console.log(`[sim] Using existing pool ${poolId}`)
  } else {
    // Create pool by emitting create_pool
    console.log(`[sim] Creator ${creatorUser.username} creating pool`)
    creator.emit('create_pool', { userId: creatorUser.id })

    // Wait for pool_created
    const poolPromise = new Promise((resolve) => {
      creator.on('pool_created', (payload) => {
        poolId = payload.poolId
        console.log('[sim] pool created:', poolId)
        resolve(poolId)
      })
      // fallback timeout
      setTimeout(() => resolve(null), 4000)
    })

    await poolPromise
    if (!poolId) {
      console.error('[sim] Pool not created; aborting')
      process.exit(1)
    }
  }

  // Other clients join
  for (let i = 1; i < clients.length; i++) {
    const sock = clients[i]
    const user = sock.user
    console.log(`[sim] ${user.username} joining ${poolId}`)
    sock.emit('join_game', { gameId: poolId, userId: user.id, userName: user.name || user.username })
    await new Promise(r => setTimeout(r, 400))
  }

  console.log('[sim] All join requests sent. Listening for server events for 15 seconds...')
  await new Promise(r => setTimeout(r, 15000))

  console.log('[sim] Disconnecting clients...')
  clients.forEach(c => c.disconnect())
  await prisma.$disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('simulate-pool failed:', err)
  process.exit(1)
})

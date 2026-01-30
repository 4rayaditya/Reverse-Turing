import { PrismaClient } from "@prisma/client"

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient = globalThis.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

export const db = prisma
export { prisma }

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma

// runWithReconnect: retry once after recreating Prisma client when prepared-statement errors occur
export async function runWithReconnect<T>(operation: (p: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await operation(prisma)
  } catch (err: any) {
    const msg = err && (err.message || String(err)) || ''
    const code = err && err.code
    if (String(msg).toLowerCase().includes('prepared statement') || code === '42P05') {
      console.warn('[DB] Detected prepared-statement error in db.ts, reconnecting Prisma client...')
      try {
        await prisma.$disconnect()
      } catch (e) {
        console.warn('[DB] Error disconnecting prisma:', e)
      }
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      })
      if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma
      // retry once
      return await operation(prisma)
    }
    throw err
  }
}

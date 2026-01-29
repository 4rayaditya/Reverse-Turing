import { authOptions } from "@/lib/auth"
import NextAuth from "next-auth"

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

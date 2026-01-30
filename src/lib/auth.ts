import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db, runWithReconnect } from "@/lib/db"
import { compare } from "bcryptjs"
import { z } from "zod"
import jwt from "jsonwebtoken"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Sign in",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "hello@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] Authorize called with email:", credentials?.email)
        
        if (!credentials?.email || !credentials.password) {
          console.log("[Auth] Missing credentials")
          return null
        }

        try {
          console.log("[Auth] Attempting database connection...")
          console.log("[Auth] Prisma client available:", !!db)
          
          // Test connection first (use reconnect-aware helper)
          await runWithReconnect(p => p.$queryRaw`SELECT 1` as any)
          console.log("[Auth] Database connection test passed")
          
          const user = await runWithReconnect(p => p.user.findUnique({
            where: {
              email: credentials.email,
            },
          }))

          if (!user) {
            console.log("[Auth] User not found:", credentials.email)
            return null
          }

          console.log("[Auth] User found, checking password...")
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("[Auth] Invalid password for:", credentials.email)
            return null
          }

          console.log("[Auth] Authentication successful for:", credentials.email)
          return {
            id: user.id,
            email: user.email,
            name: user.username,
            username: user.username,
            isAdmin: user.isAdmin,
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStack = error instanceof Error ? error.stack : undefined
          
          console.error("[Auth] Database error:", errorMessage)
          if (errorStack) console.error("[Auth] Error stack:", errorStack)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.username as string
        session.user.email = token.email as string
        ;(session.user as any).isAdmin = token.isAdmin as boolean
        
        // Generate JWT token for Socket.io authentication
        const accessToken = jwt.sign(
          {
            sub: token.id as string,
            email: token.email as string,
            name: token.username as string,
            isAdmin: token.isAdmin as boolean
          },
          process.env.NEXTAUTH_SECRET!,
          { expiresIn: '7d' }
        );
        
        (session as any).accessToken = accessToken;
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.username = user.username
        token.isAdmin = user.isAdmin
      }
      return token
    },
  },
}


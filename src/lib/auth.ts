import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
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
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          username: user.username,
          isAdmin: user.isAdmin,
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


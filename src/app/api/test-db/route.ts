import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log("[DB Test] Starting database connection test...")

    // Test basic connection
    await db.$queryRaw`SELECT 1 as test`
    console.log("[DB Test] Basic connection successful")

    // Test user lookup
    const user = await db.user.findUnique({
      where: { email: 'ray@gmail.com' },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        password: {
          select: {
            length: true
          }
        }
      }
    })

    console.log("[DB Test] User lookup result:", user ? "Found" : "Not found")

    if (user) {
      console.log("[DB Test] User details:", {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        passwordLength: user.password.length
      })
    }

    return NextResponse.json({
      success: true,
      user: user ? {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        passwordLength: user.password.length
      } : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[DB Test] Error:", error.message)
    console.error("[DB Test] Stack:", error.stack)

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
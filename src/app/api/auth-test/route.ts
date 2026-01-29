import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { compare } from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    console.log('[Auth Test] Starting...')
    console.log('[Auth Test] EMAIL_PROVIDED:', !!email)
    console.log('[Auth Test] PASSWORD_PROVIDED:', !!password)
    
    // Test DB connection
    await db.$queryRaw`SELECT 1`
    console.log('[Auth Test] DB connection: SUCCESS')
    
    // Find user
    const user = await db.user.findUnique({
      where: { email }
    })
    
    console.log('[Auth Test] User found:', !!user)
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found',
        email 
      })
    }
    
    // Check password
    const isValid = await compare(password, user.password)
    console.log('[Auth Test] Password valid:', isValid)
    
    return NextResponse.json({ 
      success: isValid,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin
      },
      passwordValid: isValid
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[Auth Test] ERROR:', err.message)
    console.error('[Auth Test] STACK:', err.stack)
    
    return NextResponse.json({ 
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}

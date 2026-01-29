import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { compare } from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let pool: Pool | null = null
  
  try {
    const { email, password } = await request.json()
    
    console.log('[Direct Auth] Starting...')
    
    // Create direct PostgreSQL connection
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
    console.log('[Direct Auth] Connection string exists:', !!connectionString)
    
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    })
    
    console.log('[Direct Auth] Pool created')
    
    // Test connection
    const client = await pool.connect()
    console.log('[Direct Auth] Connected to database')
    
    // Find user
    const result = await client.query(
      'SELECT id, email, username, password, "isAdmin" FROM "User" WHERE email = $1',
      [email]
    )
    
    client.release()
    console.log('[Direct Auth] Query executed, rows:', result.rows.length)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      })
    }
    
    const user = result.rows[0]
    
    // Check password
    const isValid = await compare(password, user.password)
    console.log('[Direct Auth] Password valid:', isValid)
    
    return NextResponse.json({ 
      success: isValid,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin
      }
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[Direct Auth] ERROR:', err.message)
    
    return NextResponse.json({ 
      success: false,
      error: err.message
    }, { status: 500 })
    
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

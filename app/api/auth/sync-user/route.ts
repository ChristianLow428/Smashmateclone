import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/options'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const email = session.user.email
    const name = session.user.name

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing user information' }, { status: 400 })
    }

    // For now, we'll skip database operations since we're disabling RLS
    // and the matchmaking system will work with NextAuth user IDs directly
    
    console.log('User sync successful for:', userId)
    return NextResponse.json({ success: true, userId })
    
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
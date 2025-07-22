import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/options'

const ADMIN_EMAILS = [
  'christianlow428@gmail.com',
  'smallleft14@gmail.com'
] // Add your admin emails here

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users from profiles table
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()

    // Delete user's rating history first
    const { error: historyError } = await supabase
      .from('rating_history')
      .delete()
      .or(`player_id.eq.${userId},opponent_id.eq.${userId}`)

    if (historyError) {
      console.error('Error deleting user rating history:', historyError)
      return NextResponse.json({ error: 'Failed to delete user rating history' }, { status: 500 })
    }

    // Delete user's match history
    const { error: matchesError } = await supabase
      .from('matches')
      .delete()
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)

    if (matchesError) {
      console.error('Error deleting user matches:', matchesError)
      // Don't fail if matches deletion fails
    }

    // Delete user's ratings
    const { error: ratingsError } = await supabase
      .from('player_ratings')
      .delete()
      .eq('player_id', userId)

    if (ratingsError) {
      console.error('Error deleting user ratings:', ratingsError)
      return NextResponse.json({ error: 'Failed to delete user ratings' }, { status: 500 })
    }

    // Delete user's tournament participation
    const { error: participationError } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('player_id', userId)

    if (participationError) {
      console.error('Error deleting user tournament participation:', participationError)
      // Don't fail if tournament participation deletion fails
    }

    // Delete user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
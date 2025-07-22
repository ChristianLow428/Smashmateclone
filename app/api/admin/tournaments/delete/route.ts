import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/options'

const ADMIN_EMAILS = [
  'christianlow428@gmail.com',
  'smallleft14@gmail.com'
] // Add your admin emails here

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await request.json()

    // Delete tournament matches first
    const { error: matchesError } = await supabase
      .from('tournament_matches')
      .delete()
      .eq('tournament_id', tournamentId)

    if (matchesError) {
      console.error('Error deleting tournament matches:', matchesError)
      return NextResponse.json({ error: 'Failed to delete tournament matches' }, { status: 500 })
    }

    // Delete tournament participants
    const { error: participantsError } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('tournament_id', tournamentId)

    if (participantsError) {
      console.error('Error deleting tournament participants:', participantsError)
      return NextResponse.json({ error: 'Failed to delete tournament participants' }, { status: 500 })
    }

    // Delete tournament
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId)

    if (tournamentError) {
      console.error('Error deleting tournament:', tournamentError)
      return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 })
    }

    // Delete tournament from Discord messages table
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('discord_message_id', tournamentId)

    if (messagesError) {
      console.error('Error deleting tournament messages:', messagesError)
      // Don't fail if messages deletion fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete tournament API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
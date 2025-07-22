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
    console.log('Attempting to delete tournament:', tournamentId)

    // First check if tournament exists
    const { data: existingTournament, error: checkError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('id', tournamentId)
      .single()

    if (checkError) {
      console.error('Error checking tournament existence:', checkError)
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Delete tournament from tournaments table
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId)

    if (tournamentError) {
      console.error('Error deleting tournament:', tournamentError)
      return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 })
    }

    console.log('Tournament deleted successfully:', tournamentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete tournament API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
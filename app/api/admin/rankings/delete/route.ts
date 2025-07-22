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

    const { playerId } = await request.json()

    // Delete player's ratings
    const { error: ratingsError } = await supabase
      .from('player_ratings')
      .delete()
      .eq('player_id', playerId)

    if (ratingsError) {
      console.error('Error deleting player ratings:', ratingsError)
      return NextResponse.json({ error: 'Failed to delete player ratings' }, { status: 500 })
    }

    // Delete player's rating history
    const { error: historyError } = await supabase
      .from('rating_history')
      .delete()
      .eq('player_id', playerId)

    if (historyError) {
      console.error('Error deleting player rating history:', historyError)
      return NextResponse.json({ error: 'Failed to delete player rating history' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete ranking API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
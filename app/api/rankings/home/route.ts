import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get top 10 players by rating, excluding test accounts and requiring at least one game played
    const { data: allRatings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .gt('games_played', 0) // Only show players who have played at least one game
      .order('rating', { ascending: false })
      .limit(10)

    if (ratingsError) {
      console.error('Error fetching player ratings:', ratingsError)
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
    }

    // Get display names for all players
    const playersWithNames = await Promise.all(
      (allRatings || []).map(async (player) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('email', player.player_id)
          .single()

        return {
          ...player,
          display_name: profile?.name || player.player_id
        }
      })
    )
    
    // Add cache-busting headers
    const response = NextResponse.json(playersWithNames)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error in home rankings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
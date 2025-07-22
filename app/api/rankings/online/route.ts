import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    console.log('=== Online Rankings API called ===')
    
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get top 10 players by rating, requiring at least one game played
    const { data: allRatings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .gt('games_played', 0) // Only show players who have played at least one game
      .order('rating', { ascending: false })
      .limit(10)

    console.log('Top 10 ratings from DB:', allRatings)

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

        console.log(`Profile for ${player.player_id}:`, profile)

        return {
          ...player,
          display_name: profile?.name || player.player_id
        }
      })
    )

    console.log('Final top 10 players with names:', playersWithNames)
    
    // Add cache-busting headers
    const response = NextResponse.json(playersWithNames)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error in online rankings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
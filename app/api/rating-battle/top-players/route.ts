import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    console.log('=== Top Players API called ===')
    
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get top players
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10)

    console.log('Raw ratings data from DB:', ratings)
    console.log('Number of ratings found:', ratings?.length || 0)
    
    // Also check all ratings to see what's in the database
    const { data: allRatings, error: allRatingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
    
    console.log('All ratings in DB:', allRatings)
    console.log('Number of all ratings:', allRatings?.length || 0)

    if (ratingsError) {
      console.error('Error fetching player ratings:', ratingsError)
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
    }

    // Get display names for all players
    const playersWithNames = await Promise.all(
      ratings.map(async (player) => {
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

    console.log('Final players with names:', playersWithNames)
    
    // Add cache-busting headers
    const response = NextResponse.json(playersWithNames)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error in top players API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
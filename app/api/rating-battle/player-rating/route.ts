import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get player rating
    const { data: rating, error: ratingError } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', playerId)
      .single()

    if (ratingError && ratingError.code !== 'PGRST116') {
      console.error('Error fetching player rating:', ratingError)
      return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 })
    }

    if (!rating) {
      return NextResponse.json(null)
    }

    // Get display name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('email', playerId)
      .single()

    const playerWithName = {
      ...rating,
      display_name: profile?.name || playerId
    }

    return NextResponse.json(playerWithName)
  } catch (error) {
    console.error('Error in player rating API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
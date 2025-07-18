import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { player1Email, player2Email, winner } = await request.json()
    
    console.log('Test rating update:', { player1Email, player2Email, winner })
    
    // Get current ratings
    const { data: player1Rating } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', player1Email)
      .single()
    
    const { data: player2Rating } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', player2Email)
      .single()
    
    if (!player1Rating || !player2Rating) {
      return NextResponse.json({ error: 'Player ratings not found' }, { status: 404 })
    }
    
    console.log('Current ratings:', { player1Rating, player2Rating })
    
    // Calculate new ratings
    const player1OldRating = player1Rating.rating
    const player2OldRating = player2Rating.rating
    
    const player1Result = winner === 0 ? 'win' : 'loss'
    const player2Result = winner === 1 ? 'win' : 'loss'
    
    // Calculate ELO changes
    const player1RatingChange = calculateELOChange(
      player1OldRating,
      player2OldRating,
      player1Result,
      player1Rating.games_played
    )
    
    const player2RatingChange = calculateELOChange(
      player2OldRating,
      player1OldRating,
      player2Result,
      player2Rating.games_played
    )
    
    const player1NewRating = Math.max(100, player1OldRating + player1RatingChange)
    const player2NewRating = Math.max(100, player2OldRating + player2RatingChange)
    
    console.log('Calculated changes:', {
      player1OldRating,
      player1NewRating,
      player1RatingChange,
      player2OldRating,
      player2NewRating,
      player2RatingChange
    })
    
    // Update ratings in database
    const { error: player1Error } = await supabase
      .from('player_ratings')
      .update({
        rating: player1NewRating,
        games_played: player1Rating.games_played + 1,
        wins: player1Rating.wins + (player1Result === 'win' ? 1 : 0),
        losses: player1Rating.losses + (player1Result === 'loss' ? 1 : 0)
      })
      .eq('player_id', player1Email)
    
    const { error: player2Error } = await supabase
      .from('player_ratings')
      .update({
        rating: player2NewRating,
        games_played: player2Rating.games_played + 1,
        wins: player2Rating.wins + (player2Result === 'win' ? 1 : 0),
        losses: player2Rating.losses + (player2Result === 'loss' ? 1 : 0)
      })
      .eq('player_id', player2Email)
    
    if (player1Error || player2Error) {
      console.error('Error updating ratings:', { player1Error, player2Error })
      return NextResponse.json({ error: 'Failed to update ratings' }, { status: 500 })
    }
    
    // Add rating history
    const matchId = `test-${Date.now()}`
    
    const { error: history1Error } = await supabase
      .from('rating_history')
      .insert({
        player_id: player1Email,
        match_id: matchId,
        old_rating: player1OldRating,
        new_rating: player1NewRating,
        rating_change: player1RatingChange,
        opponent_id: player2Email,
        opponent_old_rating: player2OldRating,
        opponent_new_rating: player2NewRating,
        result: player1Result
      })
    
    const { error: history2Error } = await supabase
      .from('rating_history')
      .insert({
        player_id: player2Email,
        match_id: matchId,
        old_rating: player2OldRating,
        new_rating: player2NewRating,
        rating_change: player2RatingChange,
        opponent_id: player1Email,
        opponent_old_rating: player1OldRating,
        opponent_new_rating: player1NewRating,
        result: player2Result
      })
    
    if (history1Error || history2Error) {
      console.error('Error adding rating history:', { history1Error, history2Error })
    }
    
    return NextResponse.json({
      success: true,
      player1: {
        email: player1Email,
        oldRating: player1OldRating,
        newRating: player1NewRating,
        ratingChange: player1RatingChange,
        result: player1Result
      },
      player2: {
        email: player2Email,
        oldRating: player2OldRating,
        newRating: player2NewRating,
        ratingChange: player2RatingChange,
        result: player2Result
      }
    })
    
  } catch (error) {
    console.error('Error in test rating update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateELOChange(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss',
  playerGamesPlayed: number = 0,
  kFactor: number = 32
): number {
  const expectedWinRate = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const actualWinRate = result === 'win' ? 1 : 0
  
  // Adjust K-factor based on games played
  const adjustedKFactor = calculateAdjustedKFactor(playerRating, opponentRating, playerGamesPlayed, kFactor)
  
  const ratingChange = Math.round(adjustedKFactor * (actualWinRate - expectedWinRate))
  return ratingChange
}

function calculateAdjustedKFactor(
  playerRating: number,
  opponentRating: number,
  playerGamesPlayed: number,
  baseKFactor: number = 32
): number {
  // Provisional rating adjustment (first 10 games)
  if (playerGamesPlayed < 10) {
    return baseKFactor * 1.5
  }
  
  // Established player adjustment
  if (playerGamesPlayed >= 10) {
    return baseKFactor
  }
  
  return baseKFactor
} 
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ELO rating calculation functions
function calculateExpectedWinRate(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

function calculateELOChange(
  playerRating: number, 
  opponentRating: number, 
  result: 'win' | 'loss', 
  playerGamesPlayed: number = 0,
  kFactor: number = 32
): number {
  const expectedWinRate = calculateExpectedWinRate(playerRating, opponentRating)
  const actualResult = result === 'win' ? 1 : 0
  const ratingChange = Math.round(kFactor * (actualResult - expectedWinRate))
  return ratingChange
}

function calculateAdjustedKFactor(
  playerRating: number, 
  opponentRating: number, 
  playerGamesPlayed: number, 
  baseKFactor: number = 32
): number {
  let kFactor = baseKFactor
  
  // Adjust K-factor based on player experience
  if (playerGamesPlayed < 10) {
    kFactor *= 1.5 // Higher K-factor for new players
  } else if (playerGamesPlayed > 50) {
    kFactor *= 0.8 // Lower K-factor for experienced players
  }
  
  // Adjust K-factor based on rating difference
  const ratingDifference = Math.abs(playerRating - opponentRating)
  if (ratingDifference > 200) {
    kFactor *= 0.9 // Lower K-factor for mismatched opponents
  }
  
  return Math.round(kFactor)
}

export async function POST(request: NextRequest) {
  try {
    const { player1Id, player2Id, matchId, winner } = await request.json()
    
    console.log(`=== RATING API CALLED ===`)
    console.log(`Processing rating match result: ${player1Id} vs ${player2Id}, winner: ${winner}`)
    console.log(`Match ID: ${matchId}`)
    
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get current ratings before processing the match
    console.log(`Fetching player 1 rating for: ${player1Id}`)
    const { data: player1Data, error: player1Error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', player1Id)
      .single()
    
    if (player1Error && player1Error.code !== 'PGRST116') {
      console.error('Error fetching player 1 rating:', player1Error)
    }
    
    console.log(`Fetching player 2 rating for: ${player2Id}`)
    const { data: player2Data, error: player2Error } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('player_id', player2Id)
      .single()
    
    if (player2Error && player2Error.code !== 'PGRST116') {
      console.error('Error fetching player 2 rating:', player2Error)
    }
    
    const player1CurrentRating = player1Data?.rating || 1000
    const player2CurrentRating = player2Data?.rating || 1000
    const player1GamesPlayed = player1Data?.games_played || 0
    const player2GamesPlayed = player2Data?.games_played || 0
    
    console.log(`Current ratings - Player1 (${player1Id}): ${player1CurrentRating}, Player2 (${player2Id}): ${player2CurrentRating}`)
    
    // Calculate rating changes using enhanced ELO system
    const player1KFactor = calculateAdjustedKFactor(player1CurrentRating, player2CurrentRating, player1GamesPlayed)
    const player2KFactor = calculateAdjustedKFactor(player2CurrentRating, player1CurrentRating, player2GamesPlayed)
    
    const player1Result = winner === 0 ? 'win' : 'loss'
    const player2Result = winner === 1 ? 'win' : 'loss'
    
    const player1RatingChange = calculateELOChange(player1CurrentRating, player2CurrentRating, player1Result, player1GamesPlayed, player1KFactor)
    const player2RatingChange = calculateELOChange(player2CurrentRating, player1CurrentRating, player2Result, player2GamesPlayed, player2KFactor)
    
    const player1NewRating = Math.max(100, player1CurrentRating + player1RatingChange)
    const player2NewRating = Math.max(100, player2CurrentRating + player2RatingChange)
    
    console.log(`Rating changes - Player1: ${player1RatingChange} (${player1CurrentRating} -> ${player1NewRating}), Player2: ${player2RatingChange} (${player2CurrentRating} -> ${player2NewRating})`)
    
    // Update player 1 rating
    if (player1Data) {
      console.log(`Updating existing rating for player 1: ${player1Id}`)
      const { error: updateError } = await supabase
        .from('player_ratings')
        .update({
          rating: player1NewRating,
          games_played: player1GamesPlayed + 1,
          wins: player1Data.wins + (player1Result === 'win' ? 1 : 0),
          losses: player1Data.losses + (player1Result === 'loss' ? 1 : 0)
        })
        .eq('player_id', player1Id)
      
      if (updateError) {
        console.error('Error updating player 1 rating:', updateError)
        throw updateError
      }
    } else {
      console.log(`Creating new rating for player 1: ${player1Id}`)
      const { error: insertError } = await supabase
        .from('player_ratings')
        .insert({
          player_id: player1Id,
          rating: player1NewRating,
          games_played: 1,
          wins: player1Result === 'win' ? 1 : 0,
          losses: player1Result === 'loss' ? 1 : 0
        })
      
      if (insertError) {
        console.error('Error creating player 1 rating:', insertError)
        throw insertError
      }
    }
    
    // Update player 2 rating
    if (player2Data) {
      console.log(`Updating existing rating for player 2: ${player2Id}`)
      const { error: updateError } = await supabase
        .from('player_ratings')
        .update({
          rating: player2NewRating,
          games_played: player2GamesPlayed + 1,
          wins: player2Data.wins + (player2Result === 'win' ? 1 : 0),
          losses: player2Data.losses + (player2Result === 'loss' ? 1 : 0)
        })
        .eq('player_id', player2Id)
      
      if (updateError) {
        console.error('Error updating player 2 rating:', updateError)
        throw updateError
      }
    } else {
      console.log(`Creating new rating for player 2: ${player2Id}`)
      const { error: insertError } = await supabase
        .from('player_ratings')
        .insert({
          player_id: player2Id,
          rating: player2NewRating,
          games_played: 1,
          wins: player2Result === 'win' ? 1 : 0,
          losses: player2Result === 'loss' ? 1 : 0
        })
      
      if (insertError) {
        console.error('Error creating player 2 rating:', insertError)
        throw insertError
      }
    }
    
    // Add rating history for player 1 (optional - can be added later)
    try {
    console.log(`Adding rating history for player 1: ${player1Id}`)
    const { error: history1Error } = await supabase
      .from('rating_history')
      .insert({
        player_id: player1Id,
        match_id: matchId,
        old_rating: player1CurrentRating,
        new_rating: player1NewRating,
        rating_change: player1RatingChange,
        opponent_id: player2Id,
        opponent_old_rating: player2CurrentRating,
        opponent_new_rating: player2NewRating,
        result: player1Result
      })
    
    if (history1Error) {
      console.error('Error adding player 1 rating history:', history1Error)
        // Don't throw error for history - it's optional
      }
    } catch (historyError) {
      console.error('Error adding player 1 rating history:', historyError)
      // Don't throw error for history - it's optional
    }
    
    // Add rating history for player 2 (optional - can be added later)
    try {
    console.log(`Adding rating history for player 2: ${player2Id}`)
    const { error: history2Error } = await supabase
      .from('rating_history')
      .insert({
        player_id: player2Id,
        match_id: matchId,
        old_rating: player2CurrentRating,
        new_rating: player2NewRating,
        rating_change: player2RatingChange,
        opponent_id: player1Id,
        opponent_old_rating: player1CurrentRating,
        opponent_new_rating: player1NewRating,
        result: player2Result
      })
    
    if (history2Error) {
      console.error('Error adding player 2 rating history:', history2Error)
        // Don't throw error for history - it's optional
      }
    } catch (historyError) {
      console.error('Error adding player 2 rating history:', historyError)
      // Don't throw error for history - it's optional
    }
    
    console.log('Rating match result processed successfully')
    console.log(`=== END RATING API ===`)
    
    return NextResponse.json({
      success: true,
      player1NewRating,
      player2NewRating,
      player1RatingChange,
      player2RatingChange
    })
  } catch (error) {
    console.error('Error processing rating match result:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process rating match result' },
      { status: 500 }
    )
  }
} 
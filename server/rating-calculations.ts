// ELO rating calculation functions

export function calculateExpectedWinRate(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

export function calculateELOChange(
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

export function calculateAdjustedKFactor(
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

export function calculateNewRating(currentRating: number, ratingChange: number): number {
  return Math.max(100, currentRating + ratingChange)
}

export function calculateRatingConfidence(playerRating: number, gamesPlayed: number): number {
  if (gamesPlayed < 10) return 0.5 // Low confidence for new players
  if (gamesPlayed < 30) return 0.7 // Medium confidence
  return 0.9 // High confidence for experienced players
}

export function calculateProvisionalRating(playerRating: number, gamesPlayed: number): boolean {
  return gamesPlayed < 10
}

export function getRatingTier(rating: number): string {
  if (rating >= 2000) return 'Master'
  if (rating >= 1800) return 'Expert'
  if (rating >= 1600) return 'Advanced'
  if (rating >= 1400) return 'Intermediate'
  if (rating >= 1200) return 'Beginner'
  return 'Novice'
}

export function getRatingColor(rating: number): string {
  if (rating >= 2000) return '#FFD700' // Gold
  if (rating >= 1800) return '#C0C0C0' // Silver
  if (rating >= 1600) return '#CD7F32' // Bronze
  if (rating >= 1400) return '#4CAF50' // Green
  if (rating >= 1200) return '#2196F3' // Blue
  return '#9E9E9E' // Gray
} 
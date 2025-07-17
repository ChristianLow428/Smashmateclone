'use client'

import { supabase } from '@/utils/supabase/client'

export interface RatingBattlePreferences {
  island: string
  connection: 'wired' | 'wireless'
  rules: {
    stock: number
    time: number
    items: boolean
    stageHazards: boolean
  }
  userEmail?: string
}

export interface PlayerRating {
  player_id: string
  rating: number
  games_played: number
  wins: number
  losses: number
  display_name?: string
}

export interface RatingHistory {
  id: string
  player_id: string
  match_id: string
  old_rating: number
  new_rating: number
  rating_change: number
  opponent_id: string
  opponent_old_rating: number
  opponent_new_rating: number
  result: 'win' | 'loss'
  created_at: string
}

class RatingBattleService {
  private ws: WebSocket | null = null
  private onMatchCallback: ((matchId: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onMatchStatusCallback: ((status: any) => void) | null = null
  private isConnecting: boolean = false
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor() {
    // Initialize WebSocket connection
    this.connect()
  }

  private connect() {
    if (this.isConnecting) {
      console.log('Already connecting to WebSocket server')
      return
    }

    // Connect to the same WebSocket server as free battle
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001'
      : process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://hawaiissbu-websocket-server.onrender.com'

    console.log('Attempting to connect to rating battle WebSocket server at:', wsUrl)
    this.isConnecting = true
    
    if (this.ws) {
      this.ws.close(1000, 'Reconnecting')
    }

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('Rating battle WebSocket connection opened successfully')
      this.isConnecting = false
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received rating battle WebSocket message:', message)
        
        if (message.type === 'connected') {
          console.log('Connected to rating battle server')
        } else if (message.type === 'match') {
          console.log('Rating match message received:', message)
          this.onMatchCallback?.(message.matchId)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'match_state') {
          console.log('Rating match state message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'character_selection_update') {
          console.log('Character selection update received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'stage_striking_update') {
          console.log('Stage striking update received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'match_complete') {
          console.log('Match complete message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'game_result_pending') {
          console.log('Game result pending message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'game_result_conflict') {
          console.log('Game result conflict message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'match_reset') {
          console.log('Match reset message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'opponent_left') {
          console.log('Opponent left message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'rating_update') {
          console.log('Rating update message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'match_result_processed') {
          console.log('Match result processed message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'error') {
          console.log('Error message received:', message)
          this.onErrorCallback?.(message.error)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('Rating battle WebSocket error:', error)
      this.isConnecting = false
      this.onErrorCallback?.('Connection error. Please try again.')
    }

    this.ws.onclose = (event) => {
      console.log('Rating battle WebSocket connection closed:', event.code, event.reason)
      this.isConnecting = false
      
      if (event.code !== 1000) {
        console.log('Attempting to reconnect in 5 seconds...')
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000)
      }
    }
  }

  public async startRatingSearch(preferences: RatingBattlePreferences) {
    console.log('Starting rating search with preferences:', preferences)
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, attempting to connect...')
      this.connect()
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendRatingSearchMessage(preferences)
        } else {
          this.onErrorCallback?.('Not connected to rating battle server')
        }
      }, 1000)
      return
    }

    this.sendRatingSearchMessage(preferences)
  }

  private sendRatingSearchMessage(preferences: RatingBattlePreferences) {
    const message = {
      type: 'rating_search',
      preferences,
      userEmail: preferences.userEmail
    }

    console.log('Sending rating search message:', message)
    this.ws?.send(JSON.stringify(message))
  }

  public cancelRatingSearch() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'cancel_rating_search'
    }

    console.log('Sending cancel rating search message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public leaveRatingMatch(matchId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, cannot leave rating match')
      return
    }

    const message = {
      type: 'leave_rating_match',
      matchId
    }

    console.log('Sending leave rating match message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public selectCharacter(matchId: string, character: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, cannot select character')
      return
    }

    const message = {
      type: 'select_character',
      matchId,
      character
    }

    console.log('Sending character selection:', message)
    this.ws.send(JSON.stringify(message))
  }

  public banStage(matchId: string, stage: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'ban_stage',
      matchId,
      stage
    }

    console.log('Sending ban stage message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public pickStage(matchId: string, stage: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'pick_stage',
      matchId,
      stage
    }

    console.log('Sending pick stage message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public reportGameResult(matchId: string, winner: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'game_result',
      matchId,
      winner
    }

    console.log('Sending game result:', message)
    this.ws.send(JSON.stringify(message))
  }

  public sendChatMessage(matchId: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, cannot send chat message')
      return
    }

    const message = {
      type: 'chat',
      matchId,
      content
    }

    console.log('Sending chat message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public onMatch(callback: (matchId: string) => void) {
    this.onMatchCallback = callback
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  public onMatchStatus(callback: (status: any) => void) {
    this.onMatchStatusCallback = callback
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Disconnecting')
      this.ws = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  // Database methods for ratings
  public async getPlayerRating(playerId: string): Promise<PlayerRating | null> {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        // Get display name from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('email', playerId)
          .single()

        return {
          ...data,
          display_name: profile?.name || playerId
        }
      }

      return null
    } catch (error) {
      console.error('Error getting player rating:', error)
      return null
    }
  }

  public async getTopPlayers(limit: number = 10): Promise<PlayerRating[]> {
    console.log('=== getTopPlayers method called ===')
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select('*')
        .order('rating', { ascending: false })
        .limit(limit)

      if (error) throw error

      console.log('Raw player ratings data:', data)

      // Get display names for all players
      const playersWithNames = await Promise.all(
        data.map(async (player) => {
          console.log(`Fetching profile for player_id: ${player.player_id}`)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('email', player.player_id)
            .single()

          console.log(`Profile query result for ${player.player_id}:`, { profile, profileError })

          return {
            ...player,
            display_name: profile?.name || player.player_id
          }
        })
      )

      console.log('Final players with names:', playersWithNames)
      return playersWithNames
    } catch (error) {
      console.error('Error getting top players:', error)
      return []
    }
  }

  public async getRatingHistory(playerId: string, limit: number = 20): Promise<RatingHistory[]> {
    try {
      const { data, error } = await supabase
        .from('rating_history')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting rating history:', error)
      return []
    }
  }

  public async createOrUpdateRating(
    playerId: string, 
    newRating: number, 
    result: 'win' | 'loss',
    oldRating?: number
  ): Promise<void> {
    try {
      // First, try to get existing rating
      const { data: existingRating } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (existingRating) {
        // Update existing rating
        const updates = {
          rating: newRating,
          games_played: existingRating.games_played + 1,
          wins: existingRating.wins + (result === 'win' ? 1 : 0),
          losses: existingRating.losses + (result === 'loss' ? 1 : 0),
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('player_ratings')
          .update(updates)
          .eq('player_id', playerId)

        if (error) throw error
      } else {
        // Create new rating
        const newRatingRecord = {
          player_id: playerId,
          rating: newRating,
          games_played: 1,
          wins: result === 'win' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0
        }

        const { error } = await supabase
          .from('player_ratings')
          .insert(newRatingRecord)

        if (error) throw error
      }
    } catch (error) {
      console.error('Error creating/updating rating:', error)
      throw error
    }
  }

  public async processMatchResult(
    player1Id: string,
    player2Id: string,
    matchId: string,
    winner: number // 0 for player1, 1 for player2
  ): Promise<void> {
    try {
      // Get both players' current ratings
      const player1Rating = await this.getPlayerRating(player1Id)
      const player2Rating = await this.getPlayerRating(player2Id)

      // Use default rating of 1000 for new players
      const player1CurrentRating = player1Rating?.rating || 1000
      const player2CurrentRating = player2Rating?.rating || 1000
      const player1GamesPlayed = player1Rating?.games_played || 0
      const player2GamesPlayed = player2Rating?.games_played || 0

      // Calculate new ratings using enhanced Elo system
      const player1Result = winner === 0 ? 'win' : 'loss'
      const player2Result = winner === 1 ? 'win' : 'loss'

      const player1RatingChange = calculateELOChange(
        player1CurrentRating, 
        player2CurrentRating, 
        player1Result, 
        player1GamesPlayed
      )
      const player2RatingChange = calculateELOChange(
        player2CurrentRating, 
        player1CurrentRating, 
        player2Result, 
        player2GamesPlayed
      )

      const player1NewRating = calculateNewRating(player1CurrentRating, player1RatingChange)
      const player2NewRating = calculateNewRating(player2CurrentRating, player2RatingChange)

      // Update both players' ratings
      await this.createOrUpdateRating(player1Id, player1NewRating, player1Result, player1CurrentRating)
      await this.createOrUpdateRating(player2Id, player2NewRating, player2Result, player2CurrentRating)

      // Add rating history for both players
      await this.addRatingHistory(
        player1Id, matchId, player1CurrentRating, player1NewRating,
        player2Id, player2CurrentRating, player2NewRating, player1Result
      )
      await this.addRatingHistory(
        player2Id, matchId, player2CurrentRating, player2NewRating,
        player1Id, player1CurrentRating, player1NewRating, player2Result
      )

      console.log(`Match result processed: Player1 ${player1Id} ${player1Result} (${player1CurrentRating} → ${player1NewRating}), Player2 ${player2Id} ${player2Result} (${player2CurrentRating} → ${player2NewRating})`)
    } catch (error) {
      console.error('Error processing match result:', error)
      throw error
    }
  }

  public async addRatingHistory(
    playerId: string,
    matchId: string,
    oldRating: number,
    newRating: number,
    opponentId: string,
    opponentOldRating: number,
    opponentNewRating: number,
    result: 'win' | 'loss'
  ): Promise<void> {
    try {
      const ratingHistory = {
        player_id: playerId,
        match_id: matchId,
        old_rating: oldRating,
        new_rating: newRating,
        rating_change: newRating - oldRating,
        opponent_id: opponentId,
        opponent_old_rating: opponentOldRating,
        opponent_new_rating: opponentNewRating,
        result
      }

      const { error } = await supabase
        .from('rating_history')
        .insert(ratingHistory)

      if (error) throw error
    } catch (error) {
      console.error('Error adding rating history:', error)
      throw error
    }
  }
}

// Enhanced ELO calculation functions
export function calculateELOChange(
  playerRating: number, 
  opponentRating: number, 
  result: 'win' | 'loss', 
  playerGamesPlayed: number = 0,
  kFactor: number = 32
): number {
  // Calculate expected score using standard Elo formula
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const actualScore = result === 'win' ? 1 : 0
  
  // Adjust K-factor based on player experience and rating difference
  const adjustedKFactor = calculateAdjustedKFactor(playerRating, opponentRating, playerGamesPlayed, kFactor)
  
  // Calculate rating change
  const ratingChange = Math.round(adjustedKFactor * (actualScore - expectedScore))
  
  return ratingChange
}

export function calculateAdjustedKFactor(
  playerRating: number, 
  opponentRating: number, 
  playerGamesPlayed: number, 
  baseKFactor: number = 32
): number {
  let kFactor = baseKFactor
  
  // Reduce K-factor for experienced players (more stable ratings)
  if (playerGamesPlayed >= 30) {
    kFactor *= 0.8 // 20% reduction for experienced players
  } else if (playerGamesPlayed >= 10) {
    kFactor *= 0.9 // 10% reduction for moderately experienced players
  }
  
  // Increase K-factor for new players (faster rating adjustment)
  if (playerGamesPlayed < 5) {
    kFactor *= 1.5 // 50% increase for very new players
  }
  
  // Adjust K-factor based on rating difference (upset protection)
  const ratingDifference = Math.abs(playerRating - opponentRating)
  if (ratingDifference > 400) {
    // For large rating differences, increase K-factor slightly for underdogs
    kFactor *= 1.1
  }
  
  return Math.round(kFactor)
}

export function calculateNewRating(currentRating: number, ratingChange: number): number {
  const newRating = currentRating + ratingChange
  // Ensure minimum rating of 100 and maximum of 3000
  return Math.max(100, Math.min(3000, newRating))
}

export function calculateExpectedWinRate(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

export function calculateRatingConfidence(playerRating: number, gamesPlayed: number): number {
  // Calculate confidence based on number of games played
  // More games = higher confidence
  if (gamesPlayed < 10) return 0.3 // Low confidence for new players
  if (gamesPlayed < 30) return 0.6 // Medium confidence
  if (gamesPlayed < 100) return 0.8 // High confidence
  return 0.95 // Very high confidence for veterans
}

export function calculateProvisionalRating(playerRating: number, gamesPlayed: number): boolean {
  // A player is considered "provisional" if they have fewer than 10 games
  return gamesPlayed < 10
}

export const ratingBattleService = new RatingBattleService() 

// Utility functions for rating analysis
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

export function calculateMatchQuality(player1Rating: number, player2Rating: number): number {
  // Calculate how close the match should be (0-1, higher is better)
  const ratingDifference = Math.abs(player1Rating - player2Rating)
  const expectedWinRate = calculateExpectedWinRate(player1Rating, player2Rating)
  
  // Perfect match quality when both players have equal expected win rates
  const matchQuality = 1 - Math.abs(expectedWinRate - 0.5) * 2
  
  // Penalize very large rating differences
  if (ratingDifference > 400) {
    return Math.max(0.1, matchQuality * 0.5)
  }
  
  return Math.max(0.1, matchQuality)
}

export function findOptimalOpponent(
  playerRating: number,
  availablePlayers: PlayerRating[],
  maxRatingDifference: number = 200
): PlayerRating | null {
  const eligiblePlayers = availablePlayers.filter(player => 
    Math.abs(player.rating - playerRating) <= maxRatingDifference &&
    player.games_played >= 5 // Prefer players with some experience
  )

  if (eligiblePlayers.length === 0) {
    // If no players within range, expand search
    return availablePlayers.reduce((best, current) => {
      const bestQuality = calculateMatchQuality(playerRating, best.rating)
      const currentQuality = calculateMatchQuality(playerRating, current.rating)
      return currentQuality > bestQuality ? current : best
    })
  }

  // Return the player with the best match quality
  return eligiblePlayers.reduce((best, current) => {
    const bestQuality = calculateMatchQuality(playerRating, best.rating)
    const currentQuality = calculateMatchQuality(playerRating, current.rating)
    return currentQuality > bestQuality ? current : best
  })
} 
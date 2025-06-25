import { supabase } from '../utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface MatchmakingPreferences {
  island: string
  connection: 'wired' | 'wireless'
  rules: {
    stock: number
    time: number
    items: boolean
    stageHazards: boolean
  }
}

export interface Match {
  id: string
  player1_id: string
  player2_id: string
  status: 'character_selection' | 'stage_striking' | 'active' | 'completed'
  current_game: number
  player1_score: number
  player2_score: number
  stage_striking: {
    currentPlayer: number
    strikesRemaining: number
    availableStages: string[]
    bannedStages: string[]
  }
  character_selection: {
    player1Character: string | null
    player2Character: string | null
    bothReady: boolean
  }
  game_result_validation: {
    player1Reported: number | null
    player2Reported: number | null
    bothReported: boolean
  }
  selected_stage: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

class SupabaseMatchmakingService {
  private currentPlayerId: string | null = null
  private currentMatchId: string | null = null
  private matchChannel: RealtimeChannel | null = null
  private chatChannel: RealtimeChannel | null = null
  private onMatchCallback: ((matchId: string) => void) | null = null
  private onMatchStatusCallback: ((status: any) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private isSearching: boolean = false

  constructor() {
    // Initialize real-time subscriptions
    this.initializeRealtime()
  }

  private async initializeRealtime() {
    try {
      console.log('Initializing Supabase real-time subscriptions...')
      
      // Subscribe to matchmaking_players table for finding opponents
      const playersChannel = supabase
        .channel('matchmaking_players')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matchmaking_players'
          },
          (payload) => {
            console.log('Player joined:', payload.new)
            this.handlePlayerJoined(payload.new)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matchmaking_players'
          },
          (payload) => {
            console.log('Player updated:', payload.new)
            this.handlePlayerUpdated(payload.new)
          }
        )
        .subscribe((status) => {
          console.log('Supabase Realtime subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('Realtime subscription successful')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.log('Realtime subscription failed, falling back to polling')
            this.startPolling()
          }
        })

      // Set a timeout to check if subscription is working
      setTimeout(() => {
        if (!this.pollingInterval) {
          console.log('Realtime subscription timeout, starting polling fallback')
          this.startPolling()
        }
      }, 3000) // Reduced timeout to 3 seconds
      
    } catch (error) {
      console.error('Error initializing realtime:', error)
      console.log('Falling back to polling mechanism')
      this.startPolling()
    }
  }

  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
    
    console.log('Starting polling fallback for matchmaking')
    this.pollingInterval = setInterval(async () => {
      if (this.isSearching && this.currentPlayerId) {
        await this.pollForMatches()
      }
    }, 2000) // Poll every 2 seconds
  }

  private async pollForMatches() {
    try {
      // Check if we've been matched
      if (!this.currentPlayerId) return
      
      const { data: ourPlayer } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('id', this.currentPlayerId)
        .single()

      if (ourPlayer && ourPlayer.status === 'in_match') {
        // We got matched, find our match
        console.log('Player status changed to in_match, finding our match')
        await this.findOurMatch()
        return
      }

      // Only try to match if we're still searching
      if (ourPlayer && ourPlayer.status === 'searching') {
        console.log('Polling: Trying to find opponents...')
        await this.tryMatchPlayers()
      }
    } catch (error) {
      console.error('Error in polling:', error)
    }
  }

  private async handlePlayerJoined(player: any) {
    if (this.currentPlayerId && player.id !== this.currentPlayerId) {
      // Another player joined, try to match
      await this.tryMatchPlayers()
    }
  }

  private async handlePlayerUpdated(player: any) {
    if (player.id === this.currentPlayerId && player.status === 'in_match') {
      // We got matched, find our match
      await this.findOurMatch()
    }
  }

  private async tryMatchPlayers() {
    if (!this.currentPlayerId) return

    try {
      // Get our preferences
      const { data: ourPlayer } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('id', this.currentPlayerId)
        .single()

      if (!ourPlayer || ourPlayer.status !== 'searching') {
        console.log('Player not found or not searching, skipping match attempt')
        return
      }

      // Find a compatible opponent - only look for players who are actively searching
      const { data: opponents, error } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('status', 'searching')
        .neq('id', this.currentPlayerId)
        .limit(10) // Get more candidates and filter in JS

      if (error) {
        console.error('Error finding opponents:', error)
        return
      }

      // Filter by island preference in JavaScript
      const compatibleOpponents = opponents?.filter(opponent => 
        opponent.preferences?.island === ourPlayer.preferences.island
      ) || []

      console.log(`Found ${compatibleOpponents.length} compatible opponents`)

      if (compatibleOpponents.length > 0) {
        const opponent = compatibleOpponents[0]
        console.log('Creating match with opponent:', opponent.id)
        
        // Double-check that both players are still searching before creating match
        const { data: currentOpponent } = await supabase
          .from('matchmaking_players')
          .select('*')
          .eq('id', opponent.id)
          .single()

        if (currentOpponent && currentOpponent.status === 'searching') {
          await this.createMatch(ourPlayer, opponent)
        } else {
          console.log('Opponent is no longer searching, skipping match creation')
        }
      } else {
        console.log('No compatible opponents found, continuing to search...')
      }
    } catch (error) {
      console.error('Error trying to match players:', error)
      this.onErrorCallback?.('Failed to find opponent')
    }
  }

  private async createMatch(player1: any, player2: any) {
    try {
      console.log('Creating match between:', player1.id, 'and', player2.id)
      
      // First, try to update both players to in_match status atomically
      const { error: updateError } = await supabase
        .from('matchmaking_players')
        .update({ status: 'in_match' })
        .in('id', [player1.id, player2.id])
        .eq('status', 'searching') // Only update if still searching

      if (updateError) {
        console.error('Error updating players to in_match:', updateError)
        return
      }

      // Check if both players were actually updated
      const { data: updatedPlayers } = await supabase
        .from('matchmaking_players')
        .select('*')
        .in('id', [player1.id, player2.id])

      const bothInMatch = updatedPlayers?.every(p => p.status === 'in_match')
      
      if (!bothInMatch) {
        console.log('Not both players were updated to in_match, aborting match creation')
        // Reset our player back to searching
        await supabase
          .from('matchmaking_players')
          .update({ status: 'searching' })
          .eq('id', player1.id)
        return
      }

      // Create the match
      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          player1_id: player1.id,
          player2_id: player2.id,
          status: 'character_selection',
          stage_striking: {
            currentPlayer: 0,
            strikesRemaining: 1,
            availableStages: ["Battlefield", "Final Destination", "Hollow Bastion", "Pokemon Stadium 2", "Small Battlefield"],
            bannedStages: []
          },
          character_selection: {
            player1Character: null,
            player2Character: null,
            bothReady: false
          },
          game_result_validation: {
            player1Reported: null,
            player2Reported: null,
            bothReported: false
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating match:', error)
        // Reset both players back to searching
        await supabase
          .from('matchmaking_players')
          .update({ status: 'searching' })
          .in('id', [player1.id, player2.id])
        return
      }

      console.log('Match created successfully:', match.id)
      
      // Stop polling since we found a match
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
        console.log('Stopped polling - match found')
      }
      
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  private async findOurMatch() {
    if (!this.currentPlayerId) return

    try {
      console.log('Looking for existing match for player:', this.currentPlayerId)
      
      // Find matches that reference our player ID directly - only active matches
      const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${this.currentPlayerId},player2_id.eq.${this.currentPlayerId}`)
        .in('status', ['character_selection', 'stage_striking', 'active']) // Only active matches
        .single()

      if (error) {
        console.error('Error finding match:', error)
        return
      }

      if (match) {
        console.log('Found existing match:', match.id, 'Status:', match.status)
        this.currentMatchId = match.id
        
        // Get opponent information
        const opponentId = match.player1_id === this.currentPlayerId ? match.player2_id : match.player1_id
        const { data: opponent } = await supabase
          .from('matchmaking_players')
          .select('*')
          .eq('id', opponentId)
          .single()

        if (!opponent) {
          console.error('Opponent not found in matchmaking_players table')
          return
        }

        // Determine player index
        const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1

        console.log('Opponent found:', opponent.id, 'Player index:', playerIndex)

        // Subscribe to match updates
        this.subscribeToMatch(match.id)
        
        // Trigger match callback with opponent info
        this.onMatchCallback?.(match.id)
        
        // Send match status update with opponent info
        this.onMatchStatusCallback?.({
          type: 'match_state',
          matchId: match.id,
          status: match.status,
          currentGame: match.current_game,
          player1Score: match.player1_score,
          player2Score: match.player2_score,
          selectedStage: match.selected_stage,
          currentPlayer: match.stage_striking?.currentPlayer,
          strikesRemaining: match.stage_striking?.strikesRemaining,
          availableStages: match.stage_striking?.availableStages,
          player1Character: match.character_selection?.player1Character,
          player2Character: match.character_selection?.player2Character,
          playerIndex: playerIndex,
          opponent: opponent // Include opponent information
        })
      } else {
        console.log('No active match found for player')
      }
    } catch (error) {
      console.error('Error finding match:', error)
    }
  }

  private subscribeToMatch(matchId: string) {
    // Subscribe to match updates
    this.matchChannel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        (payload) => {
          this.handleMatchUpdate(payload)
        }
      )
      .subscribe()

    // Subscribe to chat messages
    this.chatChannel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_chat_messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          this.handleChatMessage(payload.new)
        }
      )
      .subscribe()
  }

  private async handleMatchUpdate(payload: any) {
    const match = payload.new
    if (!match) return

    // Determine player index directly from the match
    const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1

    // Send match status update
    this.onMatchStatusCallback?.({
      type: 'match_state',
      matchId: match.id,
      status: match.status,
      currentGame: match.current_game,
      player1Score: match.player1_score,
      player2Score: match.player2_score,
      selectedStage: match.selected_stage,
      currentPlayer: match.stage_striking?.currentPlayer,
      strikesRemaining: match.stage_striking?.strikesRemaining,
      availableStages: match.stage_striking?.availableStages,
      player1Character: match.character_selection?.player1Character,
      player2Character: match.character_selection?.player2Character,
      playerIndex: playerIndex // Add player index to the status update
    })
  }

  private handleChatMessage(message: any) {
    this.onMatchStatusCallback?.({
      type: 'chat_message',
      matchId: message.match_id,
      message: message.content,
      senderId: message.sender_id,
      timestamp: message.created_at
    })
  }

  public async startSearch(preferences: MatchmakingPreferences, userId: string) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }

      this.currentPlayerId = userId
      this.isSearching = true
      console.log('Starting search with player ID:', this.currentPlayerId)

      // Clean up any existing state first
      await this.cleanupStaleData()

      // Check if already in queue or match
      const { data: existingPlayer } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('id', this.currentPlayerId)
        .single()

      if (existingPlayer) {
        if (existingPlayer.status === 'searching') {
          console.log('Already searching for match')
          return
        } else if (existingPlayer.status === 'in_match') {
          console.log('Already in a match, trying to find existing match')
          // Try to find the existing match instead of throwing an error
          await this.findOurMatch()
          return
        }
      }

      // Insert or update player in matchmaking queue
      console.log('Attempting to insert/update player:', {
        id: this.currentPlayerId,
        status: 'searching',
        preferences: preferences
      })
      
      const { data: insertData, error: insertError } = await supabase
        .from('matchmaking_players')
        .upsert({
          id: this.currentPlayerId,
          status: 'searching',
          preferences: preferences,
          created_at: new Date().toISOString()
        })
        .select()

      console.log('Insert result:', { data: insertData, error: insertError })

      if (insertError) {
        console.error('Error inserting player:', insertError)
        const errorMessage = insertError.message || insertError.details || insertError.hint || 'Unknown database error'
        throw new Error(`Failed to join queue: ${errorMessage}`)
      }

      console.log('Successfully joined matchmaking queue')
      
      // Try to find an immediate match
      await this.tryMatchPlayers()
      
      // Start polling if realtime failed
      if (!this.pollingInterval) {
        this.startPolling()
      }
    } catch (error) {
      console.error('Error starting search:', error)
      this.isSearching = false
      this.currentPlayerId = null
      throw error
    }
  }

  private async cleanupStaleData() {
    try {
      console.log('Cleaning up stale data for player:', this.currentPlayerId)
      
      // Clean up any existing subscriptions
      if (this.matchChannel) {
        this.matchChannel.unsubscribe()
        this.matchChannel = null
      }
      
      if (this.chatChannel) {
        this.chatChannel.unsubscribe()
        this.chatChannel = null
      }
      
      // Stop any existing polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
      
      // Reset state
      this.currentMatchId = null
      this.isSearching = false
      
      console.log('Stale data cleanup completed')
    } catch (error) {
      console.error('Error cleaning up stale data:', error)
    }
  }

  public async cancelSearch() {
    if (!this.currentPlayerId) return

    try {
      this.isSearching = false
      
      await supabase
        .from('matchmaking_players')
        .update({ status: 'offline' })
        .eq('id', this.currentPlayerId)

      this.currentPlayerId = null
      
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
      }
    } catch (error) {
      console.error('Error canceling search:', error)
    }
  }

  public async leaveMatch(matchId: string) {
    try {
      console.log('Leaving match:', matchId)
      
      // Update player status to offline
      if (this.currentPlayerId) {
        await supabase
          .from('matchmaking_players')
          .update({ status: 'offline' })
          .eq('id', this.currentPlayerId)
        console.log('Updated player status to offline')
      }

      // Update match status to completed if it's still active
      await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', matchId)
        .in('status', ['character_selection', 'stage_striking', 'active'])
      console.log('Updated match status to completed')

      // Clean up subscriptions
      if (this.matchChannel) {
        this.matchChannel.unsubscribe()
        this.matchChannel = null
        console.log('Unsubscribed from match channel')
      }
      
      if (this.chatChannel) {
        this.chatChannel.unsubscribe()
        this.chatChannel = null
        console.log('Unsubscribed from chat channel')
      }
      
      // Reset state
      this.currentMatchId = null
      this.currentPlayerId = null
      this.isSearching = false
      
      // Stop polling
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval)
        this.pollingInterval = null
        console.log('Stopped polling')
      }
      
      console.log('Successfully left match and cleaned up')
    } catch (error) {
      console.error('Error leaving match:', error)
    }
  }

  public async selectCharacter(matchId: string, character: string) {
    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return

      const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1
      const characterSelection = match.character_selection || {}
      
      if (playerIndex === 0) {
        characterSelection.player1Character = character
      } else {
        characterSelection.player2Character = character
      }

      // Check if both players have selected
      if (characterSelection.player1Character && characterSelection.player2Character) {
        characterSelection.bothReady = true
      }

      await supabase
        .from('matches')
        .update({
          character_selection: characterSelection,
          status: characterSelection.bothReady ? 'stage_striking' : 'character_selection'
        })
        .eq('id', matchId)
    } catch (error) {
      console.error('Error selecting character:', error)
    }
  }

  public async banStage(matchId: string, stage: string) {
    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return

      const stageStriking = match.stage_striking || {}
      const availableStages = stageStriking.availableStages || []
      const bannedStages = stageStriking.bannedStages || []

      // Remove stage from available and add to banned
      const newAvailableStages = availableStages.filter((s: string) => s !== stage)
      const newBannedStages = [...bannedStages, stage]

      // Update strikes remaining and current player
      let newStrikesRemaining = stageStriking.strikesRemaining - 1
      let newCurrentPlayer = stageStriking.currentPlayer

      if (newStrikesRemaining === 0) {
        // Switch to next player or end stage striking
        if (newCurrentPlayer === 0) {
          newCurrentPlayer = 1
          newStrikesRemaining = 2 // Player 2 bans 2 stages
        } else {
          // Stage striking complete, switch to picking phase
          newStrikesRemaining = 0
        }
      }

      await supabase
        .from('matches')
        .update({
          stage_striking: {
            ...stageStriking,
            availableStages: newAvailableStages,
            bannedStages: newBannedStages,
            strikesRemaining: newStrikesRemaining,
            currentPlayer: newCurrentPlayer
          }
        })
        .eq('id', matchId)
    } catch (error) {
      console.error('Error banning stage:', error)
    }
  }

  public async pickStage(matchId: string, stage: string) {
    try {
      await supabase
        .from('matches')
        .update({
          selected_stage: stage,
          status: 'active'
        })
        .eq('id', matchId)
    } catch (error) {
      console.error('Error picking stage:', error)
    }
  }

  public async reportGameResult(matchId: string, winner: number) {
    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return

      const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1
      const gameResultValidation = match.game_result_validation || {}

      // Record this player's reported result
      if (playerIndex === 0) {
        gameResultValidation.player1Reported = winner
      } else {
        gameResultValidation.player2Reported = winner
      }

      // Check if both players have reported
      if (gameResultValidation.player1Reported !== null && 
          gameResultValidation.player2Reported !== null) {
        
        if (gameResultValidation.player1Reported === gameResultValidation.player2Reported) {
          // Both players agreed, update scores
          const newPlayer1Score = match.player1_score + (winner === 0 ? 1 : 0)
          const newPlayer2Score = match.player2_score + (winner === 1 ? 1 : 0)
          
          // Check if match is complete
          const isComplete = newPlayer1Score >= 2 || newPlayer2Score >= 2
          
          await supabase
            .from('matches')
            .update({
              player1_score: newPlayer1Score,
              player2_score: newPlayer2Score,
              status: isComplete ? 'completed' : 'stage_striking',
              current_game: isComplete ? match.current_game : match.current_game + 1,
              game_result_validation: { player1Reported: null, player2Reported: null, bothReported: false }
            })
            .eq('id', matchId)
        } else {
          // Conflict detected
          this.onMatchStatusCallback?.({
            type: 'game_result_conflict',
            matchId,
            player1Reported: gameResultValidation.player1Reported,
            player2Reported: gameResultValidation.player2Reported
          })
        }
      } else {
        // Only one player reported
        this.onMatchStatusCallback?.({
          type: 'game_result_pending',
          matchId,
          reportedBy: playerIndex,
          winner
        })
      }
    } catch (error) {
      console.error('Error reporting game result:', error)
    }
  }

  public async sendChatMessage(matchId: string, content: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('match_chat_messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          content
        })
    } catch (error) {
      console.error('Error sending chat message:', error)
    }
  }

  // Callback setters
  public onMatch(callback: (matchId: string) => void) {
    this.onMatchCallback = callback
  }

  public onMatchStatus(callback: (status: any) => void) {
    this.onMatchStatusCallback = callback
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  public async resetPlayerStatus() {
    if (!this.currentPlayerId) return

    try {
      console.log('Resetting player status for:', this.currentPlayerId)
      
      // Update player status to offline
      await supabase
        .from('matchmaking_players')
        .update({ status: 'offline' })
        .eq('id', this.currentPlayerId)

      // Clean up any existing subscriptions
      this.disconnect()
      
      console.log('Player status reset successfully')
    } catch (error) {
      console.error('Error resetting player status:', error)
    }
  }

  public async disconnect() {
    console.log('Disconnecting Supabase matchmaking service')
    
    // Clean up real-time subscriptions
    if (this.matchChannel) {
      this.matchChannel.unsubscribe()
      this.matchChannel = null
    }
    
    if (this.chatChannel) {
      this.chatChannel.unsubscribe()
      this.chatChannel = null
    }
    
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    
    // Reset state
    this.currentPlayerId = null
    this.currentMatchId = null
    this.isSearching = false
    
    console.log('Supabase matchmaking service disconnected')
  }
}

export const supabaseMatchmakingService = new SupabaseMatchmakingService() 
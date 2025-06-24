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

  constructor() {
    // Initialize real-time subscriptions
    this.initializeRealtime()
  }

  private async initializeRealtime() {
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
          this.handlePlayerUpdated(payload.new)
        }
      )
      .subscribe()
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

      if (!ourPlayer) return

      // Find a compatible opponent
      const { data: opponents } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('status', 'searching')
        .neq('id', this.currentPlayerId)
        .eq('preferences->island', ourPlayer.preferences.island)
        .limit(1)

      if (opponents && opponents.length > 0) {
        const opponent = opponents[0]
        await this.createMatch(ourPlayer, opponent)
      }
    } catch (error) {
      console.error('Error trying to match players:', error)
      this.onErrorCallback?.('Failed to find opponent')
    }
  }

  private async createMatch(player1: any, player2: any) {
    try {
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

      if (error) throw error

      // Update both players to in_match status
      await supabase
        .from('matchmaking_players')
        .update({ status: 'in_match' })
        .in('id', [player1.id, player2.id])

      console.log('Match created:', match)
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  private async findOurMatch() {
    if (!this.currentPlayerId) return

    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${this.currentPlayerId},player2_id.eq.${this.currentPlayerId}`)
        .eq('status', 'character_selection')
        .single()

      if (match) {
        this.currentMatchId = match.id
        this.subscribeToMatch(match.id)
        this.onMatchCallback?.(match.id)
      }
    } catch (error) {
      console.error('Error finding our match:', error)
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

  private handleMatchUpdate(payload: any) {
    const match = payload.new
    if (!match) return

    // Determine player index
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
      player2Character: match.character_selection?.player2Character
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

  public async startSearch(preferences: MatchmakingPreferences) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        this.onErrorCallback?.('Not authenticated')
        return
      }

      // Create or update player record
      const { data: existingPlayer } = await supabase
        .from('matchmaking_players')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (existingPlayer) {
        // Update existing player
        const { data: player } = await supabase
          .from('matchmaking_players')
          .update({
            preferences,
            status: 'searching',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPlayer.id)
          .select()
          .single()

        this.currentPlayerId = player?.id || null
      } else {
        // Create new player
        const { data: player } = await supabase
          .from('matchmaking_players')
          .insert({
            user_id: user.id,
            preferences,
            status: 'searching'
          })
          .select()
          .single()

        this.currentPlayerId = player?.id || null
      }

      // Try to find a match immediately
      await this.tryMatchPlayers()
    } catch (error) {
      console.error('Error starting search:', error)
      this.onErrorCallback?.('Failed to start search')
    }
  }

  public async cancelSearch() {
    if (!this.currentPlayerId) return

    try {
      await supabase
        .from('matchmaking_players')
        .update({ status: 'offline' })
        .eq('id', this.currentPlayerId)

      this.currentPlayerId = null
    } catch (error) {
      console.error('Error canceling search:', error)
    }
  }

  public async leaveMatch(matchId: string) {
    try {
      // Update player status
      if (this.currentPlayerId) {
        await supabase
          .from('matchmaking_players')
          .update({ status: 'offline' })
          .eq('id', this.currentPlayerId)
      }

      // Clean up subscriptions
      this.matchChannel?.unsubscribe()
      this.chatChannel?.unsubscribe()
      this.currentMatchId = null
      this.currentPlayerId = null
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

  public disconnect() {
    this.matchChannel?.unsubscribe()
    this.chatChannel?.unsubscribe()
    this.currentPlayerId = null
    this.currentMatchId = null
  }
}

export const supabaseMatchmakingService = new SupabaseMatchmakingService() 
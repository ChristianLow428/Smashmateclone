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
  private lastMatchUpdate: Match | null = null
  private matchStatusPollingInterval: NodeJS.Timeout | null = null

  constructor() {
    // Initialize real-time subscriptions
    this.initializeRealtime()
  }

  private async initializeRealtime() {
    try {
      console.log('Initializing real-time subscriptions')
      
      // Subscribe to matchmaking_players table changes
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

      // Subscribe to matches table changes
      const matchesChannel = supabase
        .channel('matches')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches'
          },
          (payload) => {
            this.handleMatchCreated(payload.new)
          }
        )
        .subscribe()

      console.log('Real-time subscriptions initialized')
    } catch (error) {
      console.error('Error initializing real-time:', error)
    }
  }

  private async handleMatchCreated(match: any) {
    // Check if this match involves our player
    if (this.currentPlayerId && (match.player1_id === this.currentPlayerId || match.player2_id === this.currentPlayerId)) {
      console.log('New match created involving our player:', match.id)
      
      // Small delay to ensure the match is fully created
      setTimeout(async () => {
        await this.findOurMatch()
      }, 100)
    }
  }

  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
    
    console.log('Starting polling fallback mechanism')
    this.pollingInterval = setInterval(() => {
      this.pollForMatches()
    }, 1000) // Poll every second for faster response
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

      // Also check if we have an active match in the matches table
      if (ourPlayer && ourPlayer.status === 'searching') {
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .or(`player1_id.eq.${this.currentPlayerId},player2_id.eq.${this.currentPlayerId}`)
          .in('status', ['character_selection', 'stage_striking', 'active'])
          .single()

        if (existingMatch) {
          console.log('Found existing match while polling:', existingMatch.id)
          await this.findOurMatch()
          return
        }
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

      // Set the current match ID and trigger UI callbacks
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
      
      // Trigger match callback
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
        bannedStages: match.stage_striking?.bannedStages,
        player1Character: match.character_selection?.player1Character,
        player2Character: match.character_selection?.player2Character,
        playerIndex: playerIndex,
        opponent: opponent // Include opponent information
      })
      
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  private async findOurMatch() {
    if (!this.currentPlayerId) return

    try {
      console.log('Looking for existing match for player:', this.currentPlayerId)
      
      // Find matches that reference our player ID - get the most recent one
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${this.currentPlayerId},player2_id.eq.${this.currentPlayerId}`)
        .in('status', ['character_selection', 'stage_striking', 'active']) // Only active matches
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error finding match:', error)
        return
      }

      if (matches && matches.length > 0) {
        const match = matches[0]
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
          bannedStages: match.stage_striking?.bannedStages,
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
    console.log('Setting up match subscription for:', matchId)
    
    // Start polling as a fallback immediately
    this.startMatchStatusPolling(matchId)
    
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
          console.log('Match update received:', payload)
          this.handleMatchUpdate(payload)
        }
      )
      .subscribe((status) => {
        console.log('Match subscription status:', status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Match subscription failed, retrying...')
          setTimeout(() => {
            if (this.matchChannel) {
              supabase.removeChannel(this.matchChannel)
              this.subscribeToMatch(matchId)
            }
          }, 1000)
        } else if (status === 'SUBSCRIBED') {
          console.log('Match subscription successful')
        } else if (status === 'CLOSED') {
          console.log('Match subscription closed, relying on polling fallback')
        }
      })

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
          console.log('Chat message received:', payload)
          this.handleChatMessage(payload.new)
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Chat subscription successful')
        }
      })
  }

  private async handleMatchUpdate(payload: any) {
    const match = payload.new
    if (!match) return

    console.log('Match update received:', {
      id: match.id,
      status: match.status,
      character_selection: match.character_selection,
      stage_striking: match.stage_striking,
      current_game: match.current_game,
      player1_score: match.player1_score,
      player2_score: match.player2_score
    })

    // Determine player index directly from the match
    const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1

    // Get opponent information
    const opponentId = match.player1_id === this.currentPlayerId ? match.player2_id : match.player1_id
    const { data: opponent } = await supabase
      .from('matchmaking_players')
      .select('*')
      .eq('id', opponentId)
      .single()

    // Send match status update
    const statusUpdate = {
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
      bannedStages: match.stage_striking?.bannedStages,
      player1Character: match.character_selection?.player1Character,
      player2Character: match.character_selection?.player2Character,
      playerIndex: playerIndex, // Add player index to the status update
      opponent: opponent // Include opponent information
    }

    console.log('Sending status update to UI:', statusUpdate)
    this.onMatchStatusCallback?.(statusUpdate)
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
      console.log('Starting search with preferences:', preferences)
      this.currentPlayerId = userId
      this.isSearching = true

      // Clean up any stale data first
      await this.cleanupStaleData()

      // Insert or update player in matchmaking queue
      const { data, error } = await supabase
        .from('matchmaking_players')
        .upsert({
          id: userId,
          status: 'searching',
          preferences: preferences
        })
        .select()

      if (error) {
        console.error('Error joining matchmaking queue:', error)
        this.onErrorCallback?.('Failed to join matchmaking queue')
        return
      }

      console.log('Successfully joined matchmaking queue')
      
      // Initialize real-time subscriptions
      await this.initializeRealtime()
      
      // Start polling as a fallback mechanism
      this.startPolling()

      // Set a timeout to ensure polling is working even if real-time fails
      setTimeout(() => {
        if (this.isSearching && !this.currentMatchId) {
          console.log('Ensuring polling is active for matchmaking')
      if (!this.pollingInterval) {
        this.startPolling()
      }
        }
      }, 2000)
      
    } catch (error) {
      console.error('Error starting search:', error)
      this.onErrorCallback?.('Failed to start search')
    }
  }

  private async cleanupStaleData() {
    if (!this.currentPlayerId) return

    try {
      console.log('Cleaning up stale data for player:', this.currentPlayerId)
      
      // Clean up stale matchmaking entries
      await supabase
        .from('matchmaking_players')
        .delete()
        .eq('id', this.currentPlayerId)

      // Clean up stale matches - mark old matches as completed
      const { data: staleMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`player1_id.eq.${this.currentPlayerId},player2_id.eq.${this.currentPlayerId}`)
        .in('status', ['character_selection', 'stage_striking', 'active'])
        .order('created_at', { ascending: false })
        .range(1, 100) // Keep only the most recent match, mark others as completed

      if (staleMatches && staleMatches.length > 0) {
        console.log(`Cleaning up ${staleMatches.length} stale matches`)
        await supabase
          .from('matches')
          .update({ status: 'completed' })
          .in('id', staleMatches.map(m => m.id))
      }

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
      
      // Stop polling
      this.stopMatchStatusPolling()
      
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
      this.lastMatchUpdate = null
      
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
      console.log(`Player ${this.currentPlayerId} selecting character: ${character}`)
      
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) {
        console.error('Match not found for character selection')
        return
      }

      const playerIndex = match.player1_id === this.currentPlayerId ? 0 : 1
      const characterSelection = match.character_selection || {}
      
      if (playerIndex === 0) {
        characterSelection.player1Character = character
      } else {
        characterSelection.player2Character = character
      }

      // Check if both players have selected
      const bothReady = characterSelection.player1Character && characterSelection.player2Character
      characterSelection.bothReady = bothReady

      console.log(`Character selection update: player1=${characterSelection.player1Character}, player2=${characterSelection.player2Character}, bothReady=${bothReady}`)

      const updateData: any = {
        character_selection: characterSelection
      }

      // If both players are ready, transition to stage_striking
      if (bothReady) {
        updateData.status = 'stage_striking'
        // Initialize stage striking data for Game 1
        updateData.stage_striking = {
          currentPlayer: 0, // Player 1 goes first
          strikesRemaining: 1, // Player 1 bans 1 stage first
          availableStages: ['Battlefield', 'Final Destination', 'Small Battlefield', 'Pokemon Stadium 2', 'Hallow Bastion'],
          bannedStages: []
        }
        console.log('Both characters selected, transitioning to stage_striking with initialized data')
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)

      if (error) {
        console.error('Error updating character selection:', error)
      } else {
        console.log('Character selection updated successfully in database')
        
        // Force a manual status update to ensure UI gets the update
        if (bothReady) {
          console.log('Forcing manual status update for stage transition')
          // Get the updated match data
          const { data: updatedMatch } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single()
            
          if (updatedMatch) {
            // Manually trigger the status update
            this.handleMatchUpdate({ new: updatedMatch })
          }
        }
      }
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
          // Player 2 finished banning, now Player 1 picks
          newCurrentPlayer = 0
          newStrikesRemaining = 0 // No more strikes, just pick
        }
      }

      const updatedStageStriking = {
        ...stageStriking,
        availableStages: newAvailableStages,
        bannedStages: newBannedStages,
        strikesRemaining: newStrikesRemaining,
        currentPlayer: newCurrentPlayer
      }

      await supabase
        .from('matches')
        .update({
          stage_striking: updatedStageStriking
        })
        .eq('id', matchId)

      // Send status update to notify UI about stage striking changes
      this.onMatchStatusCallback?.({
        type: 'stage_striking_update',
        matchId,
        currentPlayer: newCurrentPlayer,
        strikesRemaining: newStrikesRemaining,
        availableStages: newAvailableStages,
        bannedStages: newBannedStages
      })
    } catch (error) {
      console.error('Error banning stage:', error)
    }
  }

  public async pickStage(matchId: string, stage: string) {
    try {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return

      await supabase
        .from('matches')
        .update({
          selected_stage: stage,
          status: 'active'
        })
        .eq('id', matchId)

      // Send status update to notify UI about stage selection and game start
      this.onMatchStatusCallback?.({
        type: 'match_state',
        matchId,
        status: 'active',
        selectedStage: stage,
        currentGame: match.current_game,
        player1Score: match.player1_score,
        player2Score: match.player2_score
      })
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
          const newCurrentGame = isComplete ? match.current_game : match.current_game + 1
          const newStatus = isComplete ? 'completed' : 'stage_striking'
          
          // Update the match in the database
          const { data: updatedMatch, error } = await supabase
            .from('matches')
            .update({
              player1_score: newPlayer1Score,
              player2_score: newPlayer2Score,
              status: newStatus,
              current_game: newCurrentGame,
              game_result_validation: { player1Reported: null, player2Reported: null, bothReported: false }
            })
            .eq('id', matchId)
            .select()
            .single()

          if (error) {
            console.error('Error updating match after game result:', error)
            return
          }

          if (updatedMatch) {
            // If transitioning to next game, initialize stage striking
            if (!isComplete) {
              // Determine stage pool and striking rules for next game
              const STARTER_STAGES = ['Battlefield', 'Final Destination', 'Small Battlefield', 'Pokemon Stadium 2', 'Hallow Bastion']
              const COUNTERPICK_STAGES = ['Smashville', 'Town & City']
              const ALL_STAGES = [...STARTER_STAGES, ...COUNTERPICK_STAGES]
              
              const stagePool = newCurrentGame === 1 ? STARTER_STAGES : ALL_STAGES
              let firstPlayer: number
              let strikesRemaining: number
              
              if (newCurrentGame === 1) {
                // Game 1: Player 1 always goes first and bans 1 stage
                firstPlayer = 0
                strikesRemaining = 1
              } else {
                // Counterpicks: Winner bans 2 stages, loser picks
                const winner = newPlayer1Score > newPlayer2Score ? 0 : 1
                firstPlayer = winner
                strikesRemaining = 2
              }
              
              // Initialize stage striking for next game
              const stageStriking = {
                currentPlayer: firstPlayer,
                strikesRemaining: strikesRemaining,
                availableStages: [...stagePool],
                bannedStages: []
              }
              
              // Update the match with stage striking data
              await supabase
                .from('matches')
                .update({
                  stage_striking: stageStriking
                })
                .eq('id', matchId)
              
              // Trigger match status update with stage striking info
              this.onMatchStatusCallback?.({
                type: 'match_state',
                matchId,
                status: newStatus,
                currentGame: newCurrentGame,
                player1Score: newPlayer1Score,
                player2Score: newPlayer2Score,
                currentPlayer: stageStriking.currentPlayer,
                strikesRemaining: stageStriking.strikesRemaining,
                availableStages: stageStriking.availableStages
              })
            } else {
              // Match is complete, just send the status update
              this.onMatchStatusCallback?.({
                type: 'match_state',
                matchId,
                status: newStatus,
                currentGame: newCurrentGame,
                player1Score: newPlayer1Score,
                player2Score: newPlayer2Score
              })
            }

            // If match is complete, send match complete notification
            if (isComplete) {
              const finalWinner = newPlayer1Score >= 2 ? 0 : 1
              this.onMatchStatusCallback?.({
                type: 'match_complete',
                matchId,
                winner: finalWinner,
                finalScore: {
                  player1: newPlayer1Score,
                  player2: newPlayer2Score
                }
              })
            }
          }
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
        // Only one player reported - update the database with current validation state
        await supabase
          .from('matches')
          .update({
            game_result_validation: gameResultValidation
          })
          .eq('id', matchId)

        // Notify about pending result
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

  // Add polling fallback for match status updates
  private startMatchStatusPolling(matchId: string) {
    console.log('Starting match status polling as fallback')
    
    // Poll for match updates every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: match, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single()

        if (error) {
          console.error('Error polling match status:', error)
          return
        }

        if (match) {
          // Check if this is a new update (compare with last known state)
          const lastUpdate = this.lastMatchUpdate
          if (!lastUpdate || 
              lastUpdate.status !== match.status ||
              JSON.stringify(lastUpdate.character_selection) !== JSON.stringify(match.character_selection) ||
              JSON.stringify(lastUpdate.stage_striking) !== JSON.stringify(match.stage_striking)) {
            
            console.log('Polling detected match update, triggering handleMatchUpdate')
            this.lastMatchUpdate = match
            this.handleMatchUpdate({ new: match })
          }
        }
      } catch (error) {
        console.error('Error in match status polling:', error)
      }
    }, 3000)

    // Store the interval so we can clear it later
    this.matchStatusPollingInterval = pollInterval
  }

  private stopMatchStatusPolling() {
    if (this.matchStatusPollingInterval) {
      clearInterval(this.matchStatusPollingInterval)
      this.matchStatusPollingInterval = null
      console.log('Stopped match status polling')
    }
  }
}

export const supabaseMatchmakingService = new SupabaseMatchmakingService() 
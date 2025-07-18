import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { v4 as uuidv4 } from 'uuid'
import type { WebSocket as ServerWebSocket } from 'ws'
import { createClient } from '@supabase/supabase-js'


interface Player {
  id: string
  ws: ServerWebSocket
  preferences: {
    island: string
    connection: 'wired' | 'wireless'
    rules: {
      stock: number
      time: number
      items: boolean
      stageHazards: boolean
    }
  }
  rating?: number
  userEmail?: string
  matchId?: string
  character?: string
  isReady?: boolean
}

interface Match {
  id: string
  players: [Player, Player]
  status: 'pending' | 'character_selection' | 'stage_striking' | 'active' | 'completed'
  startTime: number
  chatMessages: ChatMessage[]
  currentGame: number
  player1Score: number
  player2Score: number
  isRatingMatch: boolean
  stageStriking: {
    currentPlayer: number // 0 or 1
    strikesRemaining: number
    availableStages: string[]
    bannedStages: string[]
  }
  characterSelection: {
    player1Character?: string
    player2Character?: string
    bothReady: boolean
  }
  gameResultValidation: {
    player1Reported?: number // 0 or 1 (winner)
    player2Reported?: number // 0 or 1 (winner)
    bothReported: boolean
  }
}

interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: string
}

// Hawaii Smash Ultimate Starter Stages
const STARTER_STAGES = [
  'Battlefield',
  'Final Destination', 
  'Hollow Bastion',
  'Pokemon Stadium 2',
  'Small Battlefield'
]

// Counterpick Stages (for games 2 and 3)
const COUNTERPICK_STAGES = [
  'Smashville',
  'Town and City'
]

// All stages combined
const ALL_STAGES = [...STARTER_STAGES, ...COUNTERPICK_STAGES]

class MatchmakingServer {
  private wss: WebSocketServer
  private players: Map<string, Player> = new Map()
  private matches: Map<string, Match> = new Map()
  private searchQueue: Player[] = []
  private chatConnections: Map<string, ServerWebSocket[]> = new Map()

  constructor(port: number) {
    const server = createServer((req, res) => {
      // Health check endpoint for Render
      if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', message: 'HawaiiSSBU WebSocket Server is running' }))
        return
      }
      
      res.writeHead(404)
      res.end()
    })
    
    this.wss = new WebSocketServer({ server })

    this.wss.on('connection', this.handleConnection.bind(this))
    server.listen(port, () => {
      console.log(`HawaiiSSBU matchmaking server running on port ${port}`)
    })
  }

  private handleConnection(ws: ServerWebSocket, request: any) {
    const playerId = uuidv4()
    console.log(`New connection: ${playerId}`)

    // Check if this is a match-specific connection
    const url = new URL(request.url, `http://${request.headers.host}`)
    const matchId = url.pathname.split('/')[2] // /match/{matchId}

    if (matchId && matchId !== 'undefined') {
      this.handleMatchConnection(playerId, ws, matchId)
    } else {
      this.handleMatchmakingConnection(playerId, ws)
    }
  }

  private handleMatchmakingConnection(playerId: string, ws: ServerWebSocket) {
    // Send connection confirmation
    this.sendMessage(ws, {
      type: 'connected',
      playerId
    })

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        console.log('Received message:', message)
        this.handleMatchmakingMessage(playerId, ws, message)
      } catch (error) {
        console.error('Error parsing message:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Player ${playerId} disconnected with code ${code}`)
      this.handleDisconnect(playerId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error)
      this.handleDisconnect(playerId)
    })
  }

  private handleMatchConnection(playerId: string, ws: ServerWebSocket, matchId: string) {
    const match = this.matches.get(matchId)
    if (!match) {
      this.sendError(ws, 'Match not found')
      ws.close()
      return
    }

    // Add this chat connection to the match
    if (!this.chatConnections.has(matchId)) {
      this.chatConnections.set(matchId, [])
    }
    this.chatConnections.get(matchId)!.push(ws)

    // Send existing chat messages
    this.sendMessage(ws, {
      type: 'chat_history',
      messages: match.chatMessages
    })

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        console.log('Received chat message:', message)
        if (message.type === 'chat') {
          this.handleChatMessage(matchId, message, ws)
        }
      } catch (error) {
        console.error('Error parsing chat message:', error)
      }
    })

    ws.on('close', () => {
      console.log(`Chat connection closed for match ${matchId}`)
      // Remove this connection from the chat connections
      const connections = this.chatConnections.get(matchId)
      if (connections) {
        const index = connections.indexOf(ws)
        if (index > -1) {
          connections.splice(index, 1)
        }
        if (connections.length === 0) {
          this.chatConnections.delete(matchId)
        }
      }
    })
  }

  private handleMatchmakingMessage(playerId: string, ws: ServerWebSocket, message: any) {
    switch (message.type) {
      case 'search':
        this.handleSearch(playerId, ws, message.preferences)
        break
      case 'cancel':
        this.handleCancel(playerId)
        break
      case 'rating_search':
        this.handleRatingSearch(playerId, ws, message)
        break
      case 'cancel_rating_search':
        this.handleCancelRatingSearch(playerId)
        break
      case 'leave_match':
        this.handleLeaveMatch(playerId, message.matchId)
        break
      case 'leave_rating_match':
        this.handleLeaveRatingMatch(playerId, message.matchId)
        break
      case 'select_character':
        this.handleCharacterSelection(playerId, message.matchId, message.character)
        break
      case 'ban_stage':
        this.handleStageBan(playerId, message.matchId, message.stage)
        break
      case 'pick_stage':
        this.handleStagePick(playerId, message.matchId, message.stage)
        break
      case 'game_result':
        this.handleGameResult(playerId, message.matchId, message.winner)
        break
      case 'chat':
        this.handleChatMessage(message.matchId, message, ws)
        break
      default:
        console.log('Unknown message type:', message.type)
        this.sendError(ws, `Unknown message type: ${message.type}`)
    }
  }

  private handleChatMessage(matchId: string, message: any, ws: ServerWebSocket) {
    const match = this.matches.get(matchId)
    if (!match) return

    // Find the player who sent the message by comparing WebSocket objects
    const sender = match.players.find(p => p.ws === ws)?.userEmail || 'Unknown'

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      sender: sender,
      content: message.content,
      timestamp: new Date().toISOString()
    }

    match.chatMessages.push(chatMessage)

    console.log(`Chat message from ${sender}: ${message.content}`)

    // Broadcast to all players in the match
    match.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(player.ws, {
          type: 'chat',
          ...chatMessage
        })
      }
    })

    // Also broadcast to any additional chat connections for this match
    const chatConnections = this.chatConnections.get(matchId)
    if (chatConnections) {
      chatConnections.forEach(chatWs => {
        if (chatWs.readyState === WebSocket.OPEN) {
          this.sendMessage(chatWs, {
            type: 'chat',
            ...chatMessage
          })
        }
      })
    }
  }

  private handleSearch(playerId: string, ws: ServerWebSocket, preferences: any) {
    console.log(`Player ${playerId} starting search with preferences:`, preferences)
    
    const player: Player = {
      id: playerId,
      ws,
      preferences
    }
    this.players.set(playerId, player)
    this.searchQueue.push(player)
    
    console.log(`Player ${playerId} added to search queue. Queue size: ${this.searchQueue.length}`)
    console.log(`Current search queue: ${this.searchQueue.map(p => p.id).join(', ')}`)
    
    this.tryMatchPlayers()
  }

  private handleCancel(playerId: string) {
    console.log(`Player ${playerId} cancelled search`)
    
    // Check if player is currently in a match
    const match = Array.from(this.matches.values()).find(
      m => m.players.some(p => p.id === playerId)
    )
    
    if (match) {
      console.log(`Player ${playerId} was in match ${match.id} when cancelling, notifying other players`)
      this.handleMatchDisconnect(match, playerId)
    }
    
    // Remove from search queue and players map
    const player = this.players.get(playerId)
    if (player) {
      // Clear the player's matchId
      player.matchId = undefined
      this.searchQueue = this.searchQueue.filter(p => p.id !== playerId)
      this.players.delete(playerId)
      console.log(`Player ${playerId} removed from search queue`)
    }
  }

  private handleRatingSearch(playerId: string, ws: ServerWebSocket, message: any) {
    console.log(`Player ${playerId} starting rating search with message:`, message)
    
    const player: Player = {
      id: playerId,
      ws,
      preferences: message.preferences,
      rating: 1000, // Default rating for new players
      userEmail: message.userEmail
    }
    this.players.set(playerId, player)
    this.searchQueue.push(player)
    
    console.log('=== RATING SEARCH DEBUG ===')
    console.log(`Player ${playerId} (${message.userEmail}) added to rating search queue. Queue size: ${this.searchQueue.length}`)
    console.log('Debug - player.userEmail type:', typeof player.userEmail, 'value:', player.userEmail)
    console.log('=== END RATING SEARCH DEBUG ===')
    
    this.tryMatchPlayers()
  }

  private handleCancelRatingSearch(playerId: string) {
    console.log(`Player ${playerId} cancelled rating search`)
    this.handleCancel(playerId)
  }

  private handleLeaveRatingMatch(playerId: string, matchId: string) {
    console.log(`Player ${playerId} leaving rating match ${matchId}`)
    this.handleLeaveMatch(playerId, matchId)
  }

  private handleDisconnect(playerId: string) {
    console.log(`Player ${playerId} disconnected`)
    
    // Check if player was in a match BEFORE removing them from the queue
    const match = Array.from(this.matches.values()).find(
      m => m.players.some(p => p.id === playerId)
    )
    
    if (match) {
      console.log(`Player ${playerId} was in match ${match.id}, notifying other players`)
      this.handleMatchDisconnect(match, playerId)
    } else {
      console.log(`Player ${playerId} was not in a match`)
    }
    
    // Remove from search queue and players map
    this.handleCancel(playerId)
  }

  private handleMatchDisconnect(match: Match, disconnectedPlayerId: string) {
    console.log(`Handling match disconnect for match ${match.id}, player ${disconnectedPlayerId}`)
    
    // Send match_reset to both players to clear their state
    match.players.forEach(player => {
      console.log(`Sending match_reset to player ${player.id}`)
      this.sendMessage(player.ws, {
        type: 'match_reset',
        matchId: match.id,
        message: 'Match has ended.'
      })
    })
    
    const otherPlayer = match.players.find(p => p.id !== disconnectedPlayerId)
    if (otherPlayer) {
      console.log(`Notifying other player ${otherPlayer.id} about disconnect`)
      try {
      this.sendMessage(otherPlayer.ws, {
        type: 'match',
        matchId: match.id,
        status: 'disconnected'
      })
        console.log(`Successfully sent disconnect notification to player ${otherPlayer.id}`)
      } catch (error) {
        console.error(`Failed to send disconnect notification to player ${otherPlayer.id}:`, error)
      }
    }
    
    // Notify chat connections that opponent left
    const chatConnections = this.chatConnections.get(match.id)
    if (chatConnections && chatConnections.length > 0) {
      console.log(`Notifying ${chatConnections.length} chat connections about opponent left`)
      let sentCount = 0
      chatConnections.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            console.log(`Sending opponent_left to chat connection ${index}`)
            this.sendMessage(ws, {
              type: 'opponent_left',
              message: 'Your opponent has left the match.'
            })
            sentCount++
            console.log(`Successfully sent opponent_left to chat connection ${index}`)
          } catch (error) {
            console.error(`Failed to send opponent_left to chat connection ${index}:`, error)
          }
        } else {
          console.log(`Chat connection ${index} is not open (state: ${ws.readyState})`)
        }
      })
      console.log(`Sent opponent_left message to ${sentCount} out of ${chatConnections.length} chat connections`)
    } else {
      console.log(`No chat connections found for match ${match.id}`)
    }
    
    // Clean up the match
    this.matches.delete(match.id)
    console.log(`Match ${match.id} cleaned up`)
    
    // Reset both players so they can queue again
    match.players.forEach(player => {
      player.matchId = undefined
      // Remove from search queue if they're still there
      this.searchQueue = this.searchQueue.filter(p => p.id !== player.id)
      // Keep them in the players map but reset their state
      console.log(`Reset player ${player.id} for re-queuing`)
    })
  }

  private tryMatchPlayers() {
    console.log(`Trying to match players. Queue size: ${this.searchQueue.length}`)
    
    while (this.searchQueue.length >= 2) {
      const player1 = this.searchQueue[0]
      console.log(`Looking for match for player ${player1.id} (${player1.preferences.island}, ${player1.preferences.connection})`)
      
      const player2 = this.findBestMatch(player1)
      
      if (player2) {
        console.log(`Found match: ${player1.id} vs ${player2.id}`)
        this.searchQueue = this.searchQueue.filter(p => 
          p.id !== player1.id && p.id !== player2.id
        )
        this.createMatch(player1, player2)
      } else {
        console.log(`No match found for player ${player1.id}`)
        break
      }
    }
  }

  private findBestMatch(player: Player): Player | null {
    console.log(`Searching for match for player ${player.id}`)
    console.log(`Available players: ${this.searchQueue.map(p => `${p.id} (${p.preferences.island}, ${p.preferences.connection})`).join(', ')}`)
    
    // First try: exact match (same island and connection)
    let match = this.searchQueue.find(p => 
      p.id !== player.id &&
      p.preferences.island === player.preferences.island &&
      p.preferences.connection === player.preferences.connection
    )
    
    if (match) {
      console.log(`Found exact match: ${match.id}`)
      return match
    }
    
    // Second try: same island only
    match = this.searchQueue.find(p => 
      p.id !== player.id &&
      p.preferences.island === player.preferences.island
    )
    
    if (match) {
      console.log(`Found island match: ${match.id}`)
      return match
    }
    
    // Third try: any player (for testing)
    match = this.searchQueue.find(p => p.id !== player.id)
    
    if (match) {
      console.log(`Found any match: ${match.id}`)
      return match
    }
    
    console.log(`No match found for player ${player.id}`)
    return null
  }

  private createMatch(player1: Player, player2: Player) {
    const matchId = uuidv4()
    
    // Randomly determine player order (50/50 chance)
    const isPlayer1First = Math.random() < 0.5
    const actualPlayer1 = isPlayer1First ? player1 : player2
    const actualPlayer2 = isPlayer1First ? player2 : player1
    
    // LOGGING: Show userEmail and isRatingMatch
    const isRatingMatch = !!actualPlayer1.userEmail && !!actualPlayer2.userEmail
    console.log('=== MATCH CREATION DEBUG ===')
    console.log('Creating match:', {
      player1Id: actualPlayer1.id,
      player2Id: actualPlayer2.id,
      player1Email: actualPlayer1.userEmail,
      player2Email: actualPlayer2.userEmail,
      isRatingMatch: isRatingMatch
    })
    console.log('Debug - actualPlayer1.userEmail type:', typeof actualPlayer1.userEmail, 'value:', actualPlayer1.userEmail)
    console.log('Debug - actualPlayer2.userEmail type:', typeof actualPlayer2.userEmail, 'value:', actualPlayer2.userEmail)
    console.log('=== END MATCH CREATION DEBUG ===')
    
    const match: Match = {
      id: matchId,
      players: [actualPlayer1, actualPlayer2],
      status: 'character_selection',
      startTime: Date.now(),
      chatMessages: [],
      currentGame: 1,
      player1Score: 0,
      player2Score: 0,
      isRatingMatch: !!actualPlayer1.userEmail && !!actualPlayer2.userEmail,
      stageStriking: {
        currentPlayer: 0,
        strikesRemaining: 1, // Player 1 bans 1 stage first
        availableStages: [...STARTER_STAGES],
        bannedStages: []
      },
      characterSelection: {
        player1Character: undefined,
        player2Character: undefined,
        bothReady: false
      },
      gameResultValidation: {
        bothReported: false
      }
    }
    this.matches.set(matchId, match)

    // Set matchId for both players
    actualPlayer1.matchId = matchId
    actualPlayer2.matchId = matchId

    console.log(`Match created: ${matchId}. Starting character selection phase.`)

    // Notify both players about the match and start character selection
    const player1Message = {
      type: 'match',
      matchId,
      status: 'character_selection',
      playerIndex: 0, // Player 1 is index 0
      opponent: {
        id: actualPlayer2.id,
        preferences: actualPlayer2.preferences
      },
      message: 'Match found! Please select your character.'
    }
    
    const player2Message = {
      type: 'match',
      matchId,
      status: 'character_selection',
      playerIndex: 1, // Player 2 is index 1
      opponent: {
        id: actualPlayer1.id,
        preferences: actualPlayer1.preferences
      },
      message: 'Match found! Please select your character.'
    }

    console.log('Sending match message to player 1:', player1Message)
    this.sendMessage(actualPlayer1.ws, player1Message)

    console.log('Sending match message to player 2:', player2Message)
    this.sendMessage(actualPlayer2.ws, player2Message)
  }

  private sendMessage(ws: ServerWebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('Sending message to WebSocket:', message)
      ws.send(JSON.stringify(message))
    } else {
      console.log('WebSocket not open, cannot send message. ReadyState:', ws.readyState)
    }
  }

  private sendError(ws: ServerWebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error
    })
  }

  private handleLeaveMatch(playerId: string, matchId: string) {
    console.log(`Player ${playerId} leaving match ${matchId}`)
    
    // Clear the player's matchId
    const player = this.players.get(playerId)
    if (player) {
      player.matchId = undefined
      console.log(`Cleared matchId for player ${playerId}`)
    }
    
    const match = this.matches.get(matchId)
    if (match) {
      console.log(`Player ${playerId} was in match ${matchId}, notifying other players`)
      this.handleMatchDisconnect(match, playerId)
    } else {
      console.log(`Match ${matchId} not found for player ${playerId}`)
    }
  }

  private handleCharacterSelection(playerId: string, matchId: string, character: string) {
    console.log(`Player ${playerId} selected character: ${character}`)
    
    const match = this.matches.get(matchId)
    if (!match) {
      console.log(`Match ${matchId} not found`)
      return
    }

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      console.log(`Player ${playerId} not found in match ${matchId}`)
      return
    }

    // Set character for the player
    if (playerIndex === 0) {
      match.characterSelection.player1Character = character
    } else {
      match.characterSelection.player2Character = character
    }

    // Check if both players have selected characters
    if (match.characterSelection.player1Character && match.characterSelection.player2Character) {
      match.characterSelection.bothReady = true
      match.status = 'stage_striking'
      
      // Game 1: Player 1 always goes first and bans 1 stage, then Player 2 bans 2 stages
      match.stageStriking.currentPlayer = 0 // Player 1 always goes first in Game 1
      match.stageStriking.strikesRemaining = 1 // Player 1 bans 1 stage first
      
      console.log(`Both characters selected. Game 1 stage striking: Player 1 goes first and bans 1 stage`)
      
      // Notify both players
      match.players.forEach((player, index) => {
        this.sendMessage(player.ws, {
          type: 'match_state',
          matchId,
          status: 'stage_striking',
          currentPlayer: match.stageStriking.currentPlayer,
          strikesRemaining: match.stageStriking.strikesRemaining,
          availableStages: match.stageStriking.availableStages,
          player1Character: match.characterSelection.player1Character,
          player2Character: match.characterSelection.player2Character
        })
      })
    } else {
      // Notify both players about character selection progress
      match.players.forEach(player => {
        this.sendMessage(player.ws, {
          type: 'character_selection_update',
          matchId,
          player1Character: match.characterSelection.player1Character,
          player2Character: match.characterSelection.player2Character
        })
      })
    }
  }

  private handleStageBan(playerId: string, matchId: string, stage: string) {
    console.log(`Player ${playerId} banning stage: ${stage}`)
    
    const match = this.matches.get(matchId)
    if (!match || match.status !== 'stage_striking') {
      console.log(`Match ${matchId} not found or not in stage striking phase`)
      return
    }

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    if (playerIndex !== match.stageStriking.currentPlayer) {
      console.log(`Not player ${playerId}'s turn to ban`)
      return
    }

    // Remove stage from available stages and add to banned
    const stageIndex = match.stageStriking.availableStages.indexOf(stage)
    if (stageIndex === -1) {
      console.log(`Stage ${stage} not available`)
      return
    }

    match.stageStriking.availableStages.splice(stageIndex, 1)
    match.stageStriking.bannedStages.push(stage)
    match.stageStriking.strikesRemaining--

    console.log(`Stage ${stage} banned. ${match.stageStriking.strikesRemaining} strikes remaining`)

    // Switch to next player and update strikes remaining
    if (match.currentGame === 1) {
      // Game 1: Player 1 bans 1, then Player 2 bans 2, then Player 1 picks
      if (match.stageStriking.currentPlayer === 0 && match.stageStriking.strikesRemaining === 0) {
        // Player 1 just finished their 1 ban, now Player 2 bans 2
        match.stageStriking.currentPlayer = 1
        match.stageStriking.strikesRemaining = 2
        console.log(`Player 1 finished banning. Player 2 now bans 2 stages`)
      } else if (match.stageStriking.currentPlayer === 1 && match.stageStriking.strikesRemaining === 0) {
        // Player 2 just finished their 2 bans, now Player 1 picks
        match.stageStriking.currentPlayer = 0
        match.stageStriking.strikesRemaining = 0 // No more strikes, just pick
        console.log(`Player 2 finished banning. Player 1 now picks from remaining stages`)
      } else {
        // Same player continues banning
        console.log(`Player ${match.stageStriking.currentPlayer + 1} continues banning. ${match.stageStriking.strikesRemaining} strikes remaining`)
      }
    } else {
      // Counterpicks: Winner bans 2, loser picks
      if (match.stageStriking.strikesRemaining > 0) {
        // Winner still has strikes remaining, continue banning
        console.log(`Winner continues banning. ${match.stageStriking.strikesRemaining} strikes remaining`)
      } else {
        // Winner finished banning 2 stages, now loser picks
        const winner = match.player1Score > match.player2Score ? 0 : 1
        const loser = winner === 0 ? 1 : 0
        match.stageStriking.currentPlayer = loser
        match.stageStriking.strikesRemaining = 0 // No more strikes, just pick
        console.log(`Winner finished banning. Loser (Player ${loser + 1}) now picks from remaining stages`)
      }
    }
    
    // Notify both players
    match.players.forEach(player => {
      this.sendMessage(player.ws, {
        type: 'stage_striking_update',
        matchId,
        currentPlayer: match.stageStriking.currentPlayer,
        strikesRemaining: match.stageStriking.strikesRemaining,
        availableStages: match.stageStriking.availableStages,
        bannedStages: match.stageStriking.bannedStages
      })
    })
  }

  private handleStagePick(playerId: string, matchId: string, stage: string) {
    console.log(`Player ${playerId} picking stage: ${stage}`)
    
    const match = this.matches.get(matchId)
    if (!match || match.status !== 'stage_striking') {
      console.log(`Match ${matchId} not found or not in stage striking phase`)
      return
    }

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    if (playerIndex !== match.stageStriking.currentPlayer) {
      console.log(`Not player ${playerId}'s turn to pick`)
      return
    }

    if (match.stageStriking.strikesRemaining > 0) {
      console.log(`Still in banning phase, cannot pick stage yet`)
      return
    }

    // Check if stage is available
    const stageIndex = match.stageStriking.availableStages.indexOf(stage)
    if (stageIndex === -1) {
      console.log(`Stage ${stage} not available`)
      return
    }

    // Stage selected, start the game
    match.status = 'active'
    const selectedStage = stage
    
    console.log(`Stage selected: ${selectedStage}. Starting game ${match.currentGame}`)
    
    // Notify both players
    match.players.forEach(player => {
      this.sendMessage(player.ws, {
        type: 'match_state',
        matchId,
        status: 'active',
        selectedStage,
        currentGame: match.currentGame,
        player1Score: match.player1Score,
        player2Score: match.player2Score
      })
    })
  }

  private async processRatingMatchResult(matchData: Match, winner: number) {
    try {
      console.log(`Processing rating match result for match ${matchData.id}`)
      console.log(`Winner: Player ${winner}`)
      
      // Get player emails for rating battles
      const player1Email = matchData.players[0].userEmail
      const player2Email = matchData.players[1].userEmail
      
      console.log(`Player 1 email: ${player1Email}`)
      console.log(`Player 2 email: ${player2Email}`)
      
      if (!player1Email || !player2Email) {
        console.error('Missing user emails for rating match:', { player1Email, player2Email })
        return
      }

      // Import the rating calculation functions
      const { calculateELOChange, calculateExpectedWinRate, calculateAdjustedKFactor } = await import('./rating-calculations')
      
      // Get current ratings from the database
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Get current ratings
      const { data: player1Data } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('player_id', player1Email)
        .single()
      
      const { data: player2Data } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('player_id', player2Email)
        .single()
      
      const player1CurrentRating = player1Data?.rating || 1000
      const player2CurrentRating = player2Data?.rating || 1000
      const player1GamesPlayed = player1Data?.games_played || 0
      const player2GamesPlayed = player2Data?.games_played || 0
      
      console.log(`Current ratings - Player1: ${player1CurrentRating}, Player2: ${player2CurrentRating}`)
      
      // Calculate rating changes
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
        await supabase
          .from('player_ratings')
          .update({
            rating: player1NewRating,
            games_played: player1GamesPlayed + 1,
            wins: player1Data.wins + (player1Result === 'win' ? 1 : 0),
            losses: player1Data.losses + (player1Result === 'loss' ? 1 : 0)
          })
          .eq('player_id', player1Email)
      } else {
        await supabase
          .from('player_ratings')
          .insert({
            player_id: player1Email,
            rating: player1NewRating,
            games_played: 1,
            wins: player1Result === 'win' ? 1 : 0,
            losses: player1Result === 'loss' ? 1 : 0
          })
      }
      
      // Update player 2 rating
      if (player2Data) {
        await supabase
          .from('player_ratings')
          .update({
            rating: player2NewRating,
            games_played: player2GamesPlayed + 1,
            wins: player2Data.wins + (player2Result === 'win' ? 1 : 0),
            losses: player2Data.losses + (player2Result === 'loss' ? 1 : 0)
          })
          .eq('player_id', player2Email)
      } else {
        await supabase
          .from('player_ratings')
          .insert({
            player_id: player2Email,
            rating: player2NewRating,
            games_played: 1,
            wins: player2Result === 'win' ? 1 : 0,
            losses: player2Result === 'loss' ? 1 : 0
          })
      }
      
      // Add rating history (optional)
      try {
        await supabase.from('rating_history').insert([
          {
            player_id: player1Email,
            match_id: matchData.id,
            old_rating: player1CurrentRating,
            new_rating: player1NewRating,
            rating_change: player1RatingChange,
            opponent_id: player2Email,
            opponent_old_rating: player2CurrentRating,
            opponent_new_rating: player2NewRating,
            result: player1Result
          },
          {
            player_id: player2Email,
            match_id: matchData.id,
            old_rating: player2CurrentRating,
            new_rating: player2NewRating,
            rating_change: player2RatingChange,
            opponent_id: player1Email,
            opponent_old_rating: player1CurrentRating,
            opponent_new_rating: player1NewRating,
            result: player2Result
          }
        ])
      } catch (historyError) {
        console.error('Error adding rating history:', historyError)
        // Don't fail the whole process for history
      }
      
      console.log('Rating match result processed successfully')
      
      // Send rating updates to both players
      matchData.players.forEach((player, index) => {
        this.sendMessage(player.ws, {
          type: 'rating_update',
          playerId: player.userEmail || player.id,
          newRating: index === 0 ? player1NewRating : player2NewRating,
          ratingChange: index === 0 ? player1RatingChange : player2RatingChange
        })
      })
      
      // Send match result processed notification
      matchData.players.forEach(player => {
        this.sendMessage(player.ws, {
          type: 'match_result_processed',
          matchId: matchData.id,
          player1Id: player1Email,
          player2Id: player2Email,
          winner,
          player1NewRating,
          player2NewRating,
          player1RatingChange,
          player2RatingChange
        })
      })
    } catch (error) {
      console.error('Error processing rating match result:', error)
    }
  }

  private handleGameResult(playerId: string, matchId: string, winner: number) {
    console.log(`Player ${playerId} reported game result: Player ${winner} won`)
    
    const matchData = this.matches.get(matchId)
    if (!matchData || matchData.status !== 'active') {
      console.log(`Match ${matchId} not found or not active`)
      return
    }

    const playerIndex = matchData.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      console.log(`Player ${playerId} not found in match ${matchId}`)
      return
    }

    // Record this player's reported result
    if (playerIndex === 0) {
      matchData.gameResultValidation.player1Reported = winner
      console.log(`Player 1 reported winner: Player ${winner}`)
    } else {
      matchData.gameResultValidation.player2Reported = winner
      console.log(`Player 2 reported winner: Player ${winner}`)
    }

    // Check if both players have reported
    if (matchData.gameResultValidation.player1Reported !== undefined && 
        matchData.gameResultValidation.player2Reported !== undefined) {
      
      // Check if both players reported the same result
      if (matchData.gameResultValidation.player1Reported === matchData.gameResultValidation.player2Reported) {
        console.log(`Both players agreed on winner: Player ${matchData.gameResultValidation.player1Reported}`)
        
        // Update scores
        if (matchData.gameResultValidation.player1Reported === 0) {
          matchData.player1Score++
        } else {
          matchData.player2Score++
        }

        console.log(`Scores updated: Player 1: ${matchData.player1Score}, Player 2: ${matchData.player2Score}`)

        // Reset game result validation for next game
        matchData.gameResultValidation = {
          bothReported: false
        }

        // Check if match is complete (best of 3)
        console.log('Checking if match is complete. Player1Score:', matchData.player1Score, 'Player2Score:', matchData.player2Score)
        if (matchData.player1Score >= 2 || matchData.player2Score >= 2) {
          console.log('Match is complete! Setting status to completed')
          matchData.status = 'completed'
          const winner = matchData.player1Score >= 2 ? 0 : 1
          
          console.log('About to enter match completion logic...')
          
          // LOGGING: Show matchData and isRatingMatch
          console.log('=== MATCH COMPLETION DEBUG ===')
          console.log('Match complete! isRatingMatch:', matchData.isRatingMatch, 'player1:', matchData.players[0].userEmail, 'player2:', matchData.players[1].userEmail)
          console.log('Full matchData:', JSON.stringify(matchData, null, 2))
          console.log('=== END MATCH COMPLETION DEBUG ===')
          
          // Process rating calculations if this is a rating match
          if (matchData.isRatingMatch) {
            console.log('Processing rating match result...')
            this.processRatingMatchResult(matchData, winner)
          } else {
            console.log('Not a rating match, skipping rating processing')
            console.log('Debug - matchData.isRatingMatch value:', matchData.isRatingMatch)
            console.log('Debug - player1.userEmail:', matchData.players[0].userEmail)
            console.log('Debug - player2.userEmail:', matchData.players[1].userEmail)
          }
          
          // Notify both players
          console.log('Sending match_complete messages to players...')
          matchData.players.forEach(player => {
            this.sendMessage(player.ws, {
              type: 'match_complete',
              matchId,
              winner,
              finalScore: {
                player1: matchData.player1Score,
                player2: matchData.player2Score
              }
            })
          })
          console.log('Match completion logic finished')
        } else {
          // Start next game
          matchData.currentGame++
          matchData.status = 'stage_striking'
          
          // Determine stage pool based on game number
          const stagePool = matchData.currentGame === 1 ? STARTER_STAGES : ALL_STAGES
          
          // Determine who goes first in stage striking for counterpicks
          let firstPlayer: number
          let strikesRemaining: number
          
          if (matchData.currentGame === 1) {
            // Game 1: Player 1 always goes first and bans 1 stage
            firstPlayer = 0
            strikesRemaining = 1
          } else {
            // Counterpicks: Winner bans 2 stages, loser picks
            const winner = matchData.player1Score > matchData.player2Score ? 0 : 1
            firstPlayer = winner
            strikesRemaining = 2
            console.log(`Counterpick stage striking: Winner (Player ${winner + 1}) bans 2 stages first`)
          }
          
          // Reset stage striking for next game
          matchData.stageStriking = {
            currentPlayer: firstPlayer,
            strikesRemaining: strikesRemaining,
            availableStages: [...stagePool],
            bannedStages: []
          }
          
          console.log(`Starting game ${matchData.currentGame}. Player ${matchData.stageStriking.currentPlayer + 1} goes first. Stage pool: ${stagePool.length} stages`)
          
          // Notify both players
          matchData.players.forEach(player => {
            this.sendMessage(player.ws, {
              type: 'match_state',
              matchId,
              status: 'stage_striking',
              currentGame: matchData.currentGame,
              player1Score: matchData.player1Score,
              player2Score: matchData.player2Score,
              currentPlayer: matchData.stageStriking.currentPlayer,
              strikesRemaining: matchData.stageStriking.strikesRemaining,
              availableStages: matchData.stageStriking.availableStages
            })
          })
        }
      } else {
        // Players reported different results - need to resolve conflict
        console.log(`Conflict detected! Player 1 reported: ${matchData.gameResultValidation.player1Reported}, Player 2 reported: ${matchData.gameResultValidation.player2Reported}`)
        
        // Notify both players about the conflict
        matchData.players.forEach(player => {
          this.sendMessage(player.ws, {
            type: 'game_result_conflict',
            matchId,
            player1Reported: matchData.gameResultValidation.player1Reported,
            player2Reported: matchData.gameResultValidation.player2Reported,
            message: 'Both players must report the same result. Please discuss and report again.'
          })
        })
        
        // Reset validation to allow re-reporting
        matchData.gameResultValidation = {
          bothReported: false
        }
      }
    } else {
      // Only one player has reported so far
      console.log(`Waiting for other player to report result. Player ${playerIndex + 1} reported: Player ${winner}`)
      
      // Notify both players about the pending result
      matchData.players.forEach(player => {
        this.sendMessage(player.ws, {
          type: 'game_result_pending',
          matchId,
          reportedBy: playerIndex,
          winner,
          message: `Player ${playerIndex + 1} reported Player ${winner} won. Waiting for other player to confirm.`
        })
      })
    }
  }
}

// Start the server
const port = process.env.PORT || 3001
new MatchmakingServer(parseInt(port.toString())) 
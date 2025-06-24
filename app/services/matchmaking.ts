interface MatchmakingMessage {
  type: 'search' | 'match' | 'cancel' | 'ready' | 'leave_match' | 'select_character' | 'ban_stage' | 'game_result' | 'match_state' | 'character_selection_update' | 'stage_striking_update' | 'match_complete' | 'match_reset' | 'opponent_left' | 'pick_stage' | 'game_result_pending' | 'game_result_conflict'
  preferences?: {
    island: string
    connection: 'wired' | 'wireless'
    rules: {
      stock: number
      time: number
      items: boolean
      stageHazards: boolean
    }
  }
  matchId?: string
  playerIndex?: number // 0 for player1, 1 for player2
  status?: 'found' | 'pending' | 'active' | 'completed' | 'disconnected' | 'character_selection' | 'stage_striking'
  opponent?: {
    id: string
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
  }
  character?: string
  stage?: string
  winner?: number
  message?: string
  currentPlayer?: number
  strikesRemaining?: number
  availableStages?: string[]
  bannedStages?: string[]
  selectedStage?: string
  currentGame?: number
  player1Score?: number
  player2Score?: number
  player1Character?: string
  player2Character?: string
  finalScore?: {
    player1: number
    player2: number
  }
  // Game result validation fields
  reportedBy?: number
  player1Reported?: number
  player2Reported?: number
}

class MatchmakingService {
  private ws: WebSocket | null = null
  private onMatchCallback: ((matchId: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onMatchStatusCallback: ((status: MatchmakingMessage) => void) | null = null
  private isConnecting: boolean = false
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor() {
    // Initialize WebSocket connection
    this.connect()
  }

  private connect() {
    // Prevent multiple connection attempts
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Connection already in progress, skipping...')
      return
    }

    // If already connected, don't reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected to WebSocket server')
      return
    }

    // In development, connect to local WebSocket server on port 3001
    // In production, use environment variable or default to a deployed WebSocket server
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001'
      : process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://your-websocket-server-url.com'

    console.log('Attempting to connect to WebSocket server at:', wsUrl)
    this.isConnecting = true
    
    // Close existing connection if it exists
    if (this.ws) {
      this.ws.close(1000, 'Reconnecting')
    }
    
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('WebSocket connection opened successfully')
      this.isConnecting = false
      // Clear any pending reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received WebSocket message:', message)
        
        if (message.type === 'connected') {
          console.log('Connected to matchmaking server')
        } else if (message.type === 'match') {
          console.log('Match message received:', message)
          if (message.status === 'character_selection') {
            console.log('Calling onMatch callback with matchId:', message.matchId)
            this.onMatchCallback?.(message.matchId)
          }
          console.log('Calling onMatchStatus callback with match message')
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'match_state') {
          console.log('Match state message received:', message)
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
        } else if (message.type === 'match_reset') {
          console.log('Match reset message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'opponent_left') {
          console.log('Opponent left message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'game_result_pending') {
          console.log('Game result pending message received:', message)
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'game_result_conflict') {
          console.log('Game result conflict message received:', message)
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
      console.error('WebSocket error:', error)
      this.isConnecting = false
      this.onErrorCallback?.('Connection error. Please try again.')
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason)
      this.isConnecting = false
      
      // Only attempt to reconnect if it wasn't a manual close
      if (event.code !== 1000) {
        console.log('Attempting to reconnect in 5 seconds...')
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000)
      }
    }
  }

  public startSearch(preferences: MatchmakingMessage['preferences']) {
    console.log('Starting search with preferences:', preferences)
    console.log('WebSocket state:', this.ws?.readyState)
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, attempting to connect...')
      this.connect()
      // Wait a bit for connection to establish
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('WebSocket connected, sending search message')
          this.sendSearchMessage(preferences)
        } else {
          console.log('WebSocket still not ready, state:', this.ws?.readyState)
          this.onErrorCallback?.('Not connected to matchmaking server')
        }
      }, 1000)
      return
    }

    console.log('WebSocket ready, sending search message immediately')
    this.sendSearchMessage(preferences)
  }

  private sendSearchMessage(preferences: MatchmakingMessage['preferences']) {
    const message: MatchmakingMessage = {
      type: 'search',
      preferences
    }

    console.log('Sending search message:', message)
    this.ws?.send(JSON.stringify(message))
  }

  public cancelSearch() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message: MatchmakingMessage = {
      type: 'cancel'
    }

    console.log('Sending cancel message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public leaveMatch(matchId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, cannot leave match')
      return
    }

    const message = {
      type: 'leave_match',
      matchId
    }

    console.log('Sending leave match message:', message)
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

    const message: MatchmakingMessage = {
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

    const message: MatchmakingMessage = {
      type: 'pick_stage',
      matchId,
      stage
    }

    console.log('Sending pick stage message:', message)
    this.ws.send(JSON.stringify(message))
  }

  public reportGameResult(matchId: string, winner: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, cannot report game result')
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

  public sendReady(matchId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message: MatchmakingMessage = {
      type: 'ready',
      matchId
    }

    this.ws.send(JSON.stringify(message))
  }

  public onMatch(callback: (matchId: string) => void) {
    this.onMatchCallback = callback
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  public onMatchStatus(callback: (status: MatchmakingMessage) => void) {
    this.onMatchStatusCallback = callback
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
  }

  public forceReconnect() {
    console.log('Force reconnecting WebSocket...')
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Force reconnect')
      this.ws = null
    }
    
    this.isConnecting = false
    this.connect()
  }

  public resetState() {
    console.log('Resetting matchmaking service state...')
    // Clear any pending timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    // Reset connection state
    this.isConnecting = false
    
    // Don't close the WebSocket, just reset internal state
    console.log('Matchmaking service state reset complete')
  }
}

// Create a singleton instance
export const matchmakingService = new MatchmakingService() 
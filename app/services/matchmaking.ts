interface MatchmakingMessage {
  type: 'search' | 'match' | 'cancel' | 'ready'
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
  status?: 'found' | 'pending' | 'active' | 'completed' | 'disconnected'
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
}

class MatchmakingService {
  private ws: WebSocket | null = null
  private onMatchCallback: ((matchId: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onMatchStatusCallback: ((status: MatchmakingMessage) => void) | null = null

  constructor() {
    // Initialize WebSocket connection
    this.connect()
  }

  private connect() {
    // In development, connect to local WebSocket server
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001'
      : 'wss://your-production-websocket-url.com'

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('Connected to matchmaking server')
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === 'match') {
          if (message.status === 'found') {
            this.onMatchCallback?.(message.matchId)
          }
          this.onMatchStatusCallback?.(message)
        } else if (message.type === 'error') {
          this.onErrorCallback?.(message.error)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.onErrorCallback?.('Connection error. Please try again.')
    }

    this.ws.onclose = () => {
      console.log('Disconnected from matchmaking server')
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000)
    }
  }

  public startSearch(preferences: MatchmakingMessage['preferences']) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onErrorCallback?.('Not connected to matchmaking server')
      return
    }

    const message: MatchmakingMessage = {
      type: 'search',
      preferences
    }

    this.ws.send(JSON.stringify(message))
  }

  public cancelSearch() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message: MatchmakingMessage = {
      type: 'cancel'
    }

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
}

// Create a singleton instance
export const matchmakingService = new MatchmakingService() 
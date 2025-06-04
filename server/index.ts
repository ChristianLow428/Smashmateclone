import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { v4 as uuidv4 } from 'uuid'
import type { WebSocket as ServerWebSocket } from 'ws'

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
}

interface Match {
  id: string
  players: [Player, Player]
  status: 'pending' | 'active' | 'completed'
  startTime: number
}

class MatchmakingServer {
  private wss: WebSocketServer
  private players: Map<string, Player> = new Map()
  private matches: Map<string, Match> = new Map()
  private searchQueue: Player[] = []

  constructor(port: number) {
    const server = createServer()
    this.wss = new WebSocketServer({ server })

    this.wss.on('connection', this.handleConnection.bind(this))
    server.listen(port, () => {
      console.log(`Matchmaking server running on port ${port}`)
    })
  }

  private handleConnection(ws: ServerWebSocket) {
    const playerId = uuidv4()
    console.log(`New connection: ${playerId}`)

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        this.handleMessage(playerId, ws, message)
      } catch (error) {
        console.error('Error parsing message:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnect(playerId)
    })
  }

  private handleMessage(playerId: string, ws: ServerWebSocket, message: any) {
    switch (message.type) {
      case 'search':
        this.handleSearch(playerId, ws, message.preferences)
        break
      case 'cancel':
        this.handleCancel(playerId)
        break
      default:
        this.sendError(ws, 'Unknown message type')
    }
  }

  private handleSearch(playerId: string, ws: ServerWebSocket, preferences: any) {
    const player: Player = {
      id: playerId,
      ws,
      preferences
    }
    this.players.set(playerId, player)
    this.searchQueue.push(player)
    this.tryMatchPlayers()
  }

  private handleCancel(playerId: string) {
    const player = this.players.get(playerId)
    if (player) {
      this.searchQueue = this.searchQueue.filter(p => p.id !== playerId)
      this.players.delete(playerId)
    }
  }

  private handleDisconnect(playerId: string) {
    this.handleCancel(playerId)
    const match = Array.from(this.matches.values()).find(
      m => m.players.some(p => p.id === playerId)
    )
    if (match) {
      this.handleMatchDisconnect(match, playerId)
    }
  }

  private handleMatchDisconnect(match: Match, disconnectedPlayerId: string) {
    const otherPlayer = match.players.find(p => p.id !== disconnectedPlayerId)
    if (otherPlayer) {
      this.sendMessage(otherPlayer.ws, {
        type: 'match',
        matchId: match.id,
        status: 'disconnected'
      })
    }
    this.matches.delete(match.id)
  }

  private tryMatchPlayers() {
    while (this.searchQueue.length >= 2) {
      const player1 = this.searchQueue[0]
      const player2 = this.findBestMatch(player1)
      
      if (player2) {
        this.searchQueue = this.searchQueue.filter(p => 
          p.id !== player1.id && p.id !== player2.id
        )
        this.createMatch(player1, player2)
      } else {
        break
      }
    }
  }

  private findBestMatch(player: Player): Player | null {
    // Simple matching: same region and connection type
    return this.searchQueue.find(p => 
      p.id !== player.id &&
      p.preferences.island === player.preferences.island &&
      p.preferences.connection === player.preferences.connection
    ) || null
  }

  private createMatch(player1: Player, player2: Player) {
    const matchId = uuidv4()
    const match: Match = {
      id: matchId,
      players: [player1, player2],
      status: 'pending',
      startTime: Date.now()
    }
    this.matches.set(matchId, match)

    // Notify both players
    this.sendMessage(player1.ws, {
      type: 'match',
      matchId,
      status: 'found',
      opponent: {
        id: player2.id,
        preferences: player2.preferences
      }
    })

    this.sendMessage(player2.ws, {
      type: 'match',
      matchId,
      status: 'found',
      opponent: {
        id: player1.id,
        preferences: player1.preferences
      }
    })
  }

  private sendMessage(ws: ServerWebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: ServerWebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error
    })
  }
}

// Start the server
new MatchmakingServer(3001) 
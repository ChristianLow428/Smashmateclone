'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  type?: 'user' | 'system'
}

interface MatchChatProps {
  matchId: string
  opponent: {
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
  onLeaveMatch: () => void
}

export default function MatchChat({ matchId, opponent, onLeaveMatch }: MatchChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Connect to match chat WebSocket
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? `ws://localhost:3001/match/${matchId}`
      : `wss://your-production-websocket-url.com/match/${matchId}`

    console.log('Connecting to match chat at:', wsUrl)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('Connected to match chat')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received chat message:', data)
        
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: data.id,
            sender: data.sender,
            content: data.content,
            timestamp: new Date(data.timestamp),
            type: 'user'
          }])
        } else if (data.type === 'chat_history') {
          // Load existing chat messages
          const historyMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            type: 'user'
          }))
          setMessages(historyMessages)
        } else if (data.type === 'opponent_left') {
          console.log('Opponent left message received:', data)
          setOpponentLeft(true)
          const systemMessage = {
            id: `system-${Date.now()}`,
            sender: 'System',
            content: data.message || 'Your opponent has left the match.',
            timestamp: new Date(),
            type: 'system' as const
          }
          console.log('Adding system message:', systemMessage)
          setMessages(prev => [...prev, systemMessage])
        }
      } catch (error) {
        console.error('Error parsing chat message:', error)
      }
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      console.log('Disconnected from match chat:', event.code, event.reason)
    }

    ws.onerror = (error) => {
      console.error('Match chat WebSocket error:', error)
      setIsConnected(false)
    }

    return () => {
      console.log('Cleaning up match chat WebSocket connection')
      ws.close()
    }
  }, [matchId])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || opponentLeft) {
      return
    }

    const message = {
      type: 'chat',
      content: newMessage,
      sender: session?.user?.name || 'Anonymous',
      timestamp: new Date().toISOString()
    }

    wsRef.current.send(JSON.stringify(message))
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLeaveMatch = () => {
    const confirmed = window.confirm('Are you sure you want to leave this match? This will disconnect you from your opponent.')
    if (confirmed) {
      onLeaveMatch()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold">Match Chat</h3>
          <p className="text-xs opacity-90">
            {opponent.preferences.island} ({opponent.preferences.connection})
            {opponentLeft && <span className="text-red-300 ml-1">• Left</span>}
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            <p className="text-sm">Start chatting!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'system' ? 'justify-center' : message.sender === session?.user?.name ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-full px-2 py-1 rounded text-sm ${
                  message.type === 'system'
                    ? 'bg-gray-100 text-gray-600 text-center italic'
                    : message.sender === session?.user?.name
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {message.type !== 'system' && (
                  <div className="text-xs opacity-75 mb-1">{message.sender}</div>
                )}
                <div className="text-sm">{message.content}</div>
                {message.type !== 'system' && (
                  <div className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={opponentLeft ? "Opponent left" : "Type message..."}
            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={!isConnected || opponentLeft}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !newMessage.trim() || opponentLeft}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
} 
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
    displayName?: string
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
  opponentLeft?: boolean
  sendChatMessage?: (matchId: string, content: string) => Promise<void>
  onChatMessage?: (message: any) => void
}

export default function MatchChat({ matchId, opponent, onLeaveMatch, opponentLeft = false, sendChatMessage, onChatMessage }: MatchChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(true) // Assume connected since we're using the main WebSocket
  const messagesEndRef = useRef<HTMLDivElement>(null)

  console.log('MatchChat render:', {
    matchId,
    opponentLeft,
    messagesCount: messages.length,
    isConnected,
    hasSendChatMessage: !!sendChatMessage,
    hasOnChatMessage: !!onChatMessage
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add system message when opponent leaves
  useEffect(() => {
    if (opponentLeft) {
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        sender: 'System',
        content: 'Your opponent has left the match.',
        timestamp: new Date(),
        type: 'system'
      }
      console.log('System message created:', systemMessage)
      setMessages(prev => {
        console.log('Previous messages count:', prev.length)
        const newMessages = [...prev, systemMessage]
        console.log('New messages count:', newMessages.length)
        return newMessages
      })
    }
  }, [opponentLeft, matchId])

  // Listen for chat messages from the parent component
  useEffect(() => {
    if (onChatMessage) {
      const handleChatMessage = (message: any) => {
        console.log('MatchChat received chat message:', message)
        
        if (message.type === 'chat') {
          const newChatMessage: Message = {
            id: message.id,
            sender: session?.user && message.sender === session.user.email
              ? session.user.name || 'You'
              : opponent.displayName || 'Opponent',
            content: message.content,
            timestamp: new Date(message.timestamp),
            type: 'user'
          }
          setMessages(prev => [...prev, newChatMessage])
        } else if (message.type === 'chat_history') {
          const chatMessages = message.messages.map((msg: any) => ({
            id: msg.id,
            sender: session?.user && msg.sender === session.user.email
              ? session.user.name || 'You'
              : opponent.displayName || 'Opponent',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            type: 'user' as const
          }))
          setMessages(chatMessages)
        }
      }

      // Set up the callback
      onChatMessage(handleChatMessage)
    }
  }, [onChatMessage, session, opponent.displayName])

  const sendMessage = async () => {
    console.log('sendMessage called:', {
      newMessage: newMessage.trim(),
      sessionEmail: session?.user?.email,
      opponentLeft,
      hasSendChatMessage: !!sendChatMessage
    })
    
    if (!newMessage.trim()) {
      console.log('Message is empty, not sending')
      return
    }
    
    if (!session?.user?.email) {
      console.log('No session email, not sending')
      return
    }
    
    if (opponentLeft) {
      console.log('Opponent left, not sending')
      return
    }

    try {
      if (sendChatMessage) {
        // Use the passed sendChatMessage function (WebSocket)
        console.log('Using WebSocket sendChatMessage')
        await sendChatMessage(matchId, newMessage.trim())
        
        // Don't add message locally - wait for server to send it back
        // This prevents duplicate messages
      } else {
        console.log('No chat method available')
        return
      }

      console.log('Message sent successfully')
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
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
    <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border h-full flex flex-col">
      {/* Header */}
      <div className={`text-white p-2 md:p-3 rounded-t-lg flex justify-between items-center ${opponentLeft ? 'bg-red-600' : 'bg-hawaii-primary'}`}>
        <div>
          <h3 className="text-sm font-semibold font-monopol">Match Chat</h3>
          <p className="text-xs opacity-90">
            {opponent.preferences.island} ({opponent.preferences.connection})
            {opponentLeft && <span className="text-red-200 ml-1 font-semibold">• OPPONENT LEFT</span>}
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 min-h-0 overscroll-contain scroll-smooth-ios">
        {opponentLeft && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 md:p-3 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-800 font-semibold text-sm font-monopol">Opponent has left the match</span>
            </div>
            <p className="text-red-700 text-xs mt-1">You can no longer send messages to them.</p>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center text-hawaii-muted mt-4">
            <p className="text-sm font-monopol">Start chatting!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'system' ? 'justify-center' : message.sender === (session?.user?.name || 'You') ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-2 py-1 rounded text-sm ${
                  message.type === 'system'
                    ? 'bg-card-bg-alt text-hawaii-muted text-center italic border border-hawaii-border'
                    : message.sender === (session?.user?.name || 'You')
                    ? 'bg-hawaii-primary text-white'
                    : 'bg-card-bg-alt text-hawaii-accent border border-hawaii-border'
                }`}
              >
                {message.type !== 'system' && (
                  <div className="text-xs opacity-75 mb-1">{message.sender}</div>
                )}
                <div className="text-sm break-words">{message.content}</div>
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
      <div className="p-2 md:p-3 border-t border-hawaii-border">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={opponentLeft ? "Opponent left" : "Type message..."}
            className="flex-1 px-2 py-1 text-sm border border-hawaii-border bg-card-bg-alt text-hawaii-muted rounded focus:outline-none focus:ring-1 focus:ring-hawaii-primary focus:border-hawaii-primary"
            disabled={opponentLeft}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || opponentLeft}
            className="px-2 md:px-3 py-1 bg-hawaii-primary text-white rounded text-sm hover:bg-hawaii-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-monopol"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
} 
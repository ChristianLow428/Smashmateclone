'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/utils/supabase/client'

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
  const chatChannel = useRef<any>(null)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const [usePolling, setUsePolling] = useState(false)

  useEffect(() => {
    // Load existing chat messages
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('match_chat_messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading chat messages:', error)
          // If there's an error loading messages, just start with empty messages
          setMessages([])
          return
        }

        const chatMessages = data.map(msg => ({
          id: msg.id,
          sender: session?.user && msg.sender_id === session.user.email
            ? session.user.name || 'You'
            : 'Opponent',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          type: 'user' as const
        }))

        setMessages(chatMessages)
      } catch (error) {
        console.error('Error loading messages:', error)
        // If there's an error, just start with empty messages
        setMessages([])
      }
    }

    loadMessages()

    // Start polling for new messages
    const startPolling = () => {
      console.log('Starting chat polling as fallback')
      setUsePolling(true)
      setIsConnected(true)
      
      pollingInterval.current = setInterval(async () => {
      try {
          const { data, error } = await supabase
            .from('match_chat_messages')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true })

          if (error) {
            console.error('Error polling chat messages:', error)
            // Don't update messages on error, just continue polling
            return
          }

          const chatMessages = data.map(msg => ({
            id: msg.id,
            sender: session?.user && msg.sender_id === session.user.email
              ? session.user.name || 'You'
              : 'Opponent',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            type: 'user' as const
          }))

          setMessages(chatMessages)
        } catch (error) {
          console.error('Error polling messages:', error)
          // Don't update messages on error, just continue polling
        }
      }, 2000) // Poll every 2 seconds
    }

    // Subscribe to new chat messages with better error handling
    const setupChatSubscription = async () => {
      try {
        console.log('Setting up chat subscription for match:', matchId)
        
        // First, test if real-time is working at all
        const testChannel = supabase.channel('test-connection')
        testChannel.subscribe((status) => {
          console.log('Test channel status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('Real-time is working, proceeding with chat subscription')
            supabase.removeChannel(testChannel)
            setupActualChatSubscription()
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('Real-time not available, using polling')
            supabase.removeChannel(testChannel)
            startPolling()
          }
        })
        
        // Timeout for test
        setTimeout(() => {
          if (!isConnected && !usePolling) {
            console.log('Real-time test timeout, using polling')
            supabase.removeChannel(testChannel)
            startPolling()
        }
        }, 3000)

      } catch (error) {
        console.error('Error setting up chat subscription:', error)
        setIsConnected(false)
        startPolling()
      }
    }

    const setupActualChatSubscription = () => {
      try {
        // Create a unique channel name
        const channelName = `chat-${matchId}-${Date.now()}`
        console.log('Using channel name:', channelName)
        
        chatChannel.current = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'match_chat_messages',
              filter: `match_id=eq.${matchId}`
            },
            (payload) => {
              console.log('Received chat message:', payload)
              const newMessage = payload.new
              const message: Message = {
                id: newMessage.id,
                sender: session?.user && newMessage.sender_id === session.user.email
                  ? session.user.name || 'You'
                  : 'Opponent',
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at),
                type: 'user'
              }
              setMessages(prev => [...prev, message])
            }
          )
          .subscribe((status) => {
            console.log('Chat subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              console.log('Chat subscription successful')
              setIsConnected(true)
              setUsePolling(false)
              // Send a test message to verify connection
              setTimeout(() => {
                sendTestMessage()
              }, 1000)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.error(`Chat subscription failed with status: ${status}, falling back to polling`)
      setIsConnected(false)
              setUsePolling(true)
              startPolling()
    }
          })
      } catch (error) {
        console.error('Error setting up actual chat subscription:', error)
      setIsConnected(false)
        startPolling()
      }
    }

    setupChatSubscription()

    return () => {
      console.log('Cleaning up chat subscription')
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current)
      }
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [matchId, session?.user?.email, session?.user?.name])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !session?.user?.email || opponentLeft) {
      return
    }

    try {
      const { error } = await supabase
        .from('match_chat_messages')
        .insert({
          match_id: matchId,
          sender_id: session.user.email,
          content: newMessage.trim()
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

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

  const sendTestMessage = async () => {
    if (!session?.user?.email) return
    
    try {
      const { error } = await supabase
        .from('match_chat_messages')
        .insert({
          match_id: matchId,
          sender_id: session.user.email,
          content: 'Test message - chat connection working!'
        })

      if (error) {
        console.error('Error sending test message:', error)
      } else {
        console.log('Test message sent successfully')
      }
    } catch (error) {
      console.error('Error sending test message:', error)
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
        <div className="flex items-center space-x-2">
          <button
            onClick={sendTestMessage}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            title="Send test message"
          >
            Test
          </button>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-xs">
              {isConnected ? (usePolling ? 'Polling' : 'Connected') : 'Disconnected'}
            </span>
          </div>
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
              className={`flex ${message.type === 'system' ? 'justify-center' : message.sender === (session?.user?.name || 'You') ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-full px-2 py-1 rounded text-sm ${
                  message.type === 'system'
                    ? 'bg-gray-100 text-gray-600 text-center italic'
                    : message.sender === (session?.user?.name || 'You')
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
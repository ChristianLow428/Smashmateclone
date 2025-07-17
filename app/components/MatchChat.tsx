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
}

export default function MatchChat({ matchId, opponent, onLeaveMatch, opponentLeft = false }: MatchChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatChannel = useRef<any>(null)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const [usePolling, setUsePolling] = useState(false)

  console.log('MatchChat render:', {
    matchId,
    opponentLeft,
    messagesCount: messages.length,
    isConnected,
    usePolling
  })

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
            : opponent.displayName || 'Opponent',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          type: 'user' as const
        }))

        // Preserve system messages when loading initial messages
        setMessages(prev => {
          const systemMessages = prev.filter(msg => msg.type === 'system')
          return [...chatMessages, ...systemMessages]
        })
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
              : opponent.displayName || 'Opponent',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            type: 'user' as const
          }))

          // Preserve system messages when updating from polling
          setMessages(prev => {
            const systemMessages = prev.filter(msg => msg.type === 'system')
            return [...chatMessages, ...systemMessages]
          })
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
                  : opponent.displayName || 'Opponent',
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

  // Add system message when opponent leaves
  useEffect(() => {
    console.log('opponentLeft useEffect triggered:', {
      opponentLeft,
      currentMessagesCount: messages.length,
      matchId
    })
    
    if (opponentLeft) {
      console.log('Adding system message for opponent left')
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

  const sendMessage = async () => {
    console.log('sendMessage called:', {
      newMessage: newMessage.trim(),
      sessionEmail: session?.user?.email,
      opponentLeft,
      isConnected,
      usePolling
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
    
    if (!isConnected) {
      console.log('Not connected, not sending')
      return
    }

    try {
      console.log('Attempting to send message to database')
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
        <div className="flex items-center space-x-1 md:space-x-2">
          <button
            onClick={sendTestMessage}
            className="px-1 md:px-2 py-1 bg-hawaii-accent text-white rounded text-xs hover:bg-hawaii-secondary transition-colors"
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
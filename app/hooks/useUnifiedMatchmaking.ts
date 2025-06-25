import { useState, useEffect, useCallback } from 'react'
import { supabaseMatchmakingService, MatchmakingPreferences } from '../services/supabase-matchmaking'

// Determine if we should use WebSocket or Supabase
// Use WebSocket only for local development, Supabase for production
const useWebSocket = process.env.NODE_ENV === 'development' && 
                    typeof window !== 'undefined' && 
                    window.location.hostname === 'localhost'

export function useUnifiedMatchmaking() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (useWebSocket) {
      // Use WebSocket service for local development - lazy load it
      console.log('Using WebSocket matchmaking service (local development)')
      
      // Dynamically import the WebSocket service only when needed
      import('../services/matchmaking').then(({ matchmakingService }) => {
        matchmakingService.onMatch((matchId) => {
          console.log('WebSocket: Match found:', matchId)
          setCurrentMatch(matchId)
          setIsSearching(false)
        })

        matchmakingService.onMatchStatus((status) => {
          console.log('WebSocket: Match status update:', status)
          setMatchStatus(status)
        })

        matchmakingService.onError((error) => {
          console.error('WebSocket: Matchmaking error:', error)
          setError(error)
          setIsSearching(false)
        })
      }).catch((error) => {
        console.error('Failed to load WebSocket service, falling back to Supabase:', error)
        // Fallback to Supabase if WebSocket fails to load
        setupSupabaseCallbacks()
      })

      return () => {
        // Cleanup will be handled by the service itself
      }
    } else {
      // Use Supabase service for production/Vercel
      console.log('Using Supabase matchmaking service (production)')
      setupSupabaseCallbacks()
      
      return () => {
        supabaseMatchmakingService.disconnect()
      }
    }
  }, [])

  const setupSupabaseCallbacks = () => {
      supabaseMatchmakingService.onMatch((matchId) => {
        console.log('Supabase: Match found:', matchId)
        setCurrentMatch(matchId)
        setIsSearching(false)
      })

      supabaseMatchmakingService.onMatchStatus((status) => {
        console.log('Supabase: Match status update:', status)
        setMatchStatus(status)
      })

      supabaseMatchmakingService.onError((error) => {
        console.error('Supabase: Matchmaking error:', error)
        setError(error)
        setIsSearching(false)
      })
    }

  const startSearch = useCallback(async (preferences: MatchmakingPreferences, userId?: string) => {
    setError(null)
    setIsSearching(true)
    
    if (useWebSocket) {
      // Dynamically import and use WebSocket service
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.startSearch(preferences)
    } else {
      if (!userId) {
        setError('User ID is required for Supabase matchmaking')
        setIsSearching(false)
        return
      }
      await supabaseMatchmakingService.startSearch(preferences, userId)
    }
  }, [useWebSocket])

  const cancelSearch = useCallback(async () => {
    setIsSearching(false)
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.cancelSearch()
    } else {
      await supabaseMatchmakingService.cancelSearch()
    }
  }, [useWebSocket])

  const leaveMatch = useCallback(async (matchId: string) => {
    setCurrentMatch(null)
    setMatchStatus(null)
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.leaveMatch(matchId)
    } else {
      await supabaseMatchmakingService.leaveMatch(matchId)
    }
  }, [useWebSocket])

  const selectCharacter = useCallback(async (matchId: string, character: string) => {
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.selectCharacter(matchId, character)
    } else {
      await supabaseMatchmakingService.selectCharacter(matchId, character)
    }
  }, [useWebSocket])

  const banStage = useCallback(async (matchId: string, stage: string) => {
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.banStage(matchId, stage)
    } else {
      await supabaseMatchmakingService.banStage(matchId, stage)
    }
  }, [useWebSocket])

  const pickStage = useCallback(async (matchId: string, stage: string) => {
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.pickStage(matchId, stage)
    } else {
      await supabaseMatchmakingService.pickStage(matchId, stage)
    }
  }, [useWebSocket])

  const reportGameResult = useCallback(async (matchId: string, winner: number) => {
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      matchmakingService.reportGameResult(matchId, winner)
    } else {
      await supabaseMatchmakingService.reportGameResult(matchId, winner)
    }
  }, [useWebSocket])

  const resetPlayerStatus = useCallback(async () => {
    if (useWebSocket) {
      const { matchmakingService } = await import('../services/matchmaking')
      // WebSocket service might not have resetPlayerStatus, so we'll just reset local state
      console.log('Resetting player status for WebSocket service')
    } else {
      await supabaseMatchmakingService.resetPlayerStatus()
    }
    setCurrentMatch(null)
    setMatchStatus(null)
    setError(null)
    setIsSearching(false)
  }, [useWebSocket])

  const sendChatMessage = useCallback(async (matchId: string, content: string) => {
    if (useWebSocket) {
      // WebSocket chat is handled through the WebSocket
      console.log('Chat message:', content)
    } else {
      await supabaseMatchmakingService.sendChatMessage(matchId, content)
    }
  }, [useWebSocket])

  return {
    isSearching,
    currentMatch,
    matchStatus,
    error,
    startSearch,
    cancelSearch,
    leaveMatch,
    selectCharacter,
    banStage,
    pickStage,
    reportGameResult,
    resetPlayerStatus,
    sendChatMessage,
    useWebSocket // Expose this for debugging
  }
} 
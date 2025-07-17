import { useState, useEffect, useCallback } from 'react'
import { supabaseMatchmakingService, MatchmakingPreferences } from '../services/supabase-matchmaking'

// Use WebSocket for both development and production to avoid Supabase permission issues
// The WebSocket server handles all matchmaking logic
const useWebSocket = true // Always use WebSocket

export function useUnifiedMatchmaking() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (useWebSocket) {
      // Use WebSocket service for all environments
      console.log('Using WebSocket matchmaking service')
      
      // Dynamically import the WebSocket service
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
        console.error('Failed to load WebSocket service:', error)
        setError('Failed to connect to matchmaking server. Please try again.')
      })

      return () => {
        // Cleanup will be handled by the service itself
      }
    } else {
      // Fallback to Supabase service (not used anymore)
      console.log('Using Supabase matchmaking service (fallback)')
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
      
      // Handle opponent information when reconnecting to existing match
      if (status.type === 'match_state' && status.opponent) {
        console.log('Setting opponent from match status:', status.opponent)
        // The opponent info will be handled by the page component
      }
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
      // Use WebSocket service
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.startSearch(preferences)
      } catch (error) {
        console.error('Error starting WebSocket search:', error)
        setError('Failed to start search. Please try again.')
        setIsSearching(false)
      }
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
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.cancelSearch()
      } catch (error) {
        console.error('Error canceling WebSocket search:', error)
      }
    } else {
      await supabaseMatchmakingService.cancelSearch()
    }
  }, [useWebSocket])

  const leaveMatch = useCallback(async (matchId: string) => {
    setCurrentMatch(null)
    setMatchStatus(null)
    if (useWebSocket) {
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.leaveMatch(matchId)
      } catch (error) {
        console.error('Error leaving WebSocket match:', error)
      }
    } else {
      await supabaseMatchmakingService.leaveMatch(matchId)
    }
  }, [useWebSocket])

  const selectCharacter = useCallback(async (matchId: string, character: string) => {
    if (useWebSocket) {
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.selectCharacter(matchId, character)
      } catch (error) {
        console.error('Error selecting character:', error)
      }
    } else {
      await supabaseMatchmakingService.selectCharacter(matchId, character)
    }
  }, [useWebSocket])

  const banStage = useCallback(async (matchId: string, stage: string) => {
    if (useWebSocket) {
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.banStage(matchId, stage)
      } catch (error) {
        console.error('Error banning stage:', error)
      }
    } else {
      await supabaseMatchmakingService.banStage(matchId, stage)
    }
  }, [useWebSocket])

  const pickStage = useCallback(async (matchId: string, stage: string) => {
    if (useWebSocket) {
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.pickStage(matchId, stage)
      } catch (error) {
        console.error('Error picking stage:', error)
      }
    } else {
      await supabaseMatchmakingService.pickStage(matchId, stage)
    }
  }, [useWebSocket])

  const reportGameResult = useCallback(async (matchId: string, winner: number) => {
    if (useWebSocket) {
      try {
        const { matchmakingService } = await import('../services/matchmaking')
        matchmakingService.reportGameResult(matchId, winner)
      } catch (error) {
        console.error('Error reporting game result:', error)
      }
    } else {
      await supabaseMatchmakingService.reportGameResult(matchId, winner)
    }
  }, [useWebSocket])

  const resetPlayerStatus = useCallback(async () => {
    if (useWebSocket) {
      // WebSocket service doesn't need reset - just clear local state
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
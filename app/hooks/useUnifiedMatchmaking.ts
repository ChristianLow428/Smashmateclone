import { useState, useEffect, useCallback } from 'react'
import { supabaseMatchmakingService } from '../services/supabase-matchmaking'

export interface MatchmakingPreferences {
  island: string
  connection: 'wired' | 'wireless'
  rules: {
    stock: number
    time: number
    items: boolean
    stageHazards: boolean
  }
}

export function useUnifiedMatchmaking() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Determine which service to use based on environment
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const useWebSocket = isDevelopment && isLocalhost

  // Debug logging
  console.log('Environment detection:', {
    NODE_ENV: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    isDevelopment,
    isLocalhost,
    useWebSocket
  })

  useEffect(() => {
    if (useWebSocket) {
      // Use WebSocket service for local development - lazy load it
      console.log('Using WebSocket matchmaking service')
      
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
      })

      return () => {
        // Cleanup will be handled by the service itself
      }
    } else {
      // Use Supabase service for production/Vercel
      console.log('Using Supabase matchmaking service')
      
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

      return () => {
        supabaseMatchmakingService.disconnect()
      }
    }
  }, [useWebSocket])

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
    sendChatMessage,
    useWebSocket // Expose this for debugging
  }
} 
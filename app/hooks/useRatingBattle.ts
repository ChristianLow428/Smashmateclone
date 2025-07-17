import { useState, useEffect, useCallback } from 'react'
import { ratingBattleService, RatingBattlePreferences } from '../services/rating-battle'

// Use WebSocket for both development and production to avoid Supabase permission issues
// The WebSocket server handles all rating battle logic
const useWebSocket = true // Always use WebSocket

export function useRatingBattle() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (useWebSocket) {
      // Use WebSocket service for all environments
      console.log('Using WebSocket rating battle service')
      
      // Set up rating battle service callbacks
      ratingBattleService.onMatch((matchId) => {
        console.log('WebSocket: Rating match found:', matchId)
        setCurrentMatch(matchId)
        setIsSearching(false)
      })

      ratingBattleService.onMatchStatus((status) => {
        console.log('WebSocket: Rating match status update:', status)
        setMatchStatus(status)
      })

      ratingBattleService.onError((error) => {
        console.error('WebSocket: Rating battle error:', error)
        setError(error)
        setIsSearching(false)
      })

      return () => {
        ratingBattleService.disconnect()
      }
    } else {
      // Fallback to Supabase service (not used anymore)
      console.log('Using Supabase rating battle service (fallback)')
      
      ratingBattleService.onMatch((matchId) => {
        console.log('Supabase: Rating match found:', matchId)
        setCurrentMatch(matchId)
        setIsSearching(false)
      })

      ratingBattleService.onMatchStatus((status) => {
        console.log('Supabase: Rating match status update:', status)
        setMatchStatus(status)
      })

      ratingBattleService.onError((error) => {
        console.error('Supabase: Rating battle error:', error)
        setError(error)
        setIsSearching(false)
      })

      return () => {
        ratingBattleService.disconnect()
      }
    }
  }, [])

  const startSearch = useCallback(async (preferences: RatingBattlePreferences) => {
    setError(null)
    setIsSearching(true)
    setCurrentMatch(null)
    setMatchStatus(null)
    
    try {
      await ratingBattleService.startRatingSearch(preferences)
    } catch (error) {
      console.error('Error starting rating search:', error)
      setError('Failed to start rating search')
      setIsSearching(false)
    }
  }, [])

  const cancelSearch = useCallback(async () => {
    setIsSearching(false)
    ratingBattleService.cancelRatingSearch()
  }, [])

  const leaveMatch = useCallback(async (matchId: string) => {
    setCurrentMatch(null)
    setMatchStatus(null)
    ratingBattleService.leaveRatingMatch(matchId)
  }, [])

  const selectCharacter = useCallback(async (matchId: string, character: string) => {
    ratingBattleService.selectCharacter(matchId, character)
  }, [])

  const banStage = useCallback(async (matchId: string, stage: string) => {
    ratingBattleService.banStage(matchId, stage)
  }, [])

  const pickStage = useCallback(async (matchId: string, stage: string) => {
    ratingBattleService.pickStage(matchId, stage)
  }, [])

  const reportGameResult = useCallback(async (matchId: string, winner: number) => {
    ratingBattleService.reportGameResult(matchId, winner)
  }, [])

  const resetPlayerStatus = useCallback(async () => {
    setCurrentMatch(null)
    setMatchStatus(null)
    setError(null)
    setIsSearching(false)
  }, [])

  const sendChatMessage = useCallback(async (matchId: string, content: string) => {
    // Send chat message through WebSocket
    ratingBattleService.sendChatMessage(matchId, content)
  }, [])

  const onChatMessage = useCallback((callback: (message: any) => void) => {
    ratingBattleService.onChatMessage(callback)
  }, [])

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
    onChatMessage,
    useWebSocket // Expose this for debugging
  }
} 
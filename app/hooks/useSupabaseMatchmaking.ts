import { useState, useEffect, useCallback } from 'react'
import { supabaseMatchmakingService, MatchmakingPreferences } from '../services/supabase-matchmaking'
import { matchmakingService } from '../services/matchmaking'

export function useSupabaseMatchmaking() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set up callbacks
    supabaseMatchmakingService.onMatch((matchId) => {
      console.log('Match found:', matchId)
      setCurrentMatch(matchId)
      setIsSearching(false)
    })

    supabaseMatchmakingService.onMatchStatus((status) => {
      console.log('Match status update:', status)
      setMatchStatus(status)
    })

    supabaseMatchmakingService.onError((error) => {
      console.error('Matchmaking error:', error)
      setError(error)
      setIsSearching(false)
    })

    // Cleanup on unmount
    return () => {
      supabaseMatchmakingService.disconnect()
    }
  }, [])

  const startSearch = useCallback(async (preferences: MatchmakingPreferences, userId: string) => {
    setError(null)
    setIsSearching(true)
    await supabaseMatchmakingService.startSearch(preferences, userId)
  }, [])

  const cancelSearch = useCallback(async () => {
    setIsSearching(false)
    await supabaseMatchmakingService.cancelSearch()
  }, [])

  const leaveMatch = useCallback(async (matchId: string) => {
    setCurrentMatch(null)
    setMatchStatus(null)
    await supabaseMatchmakingService.leaveMatch(matchId)
  }, [])

  const selectCharacter = useCallback(async (matchId: string, character: string) => {
    await supabaseMatchmakingService.selectCharacter(matchId, character)
  }, [])

  const banStage = useCallback(async (matchId: string, stage: string) => {
    await supabaseMatchmakingService.banStage(matchId, stage)
  }, [])

  const pickStage = useCallback(async (matchId: string, stage: string) => {
    await supabaseMatchmakingService.pickStage(matchId, stage)
  }, [])

  const reportGameResult = useCallback(async (matchId: string, winner: number) => {
    await supabaseMatchmakingService.reportGameResult(matchId, winner)
  }, [])

  const sendChatMessage = useCallback(async (matchId: string, content: string) => {
    matchmakingService.sendChatMessage(matchId, content)
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
    sendChatMessage
  }
} 
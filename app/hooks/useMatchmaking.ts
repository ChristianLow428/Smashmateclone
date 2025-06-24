import { useState, useEffect, useCallback } from 'react'
import { matchmakingService } from '../services/matchmaking'

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

export function useMatchmaking() {
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set up callbacks
    matchmakingService.onMatch((matchId) => {
      console.log('Match found:', matchId)
      setCurrentMatch(matchId)
      setIsSearching(false)
    })

    matchmakingService.onMatchStatus((status) => {
      console.log('Match status update:', status)
      setMatchStatus(status)
    })

    matchmakingService.onError((error) => {
      console.error('Matchmaking error:', error)
      setError(error)
      setIsSearching(false)
    })

    // Cleanup on unmount
    return () => {
      matchmakingService.disconnect()
    }
  }, [])

  const startSearch = useCallback(async (preferences: MatchmakingPreferences) => {
    setError(null)
    setIsSearching(true)
    matchmakingService.startSearch(preferences)
  }, [])

  const cancelSearch = useCallback(async () => {
    setIsSearching(false)
    matchmakingService.cancelSearch()
  }, [])

  const leaveMatch = useCallback(async (matchId: string) => {
    setCurrentMatch(null)
    setMatchStatus(null)
    matchmakingService.leaveMatch(matchId)
  }, [])

  const selectCharacter = useCallback(async (matchId: string, character: string) => {
    matchmakingService.selectCharacter(matchId, character)
  }, [])

  const banStage = useCallback(async (matchId: string, stage: string) => {
    matchmakingService.banStage(matchId, stage)
  }, [])

  const pickStage = useCallback(async (matchId: string, stage: string) => {
    matchmakingService.pickStage(matchId, stage)
  }, [])

  const reportGameResult = useCallback(async (matchId: string, winner: number) => {
    matchmakingService.reportGameResult(matchId, winner)
  }, [])

  const sendChatMessage = useCallback(async (matchId: string, content: string) => {
    // For WebSocket-based matchmaking, chat is handled through the WebSocket
    // This is a placeholder - you might want to implement chat differently
    console.log('Chat message:', content)
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
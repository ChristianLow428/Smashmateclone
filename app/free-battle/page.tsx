'use client'

import { useState, useEffect } from 'react'
import { useUnifiedMatchmaking } from '../hooks/useUnifiedMatchmaking'
import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'
import TournamentMatch from '../components/TournamentMatch'

interface MatchPreferences {
  island: string
  connection: 'wired' | 'wireless'
  rules: {
    stock: number
    time: number
    items: boolean
    stageHazards: boolean
  }
}

interface Opponent {
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

export default function FreeBattle() {
  const { data: session, status } = useSession()
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [playerIndex, setPlayerIndex] = useState<number | null>(null)
  const [matchEnded, setMatchEnded] = useState<boolean>(false)
  const [preferences, setPreferences] = useState<MatchPreferences>({
    island: 'Oʻahu',
    connection: 'wired',
    rules: {
      stock: 3,
      time: 7,
      items: false,
      stageHazards: false
    }
  })

  // Debug session state
  useEffect(() => {
    console.log('FreeBattle: Session status changed:', {
      status,
      session: session ? 'exists' : 'null',
      user: session?.user ? 'exists' : 'null'
    })
  }, [session, status])

  const {
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
    onChatMessage,
    useWebSocket,
    resetPlayerStatus
  } = useUnifiedMatchmaking()

  useEffect(() => {
    if (matchStatus) {
      console.log('Match status update:', matchStatus)
      console.log('Current opponent state:', opponent)
      console.log('Current player index state:', playerIndex)
      console.log('Current match state:', currentMatch)
      
      // Handle WebSocket match messages
      if (useWebSocket && matchStatus.type === 'match' && matchStatus.status === 'character_selection') {
        setOpponent(matchStatus.opponent)
        setPlayerIndex(matchStatus.playerIndex)
        setMatchEnded(false)
        console.log('WebSocket: Character selection phase started')
        console.log('Opponent:', matchStatus.opponent)
        console.log('Player index:', matchStatus.playerIndex)
      }
      // Handle Supabase match messages
      else if (!useWebSocket && matchStatus.type === 'match' && matchStatus.status === 'character_selection') {
        setOpponent(matchStatus.opponent)
        setPlayerIndex(matchStatus.playerIndex)
        setMatchEnded(false)
        console.log('Supabase: Character selection phase started')
        console.log('Opponent:', matchStatus.opponent)
        console.log('Player index:', matchStatus.playerIndex)
      }
      // Handle match state updates (for reconnecting to existing matches)
      else if (matchStatus.type === 'match_state' && matchStatus.opponent) {
        setOpponent(matchStatus.opponent)
        setPlayerIndex(matchStatus.playerIndex)
        setMatchEnded(false)
        console.log('Reconnecting to existing match:')
        console.log('Opponent:', matchStatus.opponent)
        console.log('Player index:', matchStatus.playerIndex)
        console.log('Match status:', matchStatus.status)
      }
      else if (matchStatus.type === 'match_state' && matchStatus.status === 'stage_striking') {
        console.log('Stage striking phase started')
      } else if (matchStatus.type === 'match_state' && matchStatus.status === 'active') {
        console.log('Game is now active')
      } else if (matchStatus.type === 'match_complete') {
        console.log('Match completed')
        setMatchEnded(true)
      } else if (matchStatus.type === 'opponent_left') {
        console.log('Opponent left')
        setMatchEnded(true)
      }
    }
  }, [matchStatus, useWebSocket, opponent, playerIndex, currentMatch])

  // Handle when currentMatch becomes null (match ended/left)
  useEffect(() => {
    if (!currentMatch) {
      console.log('Current match is null, clearing opponent and player index')
      setOpponent(null)
      setPlayerIndex(null)
    }
  }, [currentMatch])

  // Monitor modal state changes and session
  useEffect(() => {
    const hasModal = (currentMatch && opponent) || (matchEnded && opponent)
    console.log('Modal state changed:', {
      hasModal,
      currentMatch,
      opponent: !!opponent,
      matchEnded,
      sessionStatus: status,
      sessionExists: !!session
    })
  }, [currentMatch, opponent, matchEnded, status, session])

  // Prevent showing login overlay if session is temporarily lost during modal transition
  const shouldShowLoginOverlay = status === 'unauthenticated' || (status === 'loading' && !session)
  
  // Only disable if truly unauthenticated, not during loading or temporary session loss
  const isDisabled = status === 'unauthenticated'

  const handleStartSearch = async () => {
    console.log('Starting search with preferences:', preferences)
    console.log('Session data:', session)
    
    if (!session) {
      console.error('No session available')
      return
    }
    
    const userId = (session.user as any)?.id
    if (!userId) {
      console.error('No user ID in session')
      return
    }
    
    setOpponent(null)
    setPlayerIndex(null)
    
    try {
      await startSearch(preferences, userId)
    } catch (error) {
      console.error('Error starting search:', error)
      if (error instanceof Error && error.message.includes('Already in a match')) {
        // Show a dialog asking if they want to reset their status
        const confirmed = window.confirm(
          'You are already in a match. Would you like to reset your status and start a new search?'
        )
        if (confirmed) {
          try {
            await resetPlayerStatus()
            // Try starting search again after reset
            await startSearch(preferences, userId)
          } catch (resetError) {
            console.error('Error after reset:', resetError)
          }
        }
      }
    }
  }

  const handleCancelSearch = () => {
    cancelSearch()
  }

  const handleLeaveMatch = async () => {
    const confirmed = window.confirm('Are you sure you want to leave this match? This will disconnect you from your opponent.')
    if (!confirmed) {
      return
    }
    
    console.log('handleLeaveMatch: Starting leave process')
    console.log('handleLeaveMatch: Session status:', status)
    console.log('handleLeaveMatch: Session exists:', !!session)
    
    try {
    if (currentMatch) {
      console.log('Leaving match:', currentMatch)
      await leaveMatch(currentMatch)
    }
    
    // Clear local state immediately
    setOpponent(null)
    setPlayerIndex(null)
      setMatchEnded(true)
    
    console.log('Match left, state cleared')
      console.log('handleLeaveMatch: Session status after leave:', status)
      console.log('handleLeaveMatch: Session exists after leave:', !!session)
    } catch (error) {
      console.error('Error leaving match:', error)
      // Even if there's an error, clear the local state
      setOpponent(null)
      setPlayerIndex(null)
      setMatchEnded(true)
    }
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hawaii-primary mx-auto mb-4"></div>
          <p className="text-hawaii-muted">Loading...</p>
      </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 relative">
        <h1 className="text-4xl font-bold mb-8 text-center text-hawaii-primary font-monopol">Free Battle</h1>
        {/* Hawaii Smash Ultimate Ruleset Image */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/smash_ruleset.jpg"
            alt="Hawaii Smash Ultimate Ruleset"
            width={800}
            height={600}
            className="rounded-lg shadow-lg border border-hawaii-border"
            priority
          />
          <span className="text-hawaii-muted text-sm mt-2">Hawaii Smash Ultimate Ruleset</span>
        </div>
        {/* Overlay if not logged in */}
        {shouldShowLoginOverlay && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background bg-opacity-80 backdrop-blur-sm rounded-lg border border-hawaii-border">
            <div className="bg-hawaii-primary text-white px-6 py-3 rounded-lg text-lg font-bold mb-4 shadow-lg">
              Need to login to play
            </div>
            <button
              className="bg-hawaii-secondary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-hawaii-accent transition-colors mb-4"
              onClick={() => signIn()}
            >
              Login
            </button>
            <button
              className="bg-card-bg-alt text-hawaii-muted px-8 py-3 rounded-lg text-lg font-semibold hover:bg-hawaii-border transition-colors border border-hawaii-border"
              onClick={() => window.location.href = '/'}
            >
              Go back to homepage
            </button>
          </div>
        )}
        {/* Error Message */}
        {error && (
          <div className="bg-card-bg-alt border border-hawaii-primary text-hawaii-primary px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {/* Match Preferences */}
        <div className={`bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6 mb-8 ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          <h2 className="text-2xl font-bold mb-6 text-hawaii-accent font-monopol">Match Preferences</h2>
          {/* Island Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-hawaii-muted mb-2">
              Island
            </label>
            <select
              value={preferences.island}
              onChange={(e) => setPreferences({ ...preferences, island: e.target.value })}
              className="w-full p-3 border border-hawaii-border rounded-lg bg-card-bg-alt text-hawaii-muted focus:border-hawaii-primary focus:outline-none"
              disabled={isSearching || isDisabled}
            >
              <option value="Hawaiʻi">Hawaiʻi</option>
              <option value="Maui">Maui</option>
              <option value="Lanaʻi">Lanaʻi</option>
              <option value="Molokaʻi">Molokaʻi</option>
              <option value="Oʻahu">Oʻahu</option>
              <option value="Kauaʻi">Kauaʻi</option>
            </select>
          </div>
          {/* Connection Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-hawaii-muted mb-2">
              Connection Type
            </label>
            <div className="flex space-x-6">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="wired"
                  checked={preferences.connection === 'wired'}
                  onChange={(e) => setPreferences({ ...preferences, connection: 'wired' })}
                  className="form-radio text-hawaii-primary focus:ring-hawaii-primary"
                  disabled={isSearching || isDisabled}
                />
                <span className="ml-2 text-hawaii-muted">Wired</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="wireless"
                  checked={preferences.connection === 'wireless'}
                  onChange={(e) => setPreferences({ ...preferences, connection: 'wireless' })}
                  className="form-radio text-hawaii-primary focus:ring-hawaii-primary"
                  disabled={isSearching || isDisabled}
                />
                <span className="ml-2 text-hawaii-muted">Wireless</span>
              </label>
            </div>
            <p className="text-xs text-hawaii-muted mt-2">Wired is usually preferred for optimal online play.</p>
          </div>
        </div>
        {/* Search Button */}
        <div className="text-center">
          {!isSearching ? (
            <button
              onClick={handleStartSearch}
              className="bg-hawaii-primary text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-hawaii-accent transition-colors"
              disabled={isDisabled}
            >
              Find Match
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-hawaii-primary"></div>
                <span className="text-lg text-hawaii-muted">Searching for opponent...</span>
              </div>
              <button
                onClick={handleCancelSearch}
                className="text-hawaii-primary hover:text-hawaii-accent transition-colors"
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Chat Modal */}
      {(currentMatch && opponent) || (matchEnded && opponent) ? (
                      <TournamentMatch
                matchId={currentMatch || 'ended'}
                opponent={opponent}
                onLeaveMatch={handleLeaveMatch}
                playerIndex={playerIndex}
                selectCharacter={selectCharacter}
                banStage={banStage}
                pickStage={pickStage}
                reportGameResult={reportGameResult}
                sendChatMessage={sendChatMessage}
                onChatMessage={onChatMessage}
                matchStatus={matchStatus}
                matchEnded={matchEnded}
              />
      ) : null}
    </main>
  )
} 
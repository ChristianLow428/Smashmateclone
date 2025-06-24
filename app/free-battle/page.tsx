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
    useWebSocket
  } = useUnifiedMatchmaking()

  useEffect(() => {
    // Handle match status updates
    if (matchStatus) {
      console.log('Match status update:', matchStatus)
      
      // Handle WebSocket match messages
      if (useWebSocket && matchStatus.type === 'match' && matchStatus.status === 'character_selection') {
        setOpponent(matchStatus.opponent)
        setPlayerIndex(matchStatus.playerIndex)
        console.log('WebSocket: Character selection phase started')
        console.log('Opponent:', matchStatus.opponent)
        console.log('Player index:', matchStatus.playerIndex)
      }
      // Handle Supabase match messages
      else if (!useWebSocket && matchStatus.type === 'match' && matchStatus.status === 'character_selection') {
        setOpponent(matchStatus.opponent)
        setPlayerIndex(matchStatus.playerIndex)
        console.log('Supabase: Character selection phase started')
        console.log('Opponent:', matchStatus.opponent)
        console.log('Player index:', matchStatus.playerIndex)
      }
      else if (matchStatus.type === 'match_state' && matchStatus.status === 'stage_striking') {
        console.log('Stage striking phase started')
      } else if (matchStatus.type === 'match_state' && matchStatus.status === 'active') {
        console.log('Game is now active')
      } else if (matchStatus.type === 'match_complete') {
        console.log('Match completed')
      }
    }
  }, [matchStatus, useWebSocket])

  const handleStartSearch = () => {
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
    startSearch(preferences, userId)
  }

  const handleCancelSearch = () => {
    cancelSearch()
  }

  const handleLeaveMatch = () => {
    const confirmed = window.confirm('Are you sure you want to leave this match? This will disconnect you from your opponent.')
    if (!confirmed) {
      return
    }
    
    if (currentMatch) {
      console.log('Leaving match:', currentMatch)
      leaveMatch(currentMatch)
    }
    setOpponent(null)
    setPlayerIndex(null)
  }

  const isDisabled = !session;

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto relative">
        <h1 className="text-3xl font-bold mb-8 text-center">Free Battle</h1>
        {/* Hawaii Smash Ultimate Ruleset Image */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/smash_ruleset.jpg"
            alt="Hawaii Smash Ultimate Ruleset"
            width={800}
            height={600}
            className="rounded-lg shadow-lg"
            priority
          />
          <span className="text-gray-500 text-sm mt-2">Hawaii Smash Ultimate Ruleset</span>
        </div>
        {/* Overlay if not logged in */}
        {isDisabled && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-200 bg-opacity-80 backdrop-blur-sm rounded-lg">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold mb-4 shadow-lg">
              Need to login to play
            </div>
            <button
              className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors mb-4"
              onClick={() => signIn()}
            >
              Login
            </button>
            <button
              className="bg-gray-300 text-gray-800 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-400 transition-colors"
              onClick={() => window.location.href = '/'}
            >
              Go back to homepage
            </button>
          </div>
        )}
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {/* Match Preferences */}
        <div className={`bg-white rounded-lg shadow-md p-6 mb-8 ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">Match Preferences</h2>
          {/* Island Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Island
            </label>
            <select
              value={preferences.island}
              onChange={(e) => setPreferences({ ...preferences, island: e.target.value })}
              className="w-full p-2 border rounded-md"
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="wired"
                  checked={preferences.connection === 'wired'}
                  onChange={(e) => setPreferences({ ...preferences, connection: 'wired' })}
                  className="form-radio"
                  disabled={isSearching || isDisabled}
                />
                <span className="ml-2">Wired</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="wireless"
                  checked={preferences.connection === 'wireless'}
                  onChange={(e) => setPreferences({ ...preferences, connection: 'wireless' })}
                  className="form-radio"
                  disabled={isSearching || isDisabled}
                />
                <span className="ml-2">Wireless</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Wired is usually preferred for optimal online play.</p>
          </div>
        </div>
        {/* Search Button */}
        <div className="text-center">
          {!isSearching ? (
            <button
              onClick={handleStartSearch}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors"
              disabled={isDisabled}
            >
              Find Match
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-lg">Searching for opponent...</span>
              </div>
              <button
                onClick={handleCancelSearch}
                className="text-red-500 hover:text-red-600"
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Chat Modal */}
      {currentMatch && opponent && (
        <TournamentMatch
          matchId={currentMatch}
          opponent={opponent}
          onLeaveMatch={handleLeaveMatch}
          playerIndex={playerIndex}
        />
      )}
    </div>
  )
} 
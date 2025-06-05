'use client'

import { useState, useEffect } from 'react'
import { matchmakingService } from '../services/matchmaking'
import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'

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

export default function FreeBattle() {
  const { data: session, status } = useSession()
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
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

  useEffect(() => {
    // Set up matchmaking callbacks
    matchmakingService.onMatch((id) => {
      setMatchId(id)
      setIsSearching(false)
      // TODO: Navigate to match room or show match details
    })

    matchmakingService.onError((error) => {
      setError(error)
      setIsSearching(false)
    })

    // Cleanup on unmount
    return () => {
      if (isSearching) {
        matchmakingService.cancelSearch()
      }
    }
  }, [isSearching])

  const handleStartSearch = () => {
    setError(null)
    setMatchId(null)
    setIsSearching(true)
    matchmakingService.startSearch(preferences)
  }

  const handleCancelSearch = () => {
    setIsSearching(false)
    matchmakingService.cancelSearch()
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
            src="/ruleset(1).jpg"
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
        {/* Match Found Message */}
        {matchId && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Match found! Match ID: {matchId}
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
    </div>
  )
} 
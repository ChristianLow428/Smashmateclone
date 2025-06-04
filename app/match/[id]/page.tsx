'use client'

import { useState, useEffect } from 'react'
import { matchmakingService } from '../../services/matchmaking'

interface MatchDetails {
  id: string
  status: 'pending' | 'active' | 'completed' | 'disconnected'
  opponent: {
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
}

export default function MatchRoom({ params }: { params: { id: string } }) {
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    // Set up match status listener
    matchmakingService.onMatchStatus((status) => {
      if (status.matchId === params.id) {
        setMatchDetails({
          id: status.matchId!,
          status: status.status as MatchDetails['status'],
          opponent: status.opponent!
        })
        if (status.status === 'disconnected') {
          setError('Opponent disconnected')
        }
      }
    })

    // Start countdown when match is pending
    if (matchDetails?.status === 'pending') {
      setCountdown(5)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [params.id, matchDetails?.status])

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => window.location.href = '/free-battle'}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Return to Free Battle
          </button>
        </div>
      </div>
    )
  }

  if (!matchDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading match details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Match Found!</h1>

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="text-center mb-8">
            <div className="text-6xl font-bold text-blue-500 mb-4">
              {countdown}
            </div>
            <p className="text-gray-600">Match starting in...</p>
          </div>
        )}

        {/* Match Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Match Settings</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Rules</h3>
              <ul className="space-y-2">
                <li>Stock: {matchDetails.opponent.preferences.rules.stock}</li>
                <li>Time: {matchDetails.opponent.preferences.rules.time} minutes</li>
                <li>Items: {matchDetails.opponent.preferences.rules.items ? 'On' : 'Off'}</li>
                <li>Stage Hazards: {matchDetails.opponent.preferences.rules.stageHazards ? 'On' : 'Off'}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Connection</h3>
              <ul className="space-y-2">
                <li>Region: {matchDetails.opponent.preferences.island}</li>
                <li>Type: {matchDetails.opponent.preferences.connection}</li>
              </ul>
            </div>
          </div>

          {/* Ready Button */}
          {matchDetails.status === 'pending' && countdown === 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  // TODO: Implement ready state
                }}
                className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors"
              >
                Ready to Play
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
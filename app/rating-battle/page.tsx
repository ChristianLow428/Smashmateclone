'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Image from 'next/image'
import { useRatingBattle } from '../hooks/useRatingBattle'
import { ratingBattleService, PlayerRating, getRatingTier, getRatingColor, calculateProvisionalRating } from '../services/rating-battle'
import TournamentMatch from '../components/TournamentMatch'

interface MatchPreferences {
  island: string
  connection: 'wired' | 'wireless'
}

interface Opponent {
  id: string
  displayName?: string
  rating?: number
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

interface MatchResult {
  winner: 'player1' | 'player2'
  player1Name: string
  player2Name: string
  player1OldRating: number
  player1NewRating: number
  player2OldRating: number
  player2NewRating: number
  ratingChange: number
  timestamp: string
}

export default function RatingBattle() {
  const { data: session, status } = useSession()
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [playerIndex, setPlayerIndex] = useState<number | null>(null)
  const [matchEnded, setMatchEnded] = useState<boolean>(false)
  const [playerRating, setPlayerRating] = useState<PlayerRating | null>(null)
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [lastRatingChange, setLastRatingChange] = useState<number | null>(null)

  // Default preferences
  const [preferences, setPreferences] = useState<MatchPreferences>({
    island: 'Oahu',
    connection: 'wired'
  })

  // Load player rating, top players, and match history on component mount
  useEffect(() => {
    console.log('Session changed:', session?.user?.email)
    if (session?.user?.email) {
      loadPlayerRating()
      loadMatchHistory()
    }
  }, [session])

  // Listen for profile updates and refresh top players
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('Profile updated, refreshing all data...')
      refreshAllData()
    }

    console.log('Setting up profile update listener...')
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      console.log('Removing profile update listener...')
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  const loadPlayerRating = async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`/api/rating-battle/player-rating?playerId=${session.user.email}`)
      if (!response.ok) {
        throw new Error('Failed to fetch player rating')
      }
      const rating = await response.json()
      
      // If no rating exists, create a default one starting at 1000
      if (!rating) {
        const defaultRating: PlayerRating = {
          player_id: session.user.email,
          rating: 1000,
          games_played: 0,
          wins: 0,
          losses: 0,
          display_name: session.user.name || session.user.email
        }
        setPlayerRating(defaultRating)
      } else {
        setPlayerRating(rating)
      }
    } catch (error) {
      console.error('Error loading player rating:', error)
    }
  }

  const refreshAllData = async () => {
    console.log('Refreshing all data...')
    await loadPlayerRating()
    await loadMatchHistory()
  }

  const loadMatchHistory = async () => {
    if (!session?.user?.email) return
    
    try {
      const history = await ratingBattleService.getRatingHistory(session.user.email, 5)
      const results: MatchResult[] = history.map(record => ({
        winner: record.result === 'win' ? 'player1' : 'player2',
        player1Name: session.user?.name || session.user?.email || 'You',
        player2Name: record.opponent_id,
        player1OldRating: record.old_rating,
        player1NewRating: record.new_rating,
        player2OldRating: record.opponent_old_rating,
        player2NewRating: record.opponent_new_rating,
        ratingChange: record.rating_change,
        timestamp: record.created_at
      }))
      setMatchResults(results)
    } catch (error) {
      console.error('Error loading match history:', error)
    }
  }

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
    useWebSocket,
    resetPlayerStatus
  } = useRatingBattle()

  useEffect(() => {
    if (matchStatus) {
      console.log('Rating match status update:', matchStatus)
      console.log('Current session email:', session?.user?.email)
      console.log('Current opponent state:', opponent)
      console.log('Current player index state:', playerIndex)
      console.log('Current match state:', currentMatch)
      
      // Handle WebSocket match messages
      if (useWebSocket && matchStatus.type === 'match' && matchStatus.status === 'character_selection') {
        // Add default rules to opponent preferences if not present
        const opponentWithRules = {
          ...matchStatus.opponent,
          preferences: {
            ...matchStatus.opponent.preferences,
            rules: matchStatus.opponent.preferences.rules || {
              stock: 3,
              time: 7,
              items: false,
              stageHazards: false
            }
          }
        }
        setOpponent(opponentWithRules)
        setPlayerIndex(matchStatus.playerIndex)
        setMatchEnded(false)
        console.log('WebSocket: Character selection phase started')
        console.log('Opponent:', opponentWithRules)
        console.log('Player index:', matchStatus.playerIndex)
      }
      // Handle match state updates (for reconnecting to existing matches)
      else if (matchStatus.type === 'match_state' && matchStatus.opponent) {
        // Add default rules to opponent preferences if not present
        const opponentWithRules = {
          ...matchStatus.opponent,
          preferences: {
            ...matchStatus.opponent.preferences,
            rules: matchStatus.opponent.preferences.rules || {
              stock: 3,
              time: 7,
              items: false,
              stageHazards: false
            }
          }
        }
        setOpponent(opponentWithRules)
        setPlayerIndex(matchStatus.playerIndex)
        setMatchEnded(false)
        console.log('Reconnecting to existing match:')
        console.log('Opponent:', opponentWithRules)
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
        // Reload ratings and match history after match completion
        loadPlayerRating()
        loadMatchHistory()
      } else if (matchStatus.type === 'opponent_left') {
        console.log('Opponent left')
        setMatchEnded(true)
      } else if (matchStatus.type === 'rating_update') {
        // Handle rating updates
        console.log('Rating update received:', matchStatus)
        if (matchStatus.playerId === session?.user?.email) {
          const oldRating = playerRating?.rating || 1000
          const newRating = matchStatus.newRating
          const ratingChange = matchStatus.ratingChange
          
          console.log(`Rating updated: ${oldRating} → ${newRating} (${ratingChange >= 0 ? '+' : ''}${ratingChange})`)
          
          setLastRatingChange(ratingChange)
          setPlayerRating(prev => prev ? { 
            ...prev, 
            rating: newRating,
            games_played: prev.games_played + 1,
            wins: ratingChange > 0 ? prev.wins + 1 : prev.wins,
            losses: ratingChange < 0 ? prev.losses + 1 : prev.losses
          } : null)
          
          // Clear rating change after 10 seconds
          setTimeout(() => {
            setLastRatingChange(null)
          }, 10000)
          
          // Show rating change notification
          const notification = document.createElement('div')
          notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white font-bold z-50 ${
            ratingChange >= 0 ? 'bg-green-500' : 'bg-red-500'
          }`
          notification.textContent = `Rating: ${ratingChange >= 0 ? '+' : ''}${ratingChange}`
          document.body.appendChild(notification)
          
          // Remove notification after 3 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification)
            }
          }, 3000)
        }
        // Reload match history when ratings are updated
        loadMatchHistory()
      } else if (matchStatus.type === 'match_result_processed') {
        // Handle when a match result has been processed
        console.log('Match result processed:', matchStatus)
        
        // Show match result summary
        const isPlayer1 = matchStatus.player1Id === session?.user?.email
        const playerNewRating = isPlayer1 ? matchStatus.player1NewRating : matchStatus.player2NewRating
        const playerRatingChange = isPlayer1 ? matchStatus.player1RatingChange : matchStatus.player2RatingChange
        const opponentNewRating = isPlayer1 ? matchStatus.player2NewRating : matchStatus.player1NewRating
        const opponentRatingChange = isPlayer1 ? matchStatus.player2RatingChange : matchStatus.player1RatingChange
        
        console.log(`Match Summary: You ${playerRatingChange >= 0 ? 'won' : 'lost'}! Rating: ${playerRatingChange >= 0 ? '+' : ''}${playerRatingChange}`)
        
        // Show match result notification
        const notification = document.createElement('div')
        notification.className = `fixed top-4 left-4 p-4 rounded-lg text-white font-bold z-50 ${
          playerRatingChange >= 0 ? 'bg-green-500' : 'bg-red-500'
        }`
        notification.innerHTML = `
          <div class="text-lg">${playerRatingChange >= 0 ? 'Victory!' : 'Defeat'}</div>
          <div class="text-sm">Your rating: ${playerRatingChange >= 0 ? '+' : ''}${playerRatingChange}</div>
          <div class="text-sm">New rating: ${playerNewRating}</div>
        `
        document.body.appendChild(notification)
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 5000)
        
        // Reload all data to show updated ratings and match history
        loadPlayerRating()
        loadMatchHistory()
      }
    }
  }, [matchStatus, useWebSocket, opponent, playerIndex, currentMatch, session])

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
    console.log('Starting rating search with preferences:', preferences)
    console.log('Session data:', session)
    
    if (!session) {
      console.error('No session available')
      return
    }
    
    setOpponent(null)
    setPlayerIndex(null)
    
    // Add default rules since we removed them from the frontend
    const searchPreferences = {
      ...preferences,
      userEmail: session.user?.email || undefined,
      rules: {
        stock: 3,
        time: 7,
        items: false,
        stageHazards: false
      }
    }
    
    try {
      await startSearch(searchPreferences)
    } catch (error) {
      console.error('Error starting rating search:', error)
      if (error instanceof Error && error.message.includes('Already in a match')) {
        // Show a dialog asking if they want to reset their status
        const confirmed = window.confirm(
          'You are already in a match. Would you like to reset your status and start a new search?'
        )
        if (confirmed) {
          try {
            await resetPlayerStatus()
            // Try starting search again after reset
            await startSearch(searchPreferences)
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
    const confirmed = window.confirm('Are you sure you want to leave this rating match? This will count as a loss and affect your rating.')
    if (!confirmed) return

    if (currentMatch) {
      leaveMatch(currentMatch)
    }

    setOpponent(null)
    setPlayerIndex(null)
    setMatchEnded(true)
  }

  const handleSelectCharacter = async (matchId: string, character: string) => {
    selectCharacter(matchId, character)
  }

  const handleBanStage = async (matchId: string, stage: string) => {
    banStage(matchId, stage)
  }

  const handlePickStage = async (matchId: string, stage: string) => {
    pickStage(matchId, stage)
  }

  const handleReportGameResult = async (matchId: string, winner: number) => {
    reportGameResult(matchId, winner)
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
      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        <h1 className="text-4xl font-bold mb-8 text-center text-hawaii-primary font-monopol">Rating Battle</h1>
        
        {/* Player Rating Display */}
        {session?.user?.email && playerRating && (
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Your Rating</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-hawaii-primary">{playerRating.rating}</div>
                <div className="text-sm text-hawaii-muted">Rating</div>
                <div className="text-xs text-hawaii-muted mt-1">{getRatingTier(playerRating.rating)}</div>
                {lastRatingChange !== null && (
                  <div className={`text-xs font-bold mt-1 ${lastRatingChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {lastRatingChange >= 0 ? '+' : ''}{lastRatingChange}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-hawaii-secondary">{playerRating.games_played}</div>
                <div className="text-sm text-hawaii-muted">Games</div>
                <div className="text-xs text-hawaii-muted mt-1">
                  {calculateProvisionalRating(playerRating.rating, playerRating.games_played) ? 'Provisional' : 'Established'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{playerRating.wins}</div>
                <div className="text-sm text-hawaii-muted">Wins</div>
                <div className="text-xs text-hawaii-muted mt-1">
                  {playerRating.games_played > 0 ? `${Math.round((playerRating.wins / playerRating.games_played) * 100)}%` : '0%'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">{playerRating.losses}</div>
                <div className="text-sm text-hawaii-muted">Losses</div>
                <div className="text-xs text-hawaii-muted mt-1">
                  {playerRating.games_played > 0 ? `${Math.round((playerRating.losses / playerRating.games_played) * 100)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>
        )}

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
        {!session && (
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

        {/* Match Interface */}
        {currentMatch && opponent && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <TournamentMatch
                matchId={currentMatch}
                opponent={opponent}
                onLeaveMatch={handleLeaveMatch}
                playerIndex={playerIndex}
                selectCharacter={handleSelectCharacter}
                banStage={handleBanStage}
                pickStage={handlePickStage}
                reportGameResult={handleReportGameResult}
                sendChatMessage={sendChatMessage}
                matchStatus={matchStatus}
                matchEnded={matchEnded}
              />
            </div>
          </div>
        )}

        {/* Search Interface */}
        {!currentMatch && !matchEnded && (
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
            <h2 className="text-2xl font-bold mb-6 text-hawaii-accent font-monopol">Start Rating Battle</h2>
            
            {/* Island Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-hawaii-accent mb-2 font-monopol">
                Island
              </label>
              <select
                value={preferences.island}
                onChange={(e) => setPreferences(prev => ({ ...prev, island: e.target.value }))}
                className="w-full p-3 border border-hawaii-border bg-card-bg-alt text-hawaii-muted rounded-md focus:outline-none focus:ring-2 focus:ring-hawaii-primary focus:border-hawaii-primary"
              >
                <option value="Oahu">Oʻahu</option>
                <option value="Hawaii">Hawaiʻi</option>
                <option value="Maui">Maui</option>
                <option value="Kauai">Kauaʻi</option>
              </select>
            </div>

            {/* Connection Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-hawaii-accent mb-2 font-monopol">
                Connection Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="wired"
                    checked={preferences.connection === 'wired'}
                    onChange={(e) => setPreferences(prev => ({ ...prev, connection: e.target.value as 'wired' | 'wireless' }))}
                    className="mr-2"
                  />
                  <span className="text-hawaii-muted">Wired</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="wireless"
                    checked={preferences.connection === 'wireless'}
                    onChange={(e) => setPreferences(prev => ({ ...prev, connection: e.target.value as 'wired' | 'wireless' }))}
                    className="mr-2"
                  />
                  <span className="text-hawaii-muted">Wireless</span>
                </label>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="flex space-x-4">
              {!isSearching ? (
                <button
                  onClick={handleStartSearch}
                  disabled={isDisabled}
                  className={`flex-1 py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
                    isDisabled
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-hawaii-primary text-white hover:bg-hawaii-accent'
                  }`}
                >
                  Start Rating Battle
                </button>
              ) : (
                <button
                  onClick={handleCancelSearch}
                  className="flex-1 py-3 px-6 rounded-lg text-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Cancel Search
                </button>
              )}
            </div>

            {/* Search Status */}
            {isSearching && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hawaii-primary mx-auto mb-2"></div>
                <p className="text-hawaii-muted">Searching for opponents...</p>
              </div>
            )}
          </div>
        )}

        {/* Match Ended State */}
        {matchEnded && !currentMatch && (
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
            <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Match Ended</h2>
            <p className="text-hawaii-muted mb-4">Your rating battle has ended.</p>
            <button
              onClick={() => setMatchEnded(false)}
              className="bg-hawaii-primary text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-hawaii-accent transition-colors"
            >
              Start New Rating Battle
            </button>
          </div>
        )}
      </div>
    </main>
  )
} 
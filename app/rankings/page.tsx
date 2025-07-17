'use client'

import { useState, useEffect } from 'react'

// Function to clean Discord markdown formatting
function cleanDiscordMarkdown(text: string): string {
  return text
    .replace(/\*\*__/g, '') // Remove **__
    .replace(/__\*\*/g, '') // Remove __**
    .replace(/\*\*/g, '')   // Remove **
    .replace(/__/g, '')     // Remove __
    .replace(/\*/g, '')     // Remove *
    .replace(/_/g, '')      // Remove _
    .trim();                // Remove extra whitespace
}

export default function RankingsPage() {
  const [offlineRankings, setOfflineRankings] = useState<string>('')
  const [onlineRankings, setOnlineRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRankings = async () => {
    try {
      setLoading(true)
      console.log('=== Fetching rankings data ===')
      
      // Fetch offline rankings
      const offlineResponse = await fetch('/api/rankings/offline')
      const offlineData = await offlineResponse.json()
      
      if (offlineData.content) {
        setOfflineRankings(cleanDiscordMarkdown(offlineData.content))
      }

      // Fetch online rankings with cache busting
      const timestamp = Date.now()
      const onlineResponse = await fetch(`/api/rankings/online?t=${timestamp}`)
      console.log('Fetching from:', `/api/rankings/online?t=${timestamp}`)
      
      const onlineData = await onlineResponse.json()
      
      console.log('Online rankings data from API:', onlineData)
      console.log('Setting onlineRankings state to:', onlineData)
      console.log('Full API response details:', JSON.stringify(onlineData, null, 2))
      
      if (onlineData) {
        setOnlineRankings(onlineData)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error fetching rankings:', err)
      setError('Failed to load rankings')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings()
  }, [])

  // Debug state changes
  useEffect(() => {
    console.log('onlineRankings state changed:', onlineRankings)
  }, [onlineRankings])

  // Function to get rating tier
  const getRatingTier = (rating: number): string => {
    if (rating >= 2000) return 'Master'
    if (rating >= 1800) return 'Expert'
    if (rating >= 1600) return 'Advanced'
    if (rating >= 1400) return 'Intermediate'
    if (rating >= 1200) return 'Beginner'
    return 'Novice'
  };

  // Function to get rating color
  const getRatingColor = (rating: number): string => {
    if (rating >= 2000) return '#FFD700' // Gold
    if (rating >= 1800) return '#C0C0C0' // Silver
    if (rating >= 1600) return '#CD7F32' // Bronze
    if (rating >= 1400) return '#4CAF50' // Green
    if (rating >= 1200) return '#2196F3' // Blue
    return '#9E9E9E' // Gray
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hawaii-primary mx-auto mb-4"></div>
            <p className="text-hawaii-muted">Loading rankings...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">Error Loading Rankings</h1>
            <p className="text-hawaii-muted">{error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-hawaii-primary font-monopol text-center">Hawaii Rankings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Offline Rankings - Left Side */}
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h2 className="text-2xl font-bold mb-6 text-hawaii-accent font-monopol">Offline Rankings</h2>
            <pre className="bg-card-bg-alt p-4 rounded-lg whitespace-pre-wrap text-hawaii-muted border border-hawaii-border font-segoe max-h-96 overflow-y-auto">{offlineRankings}</pre>
          </div>

          {/* Online Rankings - Right Side */}
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-hawaii-accent font-monopol">Online Rankings</h2>
              <button
                onClick={fetchRankings}
                disabled={loading}
                className="bg-hawaii-primary text-white px-4 py-2 rounded hover:bg-hawaii-accent transition-colors font-monopol text-sm disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="space-y-3">
              {onlineRankings.length > 0 ? (
                onlineRankings.map((player, index) => (
                  <div key={`${player.player_id}-${player.rating}-${player.games_played}`} className="bg-card-bg-alt rounded-lg p-4 border border-hawaii-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-hawaii-primary text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-hawaii-primary">
                            {player.display_name}
                          </div>
                          <div className="text-sm text-hawaii-muted">{getRatingTier(player.rating)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: getRatingColor(player.rating) }}>
                          {player.rating}
                        </div>
                        <div className="text-xs text-hawaii-muted">
                          {player.games_played} games • {player.games_played > 0 ? `${Math.round((player.wins / player.games_played) * 100)}%` : '0%'} win rate
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-hawaii-muted">No players found. Be the first to start rating battles!</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
    </main>
  );
}
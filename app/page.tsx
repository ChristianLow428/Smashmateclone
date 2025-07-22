'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TournamentImage from './components/TournamentImage'

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  discord_message_id: string;
  discord_channel_id: string;
  created_at: string;
}

interface TournamentDetails {
  image?: string;
  email?: string;
  date?: string;
  location?: string;
}

export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch rankings
        const rankingsResponse = await fetch('/api/rankings/home')
        if (!rankingsResponse.ok) {
          throw new Error('Failed to fetch rankings')
        }
        const rankingsData = await rankingsResponse.json()
        setRankings(rankingsData)

        // Fetch tournaments
        const tournamentsResponse = await fetch('/api/tournaments')
        if (!tournamentsResponse.ok) {
          throw new Error('Failed to fetch tournaments')
        }
        const tournamentsData = await tournamentsResponse.json()
        setTournaments(tournamentsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hawaii-primary mx-auto mb-4"></div>
            <p className="text-hawaii-muted">Loading...</p>
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
            <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">Error Loading Data</h1>
            <p className="text-hawaii-muted">{error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-hawaii-primary font-monopol">
            HawaiiSSBU
          </h1>
          <p className="text-xl text-hawaii-muted">
            Super Smash Bros. Ultimate Tournament Events & Results in Hawaii
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Online Rankings - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-4">
              <h2 className="text-xl font-bold mb-4 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Online Rankings
              </h2>
              <div className="space-y-2">
                {rankings.length > 0 ? (
                  rankings.map((player, index) => (
                    <div key={`${player.player_id}-${player.rating}`} className="flex justify-between items-center py-2 border-b border-hawaii-border/30 last:border-b-0">
                      <div className="flex items-center">
                        <span className="text-hawaii-primary font-bold mr-3">#{index + 1}</span>
                        <span className="font-medium text-hawaii-muted">{player.display_name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-hawaii-secondary font-semibold">{Math.round(player.rating)}</span>
                        <span className="text-hawaii-muted text-sm">({player.wins}/{player.losses})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-hawaii-muted text-sm">No players found. Be the first to start rating battles!</p>
                  </div>
                )}
                <div className="mt-3 text-center">
                  <Link
                    href="/rankings"
                    className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold text-sm"
                  >
                    View Full Rankings →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Tournaments - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-4">
              <h2 className="text-xl font-bold mb-4 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Upcoming Tournaments
              </h2>
              <div className="space-y-3">
                {tournaments && tournaments.length > 0 ? (
                  tournaments.map((tournament) => {
                    return (
                      <div key={tournament.id} className="bg-card-bg-alt rounded-lg p-3 border border-hawaii-border hover:border-hawaii-primary/50 transition-colors">
                        {/* Tournament Image */}
                        {tournament.details?.image && (
                          <div className="mb-2">
                            <TournamentImage
                              src={tournament.details.image}
                              alt={tournament.title}
                              title={tournament.title}
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-base text-hawaii-primary line-clamp-1 font-monopol">{tournament.title}</h3>
                          <span className="text-xs text-hawaii-muted bg-card-bg px-2 py-1 rounded">
                            {tournament.details?.date || new Date(tournament.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Tournament Details */}
                        <div className="space-y-1 mb-2">
                          {tournament.details?.email && (
                            <div className="flex items-center text-xs text-hawaii-muted">
                              <span className="font-semibold mr-2">📧</span>
                              {tournament.details.email}
                            </div>
                          )}
                          
                          {tournament.details?.location && (
                            <div className="flex items-center text-xs text-hawaii-muted">
                              <span className="font-semibold mr-2">📍</span>
                              {tournament.details.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-hawaii-muted">Tournament Organizer</span>
                          {tournament.tournamentLink && (
                            <Link
                              href={tournament.tournamentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-hawaii-primary text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-hawaii-secondary transition-colors"
                            >
                              View Details
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-hawaii-muted mb-4">No tournaments found in database</p>
                  </div>
                )}
                <div className="text-center pt-3">
                  <Link
                    href="/tournaments"
                    className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold text-sm"
                  >
                    View All Tournaments →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 
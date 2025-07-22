'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface Player {
  player_id: string
  display_name: string
  rating: number
  games_played: number
  wins: number
  losses: number
}

interface Tournament {
  id: string
  title: string
  created_at: string
}

interface User {
  id: string
  email: string
  name: string | null
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rankings, setRankings] = useState<Player[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rankings' | 'tournaments' | 'users'>('rankings')

  // List of admin emails
  const ADMIN_EMAILS = [
    'christianlow428@gmail.com',
    'smallleft14@gmail.com'
  ] // Add your admin emails here

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch rankings
      const rankingsResponse = await fetch('/api/rankings/online')
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

      // Fetch users
      const usersResponse = await fetch('/api/admin/users')
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users')
      }
      const usersData = await usersResponse.json()
      setUsers(usersData)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.email && !ADMIN_EMAILS.includes(session.user.email)) {
      router.push('/')
    }
  }, [session, router])

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchData()
    }
  }, [session, fetchData])

  const handleDeleteRanking = async (playerId: string) => {
    try {
      const response = await fetch('/api/admin/rankings/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete ranking')
      }

      // Remove from local state
      setRankings(rankings.filter(player => player.player_id !== playerId))

      // Refresh data
      fetchData()
    } catch (err) {
      console.error('Error deleting ranking:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete ranking')
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      const response = await fetch('/api/admin/tournaments/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tournamentId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete tournament')
      }

      // Remove from local state
      setTournaments(tournaments.filter(tournament => tournament.id !== tournamentId))

      // Refresh data
      fetchData()
    } catch (err) {
      console.error('Error deleting tournament:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete tournament')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      // Remove from local state
      setUsers(users.filter(user => user.id !== userId))

      // Refresh data
      fetchData()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  if (status === 'loading' || loading) {
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

  if (!session || !ADMIN_EMAILS.includes(session.user?.email || '')) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-hawaii-primary font-monopol text-center">Admin Dashboard</h1>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-8">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rankings'
                ? 'bg-hawaii-primary text-white'
                : 'bg-card-bg-alt text-hawaii-muted hover:text-hawaii-accent'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tournaments'
                ? 'bg-hawaii-primary text-white'
                : 'bg-card-bg-alt text-hawaii-muted hover:text-hawaii-accent'
            }`}
          >
            Tournaments
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-hawaii-primary text-white'
                : 'bg-card-bg-alt text-hawaii-muted hover:text-hawaii-accent'
            }`}
          >
            Users
          </button>
        </div>

        {/* Content Sections */}
        <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
          {/* Rankings Section */}
          {activeTab === 'rankings' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Online Rankings</h2>
              <div className="space-y-4">
                {rankings.map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between bg-card-bg-alt rounded-lg p-4 border border-hawaii-border">
                    <div>
                      <div className="font-semibold text-hawaii-primary">{player.display_name}</div>
                      <div className="text-sm text-hawaii-muted">
                        Rating: {player.rating} • Games: {player.games_played} • W/L: {player.wins}/{player.losses}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRanking(player.player_id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {rankings.length === 0 && (
                  <div className="text-center py-8 text-hawaii-muted">
                    No rankings found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tournaments Section */}
          {activeTab === 'tournaments' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Tournaments</h2>
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div key={tournament.id} className="flex items-center justify-between bg-card-bg-alt rounded-lg p-4 border border-hawaii-border">
                    <div>
                      <div className="font-semibold text-hawaii-primary">{tournament.title}</div>
                      <div className="text-sm text-hawaii-muted">
                        Created: {new Date(tournament.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTournament(tournament.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {tournaments.length === 0 && (
                  <div className="text-center py-8 text-hawaii-muted">
                    No tournaments found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Users Section */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Users</h2>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-card-bg-alt rounded-lg p-4 border border-hawaii-border">
                    <div>
                      <div className="font-semibold text-hawaii-primary">{user.name || user.email}</div>
                      <div className="text-sm text-hawaii-muted">{user.email}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-hawaii-muted">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 
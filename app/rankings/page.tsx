'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function RankingsPage() {
  const [offlineRankings, setOfflineRankings] = useState<string>('')
  const [onlineRankings, setOnlineRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Initial fetch of rankings
    fetchRankings()

    // Connect to WebSocket server for live rankings updates
    const wsUrl = process.env.NODE_ENV === 'development'
      ? 'ws://localhost:3001/rankings'
      : (process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://hawaiissbu-websocket-server.onrender.com') + '/rankings'

    console.log('Connecting to rankings WebSocket:', wsUrl)
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log('Rankings WebSocket connected')
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'rankings_update') {
          console.log('Received rankings update:', data.rankings)
          setOnlineRankings(data.rankings)
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
      }
    }

    websocket.onerror = (error) => {
      console.error('Rankings WebSocket error:', error)
    }

    websocket.onclose = () => {
      console.log('Rankings WebSocket closed')
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }, [])

  const fetchRankings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch online rankings
      const onlineResponse = await fetch('/api/rankings/online')
      if (!onlineResponse.ok) {
        throw new Error('Failed to fetch online rankings')
      }
      const onlineData = await onlineResponse.json()
      setOnlineRankings(onlineData)

      // Fetch offline rankings
      const offlineResponse = await fetch('/api/rankings/offline')
      if (!offlineResponse.ok) {
        throw new Error('Failed to fetch offline rankings')
      }
      const offlineData = await offlineResponse.json()
      setOfflineRankings(offlineData)
    } catch (err) {
      console.error('Error fetching rankings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch rankings')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Loading rankings...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Rankings</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Online Rankings (Top 10)</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">W/L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {onlineRankings.map((player, index) => (
                <tr key={player.player_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {player.display_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(player.rating)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {player.wins}/{player.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Offline Rankings</h2>
        <div className="bg-white rounded-lg shadow p-4">
          <pre className="whitespace-pre-wrap">{offlineRankings}</pre>
        </div>
      </div>
    </div>
  )
}
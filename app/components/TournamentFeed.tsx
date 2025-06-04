'use client'

import { useState, useEffect } from 'react'

interface Tournament {
  id: string
  name: string
  date: string
  platform: 'discord' | 'startgg'
  url: string
  details?: string
}

export default function TournamentFeed() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch from both APIs in parallel
        const [discordTournaments, startggTournaments] = await Promise.all([
          fetchDiscordTournaments(),
          fetchStartggTournaments()
        ])

        // Combine and sort by date
        const allTournaments = [...discordTournaments, ...startggTournaments]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        setTournaments(allTournaments)
      } catch (err) {
        setError('Failed to fetch tournaments')
        console.error('Error fetching tournaments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => (
        <div key={tournament.id} className="border-b pb-4 last:border-b-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{tournament.name}</h3>
              <p className="text-gray-600">{tournament.date}</p>
              {tournament.details && (
                <p className="text-sm text-gray-500 mt-1">{tournament.details}</p>
              )}
            </div>
            <a
              href={tournament.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              View on {tournament.platform === 'discord' ? 'Discord' : 'start.gg'} →
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

// Discord API integration
async function fetchDiscordTournaments(): Promise<Tournament[]> {
  // You'll need to set up a Discord bot and get the channel ID
  const DISCORD_BOT_TOKEN = process.env.NEXT_PUBLIC_DISCORD_BOT_TOKEN
  const DISCORD_CHANNEL_ID = process.env.NEXT_PUBLIC_DISCORD_CHANNEL_ID

  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) {
    console.warn('Discord credentials not configured')
    return []
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch Discord messages')

    const messages = await response.json()
    
    // Filter and transform Discord messages into tournament format
    return messages
      .filter((msg: any) => msg.content.includes('tournament') || msg.content.includes('tourney'))
      .map((msg: any) => ({
        id: msg.id,
        name: msg.content.split('\n')[0],
        date: new Date(msg.timestamp).toLocaleDateString(),
        platform: 'discord' as const,
        url: `https://discord.com/channels/${DISCORD_CHANNEL_ID}/${msg.id}`,
        details: msg.content
      }))
  } catch (error) {
    console.error('Error fetching Discord tournaments:', error)
    return []
  }
}

// start.gg API integration
async function fetchStartggTournaments(): Promise<Tournament[]> {
  const STARTGG_API_KEY = process.env.NEXT_PUBLIC_STARTGG_API_KEY

  if (!STARTGG_API_KEY) {
    console.warn('start.gg API key not configured')
    return []
  }

  try {
    const response = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STARTGG_API_KEY}`,
      },
      body: JSON.stringify({
        query: `
          query UpcomingTournaments {
            tournaments(query: {
              perPage: 10,
              filter: {
                upcoming: true,
                videogameIds: [1386] # Super Smash Bros. Ultimate
              }
            }) {
              nodes {
                id
                name
                startAt
                url
                events {
                  name
                }
              }
            }
          }
        `
      })
    })

    if (!response.ok) throw new Error('Failed to fetch start.gg tournaments')

    const data = await response.json()
    
    return data.data.tournaments.nodes.map((tournament: any) => ({
      id: tournament.id,
      name: tournament.name,
      date: new Date(tournament.startAt).toLocaleDateString(),
      platform: 'startgg' as const,
      url: tournament.url,
      details: tournament.events.map((event: any) => event.name).join(', ')
    }))
  } catch (error) {
    console.error('Error fetching start.gg tournaments:', error)
    return []
  }
} 
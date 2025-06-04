'use client'
import TournamentFeed from './components/TournamentFeed'
import { useRouter } from 'next/navigation'

const mockRankings = [
  { name: 'Player1', rating: 2100 },
  { name: 'Player2', rating: 2050 },
  { name: 'Player3', rating: 2000 },
  { name: 'Player4', rating: 1950 },
  { name: 'Player5', rating: 1900 },
  { name: 'Player6', rating: 1880 },
  { name: 'Player7', rating: 1850 },
  { name: 'Player8', rating: 1820 },
  { name: 'Player9', rating: 1800 },
  { name: 'Player10', rating: 1780 },
]

export default function Home() {
  const router = useRouter()
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-5xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to Hawaii Smashmate Clone
          </h1>
          <p className="text-lg text-gray-600">
            Your Super Smash Bros. matchmaking platform
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Free Battle</h2>
            <p className="text-gray-600 mb-4">Find casual matches with players of any skill level</p>
            <button
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              onClick={() => router.push('/free-battle')}
            >
              Find Match
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Rating Battle</h2>
            <p className="text-gray-600 mb-4">Compete in ranked matches and climb the leaderboard</p>
            <button
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              onClick={() => router.push('/rating-battle')}
            >
              Start Battle
            </button>
          </div>
        </div>

        {/* Rankings and Upcoming Tournaments Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Rankings */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Current Rankings</h2>
            <ol className="space-y-2">
              {mockRankings.map((player, idx) => (
                <li key={player.name} className="flex justify-between items-center">
                  <span className="font-medium">{idx + 1}. {player.name}</span>
                  <span className="text-gray-500">{player.rating}</span>
                </li>
              ))}
            </ol>
          </div>
          {/* Upcoming Tournaments */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Upcoming Tournaments</h2>
            <TournamentFeed />
          </div>
        </div>
      </div>
    </main>
  )
} 
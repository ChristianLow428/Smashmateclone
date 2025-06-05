'use client'

import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'

export default function RatingBattle() {
  const { data: session, status } = useSession()
  const isDisabled = !session

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
        <h1 className="text-3xl font-bold mb-8 text-center">Rating Battle</h1>
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
        <div className={`bg-white rounded-lg shadow-md p-6 mb-8 text-center ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">Ranked matchmaking coming soon!</h2>
          <p className="text-gray-600">This page will let you compete in ranked matches and climb the leaderboard. Stay tuned!</p>
        </div>
      </div>
    </div>
  )
} 
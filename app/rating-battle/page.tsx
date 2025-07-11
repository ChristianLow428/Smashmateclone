'use client'

import Image from 'next/image'
import { useSession, signIn } from 'next-auth/react'

export default function RatingBattle() {
  const { data: session, status } = useSession()
  const isDisabled = !session

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
      <div className="max-w-2xl mx-auto px-4 py-8 relative">
        <h1 className="text-4xl font-bold mb-8 text-center text-hawaii-primary font-monopol">Rating Battle</h1>
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
        {isDisabled && (
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
        <div className={`bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8 mb-8 text-center ${isDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">Ranked matchmaking coming soon!</h2>
          <p className="text-hawaii-muted leading-relaxed">This page will let you compete in ranked matches and climb the leaderboard. Stay tuned!</p>
        </div>
      </div>
    </main>
  )
} 
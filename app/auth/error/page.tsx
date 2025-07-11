'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      default:
        return 'An error occurred during authentication.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-hawaii-primary">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-hawaii-muted">
            {getErrorMessage(error)}
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
            {getErrorMessage(error)}
          </div>
          
          <div className="text-center space-y-4">
            <Link
              href="/auth/signin"
              className="inline-block bg-hawaii-primary text-white px-4 py-2 rounded hover:bg-hawaii-secondary transition-colors"
            >
              Try Again
            </Link>
            
            <div>
              <Link
                href="/"
                className="text-hawaii-secondary hover:text-hawaii-accent transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hawaii-primary mx-auto"></div>
          <p className="mt-2 text-hawaii-muted">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
} 
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-800">Smashmate Clone</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/free-battle" className="text-gray-600 hover:text-blue-600">
              Free Battle
            </Link>
            <Link href="/rating-battle" className="text-gray-600 hover:text-blue-600">
              Rating Battle
            </Link>
            <Link href="/tournaments" className="text-gray-600 hover:text-blue-600">
              Tournaments
            </Link>
            <Link href="/rankings" className="text-gray-600 hover:text-blue-600">
              Rankings
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-blue-600">
              Profile
            </Link>
          </div>

          {/* Login/Logout Buttons - Desktop */}
          <div className="hidden md:flex space-x-4 items-center">
            {status === 'loading' ? null : session ? (
              <>
                <Link 
                  href="/profile" 
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {session.user?.name || session.user?.email}
                </Link>
                <button
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                  onClick={() => signOut()}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => signIn()}
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/free-battle" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Free Battle
              </Link>
              <Link href="/rating-battle" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Rating Battle
              </Link>
              <Link href="/tournaments" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Tournaments
              </Link>
              <Link href="/rankings" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Rankings
              </Link>
              <Link href="/profile" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Profile
              </Link>
              <div className="pt-4 pb-3 border-t border-gray-200">
                {status === 'loading' ? null : session ? (
                  <>
                    <Link 
                      href="/profile" 
                      className="block text-gray-700 hover:text-blue-600 transition-colors mb-2"
                    >
                      {session.user?.name || session.user?.email}
                    </Link>
                    <button
                      className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                      onClick={() => signOut()}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => signIn()}
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

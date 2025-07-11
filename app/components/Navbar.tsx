'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const { data: session, status } = useSession()

  // Function to fetch display name
  const fetchDisplayName = () => {
    if (session?.user?.email) {
      fetch('/api/user/profile')
        .then(response => response.json())
        .then(data => {
          if (data.displayName) {
            setDisplayName(data.displayName);
          } else if (data.name) {
            setDisplayName(data.name);
          } else {
            setDisplayName(session.user?.name || session.user?.email || 'User');
          }
        })
        .catch(error => {
          console.error('Failed to fetch display name:', error);
          setDisplayName(session.user?.name || session.user?.email || 'User');
        });
    }
  };

  // Fetch the user's display name from the profile API
  useEffect(() => {
    fetchDisplayName();
  }, [session?.user?.email, session?.user?.name]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchDisplayName();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [session?.user?.email, session?.user?.name]);

  return (
    <nav className="bg-card-bg border-b border-hawaii-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-hawaii-primary font-monopol">HawaiiSSBU</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/free-battle" className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
              Free Battle
            </Link>
            <Link href="/rating-battle" className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
              Rating Battle
            </Link>
            <Link href="/tournaments" className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
              Tournaments
            </Link>
            <Link href="/rankings" className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
              Rankings
            </Link>
            <Link href="/about" className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
              About
            </Link>
          </div>

          {/* Login/Logout Buttons - Desktop */}
          <div className="hidden md:flex space-x-4 items-center">
            {status === 'loading' ? null : session ? (
              <>
                <Link 
                  href="/profile" 
                  className="text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium"
                >
                  {displayName || session.user?.name || session.user?.email}
                </Link>
                <button
                  className="bg-card-bg-alt text-hawaii-muted px-4 py-2 rounded-lg hover:bg-hawaii-primary hover:text-white transition-colors font-medium"
                  onClick={() => signOut()}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                className="bg-hawaii-primary text-white px-6 py-2 rounded-lg hover:bg-hawaii-secondary transition-colors font-semibold"
                onClick={() => signIn('google')}
              >
                Login with Google
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-hawaii-muted hover:text-hawaii-accent"
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
          <div className="md:hidden bg-card-bg-alt border-t border-hawaii-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/free-battle" className="block px-3 py-2 text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
                Free Battle
              </Link>
              <Link href="/rating-battle" className="block px-3 py-2 text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
                Rating Battle
              </Link>
              <Link href="/tournaments" className="block px-3 py-2 text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
                Tournaments
              </Link>
              <Link href="/rankings" className="block px-3 py-2 text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
                Rankings
              </Link>
              <Link href="/about" className="block px-3 py-2 text-hawaii-muted hover:text-hawaii-accent transition-colors font-medium">
                About
              </Link>
              <div className="pt-4 pb-3 border-t border-hawaii-border">
                {status === 'loading' ? null : session ? (
                  <>
                    <Link 
                      href="/profile" 
                      className="block text-hawaii-muted hover:text-hawaii-accent transition-colors mb-2 font-medium"
                    >
                      {displayName || session.user?.name || session.user?.email}
                    </Link>
                    <button
                      className="w-full bg-card-bg text-hawaii-muted px-4 py-2 rounded hover:bg-hawaii-primary hover:text-white transition-colors font-medium"
                      onClick={() => signOut()}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full bg-hawaii-primary text-white px-4 py-2 rounded hover:bg-hawaii-secondary transition-colors font-medium"
                    onClick={() => signIn('google')}
                  >
                    Login with Google
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

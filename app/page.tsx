import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  discord_message_id: string;
  discord_channel_id: string;
  created_at: string;
}

// Function to find the first URL in text
function findFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

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

export default async function Home() {
  // const cookieStore = cookies()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Error fetching tournaments:', error)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section - SoCalSmash Style */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-hawaii-primary font-monopol">
            HawaiiSSBU
          </h1>
          <p className="text-xl text-hawaii-muted">
            Super Smash Bros. Ultimate Tournament Events & Results in Hawaii
          </p>
        </div>

        {/* Main Content Grid - SoCalSmash Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Rankings - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
              <h2 className="text-2xl font-bold mb-6 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Current Rankings
              </h2>
              <div className="space-y-3">
                {mockRankings.slice(0, 10).map((player, idx) => (
                  <div key={player.name} className="flex justify-between items-center py-2 border-b border-hawaii-border/30 last:border-b-0">
                    <div className="flex items-center">
                      <span className="text-hawaii-primary font-bold mr-3">#{idx + 1}</span>
                      <span className="font-medium text-hawaii-muted">{player.name}</span>
                    </div>
                    <span className="text-hawaii-secondary font-semibold">{player.rating}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href="/rankings"
                  className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold"
                >
                  View Full Rankings →
                </Link>
              </div>
            </div>
          </div>

          {/* Upcoming Tournaments - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
              <h2 className="text-2xl font-bold mb-6 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Upcoming Tournaments
              </h2>
              <div className="space-y-4">
                {tournaments?.map((tournament: Tournament) => {
                  const tournamentLink = findFirstUrl(tournament.description || '');
                  
                  return (
                    <div key={tournament.id} className="bg-card-bg-alt rounded-lg p-4 border border-hawaii-border hover:border-hawaii-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-hawaii-primary line-clamp-1 font-monopol">{tournament.title}</h3>
                        <span className="text-sm text-hawaii-muted bg-card-bg px-2 py-1 rounded">
                          {new Date(tournament.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-hawaii-muted text-sm mb-3 line-clamp-2">{tournament.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-hawaii-muted">Tournament Organizer</span>
                        {tournamentLink && (
                          <Link
                            href={tournamentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-hawaii-primary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-hawaii-secondary transition-colors"
                          >
                            Register Now
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center pt-4">
                  <Link
                    href="/tournaments"
                    className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold"
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
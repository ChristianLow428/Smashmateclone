import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import TournamentImage from './components/TournamentImage'

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  discord_message_id: string;
  discord_channel_id: string;
  created_at: string;
}

interface TournamentDetails {
  image?: string;
  email?: string;
  date?: string;
  location?: string;
}

// Function to find the first URL in text
function findFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Function to extract tournament details from start.gg
async function getTournamentDetails(url: string): Promise<TournamentDetails> {
  try {
    // Check if it's a start.gg URL
    if (!url.includes('start.gg')) {
      return {};
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.log('Failed to fetch tournament page:', response.status);
      return {};
    }

    const html = await response.text();
    
    // Extract tournament details using regex patterns
    const details: TournamentDetails = {};

    // Try to find tournament image (usually in meta tags or structured data)
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) ||
                      html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i) ||
                      html.match(/<img[^>]*class="[^"]*tournament[^"]*"[^>]*src="([^"]*)"/i);
    
    if (imageMatch && imageMatch[1]) {
      details.image = imageMatch[1];
    }

    // Try to find tournament date - improved patterns for start.gg
    const startAtMatch = html.match(/"startAt":\s*(\d+)/i);
    const endAtMatch = html.match(/"endAt":\s*(\d+)/i);
    const startDateMatch = html.match(/"startDate":\s*"([^"]*)"/i);
    const dateMatch = html.match(/<time[^>]*datetime="([^"]*)"/i) ||
                     html.match(/"date":\s*"([^"]*)"/i) ||
                     html.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]*)</i) ||
                     html.match(/<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]*)</i) ||
                     html.match(/Tournament Date[^:]*:\s*([^<\n]+)/i) ||
                     html.match(/Event Date[^:]*:\s*([^<\n]+)/i);
    
    // Try to extract date from various sources
    if (startAtMatch && startAtMatch[1]) {
      try {
        details.date = new Date(parseInt(startAtMatch[1]) * 1000).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        console.log('Failed to parse startAt timestamp:', startAtMatch[1]);
      }
    } else if (endAtMatch && endAtMatch[1]) {
      try {
        details.date = new Date(parseInt(endAtMatch[1]) * 1000).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        console.log('Failed to parse endAt timestamp:', endAtMatch[1]);
      }
    } else if (startDateMatch && startDateMatch[1]) {
      try {
        details.date = new Date(startDateMatch[1]).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        details.date = startDateMatch[1].trim();
      }
    } else if (dateMatch && dateMatch[1]) {
      try {
      details.date = new Date(dateMatch[1]).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      } catch (e) {
        details.date = dateMatch[1].trim();
      }
    }

    // Try to find tournament email - take the first email found anywhere in the HTML
    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && emailMatch[0]) {
      details.email = emailMatch[0].trim();
    }

    // Try to find location - improved patterns
    const locationMatch = html.match(/"location":\s*"([^"]*)"/i) ||
                         html.match(/"venueName":\s*"([^"]*)"/i) ||
                         html.match(/"venueAddress":\s*"([^"]*)"/i) ||
                         html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]*)</i) ||
                         html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]*)</i) ||
                         html.match(/Location[^:]*:\s*([^<\n]+)/i) ||
                         html.match(/Venue[^:]*:\s*([^<\n]+)/i);
    
    if (locationMatch && locationMatch[1]) {
      details.location = locationMatch[1].trim();
    }

    // Try to combine venue name and address if both are found
    const venueNameMatch = html.match(/"venueName":\s*"([^"]*)"/i);
    const venueAddressMatch = html.match(/"venueAddress":\s*"([^"]*)"/i);
    
    if (venueNameMatch && venueNameMatch[1] && venueAddressMatch && venueAddressMatch[1]) {
      details.location = `${venueNameMatch[1].trim()}, ${venueAddressMatch[1].trim()}`;
    } else if (venueNameMatch && venueNameMatch[1]) {
      details.location = venueNameMatch[1].trim();
    } else if (venueAddressMatch && venueAddressMatch[1]) {
      details.location = venueAddressMatch[1].trim();
    }

    return details;
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return {};
  }
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

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

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

  console.log('DEBUG: Tournaments from database:', tournaments?.length, tournaments?.map(t => t.title));

  if (error) {
    console.error('Error fetching tournaments:', error)
  }

  // Fetch additional details for each tournament
  const tournamentsWithDetails = await Promise.all(
    tournaments?.map(async (tournament: Tournament) => {
      const tournamentLink = findFirstUrl(tournament.description || '');
      const details = tournamentLink ? await getTournamentDetails(tournamentLink) : {};
      
      return {
        ...tournament,
        tournamentLink,
        details
      };
    }) || []
  )

  console.log('DEBUG: Tournaments with details:', tournamentsWithDetails.length, tournamentsWithDetails.map(t => t.title));

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Rankings - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-4">
              <h2 className="text-xl font-bold mb-4 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Current Rankings
              </h2>
              <div className="space-y-2">
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
              <div className="mt-3 text-center">
            <Link
                  href="/rankings"
                  className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold text-sm"
            >
                  View Full Rankings →
            </Link>
          </div>
        </div>
          </div>

          {/* Upcoming Tournaments - Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-4">
              <h2 className="text-xl font-bold mb-4 text-hawaii-accent border-b border-hawaii-border pb-2 font-monopol">
                Upcoming Tournaments
              </h2>
              <div className="space-y-3">
              {tournamentsWithDetails && tournamentsWithDetails.length > 0 ? (
                tournamentsWithDetails.map((tournament) => {
                                  return (
                    <div key={tournament.id} className="bg-card-bg-alt rounded-lg p-3 border border-hawaii-border hover:border-hawaii-primary/50 transition-colors">
                      {/* Tournament Image */}
                      {tournament.details.image && (
                        <div className="mb-2">
                          <TournamentImage
                            src={tournament.details.image}
                            alt={tournament.title}
                            title={tournament.title}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-base text-hawaii-primary line-clamp-1 font-monopol">{tournament.title}</h3>
                        <span className="text-xs text-hawaii-muted bg-card-bg px-2 py-1 rounded">
                          {tournament.details.date || new Date(tournament.created_at).toLocaleDateString()}
                        </span>
                    </div>
                      
                      {/* Tournament Details */}
                      <div className="space-y-1 mb-2">
                          {tournament.details.email && (
                            <div className="flex items-center text-xs text-hawaii-muted">
                              <span className="font-semibold mr-2">📧</span>
                              {tournament.details.email}
                            </div>
                          )}
                          
                          {tournament.details.location && (
                            <div className="flex items-center text-xs text-hawaii-muted">
                              <span className="font-semibold mr-2">📍</span>
                              {tournament.details.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-hawaii-muted">Tournament Organizer</span>
                      {tournament.tournamentLink && (
                          <Link
                            href={tournament.tournamentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                              className="bg-hawaii-primary text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-hawaii-secondary transition-colors"
                          >
                              View Details
                          </Link>
                          )}
                        </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-hawaii-muted mb-4">No tournaments found in database</p>
                  <p className="text-sm text-hawaii-muted">Debug info: tournaments.length = {tournaments?.length || 0}</p>
                </div>
              )}
                <div className="text-center pt-3">
                <Link
                  href="/tournaments"
                    className="text-hawaii-secondary hover:text-hawaii-accent transition-colors font-semibold text-sm"
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
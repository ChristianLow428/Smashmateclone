import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import Link from 'next/link';
import TournamentImage from '../components/TournamentImage';

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


    
    // Debug logging
    console.log('Extracted details for', url, ':', details);
    
    // Additional debug: log what we found in the HTML
    const debugDateMatch = html.match(/"startAt":\s*(\d+)/i);
    const debugLocationMatch = html.match(/"venueName":\s*"([^"]*)"/i);
    const debugEmailMatch = html.match(/"email":\s*"([^"]*)"/i);
    const debugContactEmailMatch = html.match(/"contactEmail":\s*"([^"]*)"/i);
    const debugContactMatch = html.match(/"contact":\s*"([^"]*)"/i);
    const debugMailtoMatch = html.match(/href="mailto:([^"]*)"/i);
    
    console.log('Debug - startAt found:', debugDateMatch ? debugDateMatch[1] : 'not found');
    console.log('Debug - venueName found:', debugLocationMatch ? debugLocationMatch[1] : 'not found');
    console.log('Debug - email found:', debugEmailMatch ? debugEmailMatch[1] : 'not found');
    console.log('Debug - contactEmail found:', debugContactEmailMatch ? debugContactEmailMatch[1] : 'not found');
    console.log('Debug - contact found:', debugContactMatch ? debugContactMatch[1] : 'not found');
    console.log('Debug - mailto found:', debugMailtoMatch ? debugMailtoMatch[1] : 'not found');
    
    // Debug: Check if we can find any email-like patterns in the HTML
    const allEmailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    console.log('Debug - All email patterns found:', allEmailMatches);
    
    // Debug: Check for any mailto patterns
    const allMailtoMatches = html.match(/mailto:[^"]*/g);
    console.log('Debug - All mailto patterns found:', allMailtoMatches);

    return details;
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return {};
  }
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  // Use service role key for server-side operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('DEBUG: Tournaments from database:', tournaments?.length, tournaments?.map(t => t.title));
  console.log('DEBUG: Full tournament data:', JSON.stringify(tournaments, null, 2));

  if (error) {
    console.error('Error fetching tournaments:', error);
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">Error Loading Tournaments</h1>
            <p className="text-hawaii-muted">{error.message}</p>
          </div>
        </div>
      </main>
    );
  }

  // Fetch additional details for each tournament (with timeout and error handling)
  const tournamentsWithDetails = await Promise.all(
    tournaments?.map(async (tournament: Tournament) => {
      const tournamentLink = findFirstUrl(tournament.description || '');
      let details = {};
      
      if (tournamentLink) {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          const detailsPromise = getTournamentDetails(tournamentLink);
          details = await Promise.race([detailsPromise, timeoutPromise]);
        } catch (error) {
          console.log(`Failed to fetch details for ${tournament.title}:`, error instanceof Error ? error.message : 'Unknown error');
          details = {};
        }
      }
      
      return {
        ...tournament,
        tournamentLink,
        details
      };
    }) || []
  );

  console.log('DEBUG: Tournaments with details:', tournamentsWithDetails.length, tournamentsWithDetails.map(t => t.title));

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-hawaii-primary font-monopol text-center">Upcoming Tournaments</h1>
        
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentsWithDetails.map((tournament) => {
            console.log('Tournament:', tournament.title, 'Link:', tournament.tournamentLink, 'Details:', tournament.details);
          
          return (
              <div key={tournament.id} className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6 flex flex-col h-full hover:border-hawaii-primary transition-colors">
                {/* Tournament Image */}
                {(tournament.details as any)?.image && (
                  <TournamentImage
                    src={(tournament.details as any).image}
                    alt={tournament.title}
                    title={tournament.title}
                  />
                )}
                
              <div className="flex-grow">
                  <h2 className="text-xl font-semibold mb-3 line-clamp-2 text-hawaii-accent font-monopol">{tournament.title}</h2>
                  
                  {/* Tournament Details */}
                  <div className="space-y-2 mb-4">
                    {(tournament.details as any)?.date && (
                      <div className="flex items-center text-sm text-hawaii-muted">
                        <span className="font-semibold mr-2">📅</span>
                        {(tournament.details as any).date}
                      </div>
                    )}
                    
                    {(tournament.details as any)?.email && (
                      <div className="flex items-center text-sm text-hawaii-muted">
                        <span className="font-semibold mr-2">📧</span>
                        {(tournament.details as any).email}
                      </div>
                    )}
                    
                    {(tournament.details as any)?.location && (
                      <div className="flex items-center text-sm text-hawaii-muted">
                        <span className="font-semibold mr-2">📍</span>
                        {(tournament.details as any).location}
                      </div>
                    )}
                  </div>
              </div>
                
                {tournament.tournamentLink && (
                <div className="mt-auto pt-4">
                  <Link
                      href={tournament.tournamentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="inline-block w-full text-center bg-hawaii-primary text-white px-4 py-2 rounded hover:bg-hawaii-accent transition-colors font-semibold"
                  >
                    View Details
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
        
        {tournamentsWithDetails.length === 0 && (
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">No Tournaments Available</h2>
            <p className="text-hawaii-muted">Check back soon for upcoming tournaments in Hawaii!</p>
        </div>
      )}
    </div>
    </main>
  );
} 
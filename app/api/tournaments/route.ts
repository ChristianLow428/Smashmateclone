import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Function to find the first URL in text
function findFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Function to extract tournament details from start.gg
async function getTournamentDetails(url: string) {
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
      return {};
    }

    const html = await response.text();
    
    // Extract tournament details using regex patterns
    const details: any = {};

    // Try to find tournament image
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) ||
                      html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i) ||
                      html.match(/<img[^>]*class="[^"]*tournament[^"]*"[^>]*src="([^"]*)"/i);
    
    if (imageMatch && imageMatch[1]) {
      details.image = imageMatch[1];
    }

    // Try to find tournament date
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
        // Failed to parse timestamp
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
        // Failed to parse timestamp
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

    // Try to find tournament email
    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && emailMatch[0]) {
      details.email = emailMatch[0].trim();
    }

    // Try to find location
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

    // Try to combine venue name and address
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

export async function GET() {
  try {
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch tournaments
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError)
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
    }

    // Fetch additional details for each tournament
    const tournamentsWithDetails = await Promise.all(
      tournaments?.map(async (tournament) => {
        const tournamentLink = findFirstUrl(tournament.description || '');
        const details = tournamentLink ? await getTournamentDetails(tournamentLink) : {};
        
        return {
          ...tournament,
          tournamentLink,
          details
        };
      }) || []
    )
    
    // Add cache-busting headers
    const response = NextResponse.json(tournamentsWithDetails)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error in tournaments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
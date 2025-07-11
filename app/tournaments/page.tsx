import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';

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

export default async function TournamentsPage() {
  // const cookieStore = cookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

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

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-hawaii-primary font-monopol text-center">Upcoming Tournaments</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments?.map((tournament: Tournament) => {
            const tournamentLink = findFirstUrl(tournament.description || '');
            console.log('Tournament:', tournament.title, 'Link:', tournamentLink);
            
            return (
              <div key={tournament.id} className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6 flex flex-col h-full hover:border-hawaii-primary transition-colors">
                <div className="flex-grow">
                  <h2 className="text-xl font-semibold mb-3 line-clamp-2 text-hawaii-accent font-monopol">{tournament.title}</h2>
                  <p className="text-hawaii-muted mb-4 line-clamp-4 leading-relaxed">{tournament.description}</p>
                </div>
                {tournamentLink && (
                  <div className="mt-auto pt-4">
                    <Link
                      href={tournamentLink}
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
        
        {tournaments?.length === 0 && (
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-hawaii-accent font-monopol">No Tournaments Available</h2>
            <p className="text-hawaii-muted">Check back soon for upcoming tournaments in Hawaii!</p>
          </div>
        )}
      </div>
    </main>
  );
} 
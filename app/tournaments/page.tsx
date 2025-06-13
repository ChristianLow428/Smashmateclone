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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments:', error);
    return <div>Error loading tournaments</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8"> List of Upcoming Tournaments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments?.map((tournament: Tournament) => {
          const tournamentLink = findFirstUrl(tournament.description || '');
          console.log('Tournament:', tournament.title, 'Link:', tournamentLink);
          
          return (
            <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-2 line-clamp-2">{tournament.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-4">{tournament.description}</p>
              </div>
              {tournamentLink && (
                <div className="mt-auto pt-4">
                  <Link
                    href={tournamentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full text-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
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
        <div className="text-center text-gray-600">
          No tournaments available at the moment.
        </div>
      )}
    </div>
  );
} 
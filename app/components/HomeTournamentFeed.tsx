'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../utils/supabase/client'
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

export default function HomeTournamentFeed() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setTournaments(data || []);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setError('Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-gray-600">
        No upcoming tournaments at the moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {tournaments.map((tournament: Tournament) => {
        const tournamentLink = findFirstUrl(tournament.description || '');
        
        return (
          <div key={tournament.id} className="bg-gray-50 rounded-lg p-4 flex flex-col h-full">
            <div className="flex-grow">
              <h3 className="font-semibold mb-1 line-clamp-1">{tournament.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{tournament.description}</p>
            </div>
            {tournamentLink && (
              <div className="mt-2">
                <Link
                  href={tournamentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  View Details →
                </Link>
              </div>
            )}
          </div>
        );
      })}
      <div className="text-right">
        <Link
          href="/tournaments"
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          View All Tournaments →
        </Link>
      </div>
    </div>
  );
} 
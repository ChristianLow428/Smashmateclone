import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const RANKINGS_CHANNEL_ID = '1147057808752267285';

export default async function RankingsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('discord_channel_id', RANKINGS_CHANNEL_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return <div>Error loading rankings</div>;
  }

  if (!messages || messages.length === 0) {
    return <div>No rankings available.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Latest Rankings</h1>
      <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{messages[0].content}</pre>
    </div>
  );
}
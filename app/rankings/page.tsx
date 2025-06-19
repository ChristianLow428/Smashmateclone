import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Use the same pattern as tournaments - fallback to hardcoded value if env var not available
const RANKINGS_CHANNEL_ID = process.env.DISCORD_RANKINGS_CHANNEL_ID || '1147057808752267285';

// Function to clean Discord markdown formatting
function cleanDiscordMarkdown(text: string): string {
  return text
    .replace(/\*\*__/g, '') // Remove **__
    .replace(/__\*\*/g, '') // Remove __**
    .replace(/\*\*/g, '')   // Remove **
    .replace(/__/g, '')     // Remove __
    .replace(/\*/g, '')     // Remove *
    .replace(/_/g, '')      // Remove _
    .trim();                // Remove extra whitespace
}

export default async function RankingsPage() {
  // Use the same server-side client as tournaments
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Comprehensive environment debugging
  const envDebug = {
    RANKINGS_CHANNEL_ID,
    hasChannelId: !!RANKINGS_CHANNEL_ID,
    channelIdLength: RANKINGS_CHANNEL_ID?.length,
    allDiscordVars: Object.keys(process.env).filter(key => key.includes('DISCORD')),
    allEnvVars: Object.keys(process.env).filter(key => key.includes('RANKING')),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  console.log('Environment Debug Info:', JSON.stringify(envDebug, null, 2));

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('discord_channel_id', RANKINGS_CHANNEL_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Query result:', { messages, error, channelId: RANKINGS_CHANNEL_ID });

  if (error) {
    return <div>Error loading rankings: {error.message}</div>;
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">No Rankings Available</h1>
        <div className="bg-yellow-100 p-4 rounded">
          <p>No rankings found for channel ID: {RANKINGS_CHANNEL_ID}</p>
          <p className="mt-2 text-sm">Debug info:</p>
          <pre className="bg-gray-100 p-2 rounded text-sm mt-2 overflow-auto">
            {JSON.stringify(envDebug, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const cleanedContent = cleanDiscordMarkdown(messages[0].content);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Latest Rankings</h1>
      <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{cleanedContent}</pre>
    </div>
  );
}
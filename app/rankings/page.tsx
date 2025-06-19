import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const RANKINGS_CHANNEL_ID = process.env.DISCORD_RANKINGS_CHANNEL_ID!;

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
  // Use service role key to bypass RLS restrictions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Comprehensive environment debugging
  const envDebug = {
    RANKINGS_CHANNEL_ID,
    hasChannelId: !!RANKINGS_CHANNEL_ID,
    channelIdLength: RANKINGS_CHANNEL_ID?.length,
    allDiscordVars: Object.keys(process.env).filter(key => key.includes('DISCORD')),
    allEnvVars: Object.keys(process.env).filter(key => key.includes('RANKING')),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    allEnvKeys: Object.keys(process.env).sort()
  };

  console.log('Environment Debug Info:', JSON.stringify(envDebug, null, 2));

  if (!RANKINGS_CHANNEL_ID) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Environment Variable Error</h1>
        <div className="bg-red-100 p-4 rounded">
          <p className="font-bold">DISCORD_RANKINGS_CHANNEL_ID environment variable is not set</p>
          <p className="mt-2">Debug info:</p>
          <pre className="bg-gray-100 p-2 rounded text-sm mt-2 overflow-auto">
            {JSON.stringify(envDebug, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

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
    return <div>No rankings available. Channel ID: {RANKINGS_CHANNEL_ID}</div>;
  }

  const cleanedContent = cleanDiscordMarkdown(messages[0].content);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Latest Rankings</h1>
      <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{cleanedContent}</pre>
    </div>
  );
}
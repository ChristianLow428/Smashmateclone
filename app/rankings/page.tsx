import { createClient } from '@supabase/supabase-js';
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
  // Use service role key to bypass RLS restrictions (like the webhook does)
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
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">Error Loading Rankings</h1>
            <p className="text-hawaii-muted">{error.message}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h1 className="text-4xl font-bold mb-4 text-hawaii-primary font-monopol">No Rankings Available</h1>
            <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
              <p className="text-hawaii-muted">No rankings found for channel ID: {RANKINGS_CHANNEL_ID}</p>
              <p className="mt-2 text-sm text-hawaii-muted">Debug info:</p>
              <pre className="bg-background p-2 rounded text-sm mt-2 overflow-auto text-hawaii-muted border border-hawaii-border">
                {JSON.stringify(envDebug, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const cleanedContent = cleanDiscordMarkdown(messages[0].content);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-hawaii-primary font-monopol text-center">Hawaii Rankings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Offline Rankings - Left Side */}
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h2 className="text-2xl font-bold mb-6 text-hawaii-accent font-monopol">Offline Rankings</h2>
            <pre className="bg-card-bg-alt p-4 rounded-lg whitespace-pre-wrap text-hawaii-muted border border-hawaii-border font-segoe max-h-96 overflow-y-auto">{cleanedContent}</pre>
          </div>

          {/* Online Rankings - Right Side (Placeholder) */}
          <div className="bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-8">
            <h2 className="text-2xl font-bold mb-6 text-hawaii-accent font-monopol">Online Rankings</h2>
            <div className="bg-card-bg-alt p-4 rounded-lg border border-hawaii-border">
              <p className="text-hawaii-muted text-center">Online rankings coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
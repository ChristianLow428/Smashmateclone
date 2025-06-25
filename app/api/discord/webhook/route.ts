import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin environment variables are not set');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Initialize Supabase client with service role key for admin operations
const supabase = getSupabaseAdminClient();

// Function to parse tournament details from Discord message
function parseTournamentMessage(content: string) {
  const titleMatch = content.match(/Tournament: (.*?)(?:\n|$)/);
  const dateMatch = content.match(/Date: (.*?)(?:\n|$)/);
  const deadlineMatch = content.match(/Registration Deadline: (.*?)(?:\n|$)/);
  const maxParticipantsMatch = content.match(/Max Participants: (\d+)/);
  const descriptionMatch = content.match(/Description: ([\s\S]*?)(?:\n\n|$)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    date: dateMatch ? new Date(dateMatch[1].trim()) : null,
    registration_deadline: deadlineMatch ? new Date(deadlineMatch[1].trim()) : null,
    max_participants: maxParticipantsMatch ? parseInt(maxParticipantsMatch[1]) : null,
    description: descriptionMatch ? descriptionMatch[1].trim() : null,
  };
}

export async function POST(request: Request) {
  try {
    // Debug: Log Supabase configuration
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
    console.log('Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');

    const body = await request.json();
    
    // Debug: Log incoming webhook data
    console.log('Received webhook data:', {
      channel_id: body.channel_id,
      message_id: body.id,
      has_tournament: body.content.includes('Tournament:')
    });

    // Verify Discord webhook signature if needed
    // Add your Discord webhook verification logic here

    // Only process messages from the tournament channel
    if (body.channel_id !== process.env.DISCORD_TOURNAMENT_CHANNEL_ID) {
      console.log('Ignored message from non-tournament channel');
      return NextResponse.json({ message: 'Ignored message from non-tournament channel' });
    }

    // Only process messages that contain tournament information
    if (!body.content.includes('Tournament:')) {
      console.log('Not a tournament message');
      return NextResponse.json({ message: 'Not a tournament message' });
    }

    const tournamentData = parseTournamentMessage(body.content);
    console.log('Parsed tournament data:', tournamentData);

    // Validate required fields
    if (!tournamentData.title || !tournamentData.date) {
      console.log('Missing required tournament information');
      return NextResponse.json({ error: 'Missing required tournament information' }, { status: 400 });
    }

    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('tournaments')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Insert tournament into database
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        discord_message_id: body.id,
        discord_channel_id: body.channel_id,
        ...tournamentData,
        status: 'upcoming'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting tournament:', error);
      return NextResponse.json({ error: 'Failed to save tournament' }, { status: 500 });
    }

    console.log('Tournament saved successfully:', data);
    return NextResponse.json({ message: 'Tournament saved successfully', tournament: data });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
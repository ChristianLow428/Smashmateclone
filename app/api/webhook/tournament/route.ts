import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received tournament data:', data);

    // Extract tournament information
    const { content, timestamp, discord_message_id, discord_channel_id, title, description } = data;

    // Skip if no title
    if (!title) {
      console.log('Skipping message - missing title');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert to Supabase (insert or update)
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .upsert(
        {
          title,
          description: content,
          discord_message_id,
          discord_channel_id,
          created_at: timestamp,
        },
        {
          onConflict: 'discord_message_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving tournament:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Tournament saved successfully:', tournament);
    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new endpoint to clean up old tournaments
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageIds = searchParams.get('messageIds')?.split(',') || [];

    if (messageIds.length === 0) {
      return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 });
    }

    // Delete tournaments that aren't in the provided message IDs
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .not('discord_message_id', 'in', `(${messageIds.join(',')})`);

    if (error) {
      console.error('Error deleting old tournaments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cleaning up tournaments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const data = await request.json();
  console.log('Received ranking data:', data);
  try {
    const { content, timestamp, discord_message_id, discord_channel_id } = data;

    const { data: ranking, error } = await supabase
      .from('messages')
      .insert({
        content,
        discord_message_id,
        discord_channel_id,
        created_at: timestamp,
        sender_id: '00000000-0000-0000-0000-000000000000', // dummy value
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving ranking:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ranking });
  } catch (error) {
    console.error('Error processing ranking webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
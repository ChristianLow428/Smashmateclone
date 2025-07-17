import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use the same pattern as tournaments - fallback to hardcoded value if env var not available
const RANKINGS_CHANNEL_ID = process.env.DISCORD_RANKINGS_CHANNEL_ID || '1147057808752267285'

export async function GET() {
  try {
    // Use service role key to bypass RLS restrictions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('discord_channel_id', RANKINGS_CHANNEL_ID)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching offline rankings:', error)
      return NextResponse.json({ error: 'Failed to fetch offline rankings' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ content: 'No offline rankings available' })
    }

    return NextResponse.json({ content: messages[0].content })
  } catch (error) {
    console.error('Error in offline rankings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
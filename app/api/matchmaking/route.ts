import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const supabase = createClient(cookies());

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, preferences } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Insert or update player in matchmaking queue
    const { data: player, error: insertError } = await supabase
      .from('matchmaking_players')
      .upsert({
        id: userId,
        status: 'searching',
        preferences: preferences,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting player:', insertError);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    // Try to find a match
    const { data: opponents, error: findError } = await supabase
      .from('matchmaking_players')
      .select('*')
      .eq('status', 'searching')
      .neq('id', userId)
      .limit(10); // Get more candidates and filter in JS

    if (findError) {
      console.error('Error finding opponents:', findError);
      return NextResponse.json({ status: 'searching', player });
    }

    // Filter by island preference in JavaScript
    const compatibleOpponents = opponents?.filter(opponent => 
      opponent.preferences?.island === preferences.island
    ) || [];

    if (compatibleOpponents.length > 0) {
      const opponent = compatibleOpponents[0];
      
      // Create a match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          player1_id: userId,
          player2_id: opponent.id,
          status: 'character_selection',
          stage_striking: {
            currentPlayer: 0,
            strikesRemaining: 1,
            availableStages: ["Battlefield", "Final Destination", "Hollow Bastion", "Pokemon Stadium 2", "Small Battlefield"],
            bannedStages: []
          },
          character_selection: {
            player1Character: null,
            player2Character: null,
            bothReady: false
          },
          game_result_validation: {
            player1Reported: null,
            player2Reported: null,
            bothReported: false
          }
        })
        .select()
        .single();

      if (matchError) {
        console.error('Error creating match:', matchError);
        return NextResponse.json({ status: 'searching', player });
      }

      // Update both players to in_match status
      await supabase
        .from('matchmaking_players')
        .update({ status: 'in_match' })
        .in('id', [userId, opponent.id]);

      return NextResponse.json({
        status: 'matched',
        matchId: match.id,
        opponent: opponent
      });
    }

    return NextResponse.json({ status: 'searching', player });
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const supabase = createClient(cookies());
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove player from matchmaking queue
    await supabase
      .from('matchmaking_players')
      .update({ status: 'offline' })
      .eq('id', userId);

    return NextResponse.json({ status: 'cancelled' });
  } catch (error) {
    console.error('Cancel matchmaking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
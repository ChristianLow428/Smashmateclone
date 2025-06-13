import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Store active matchmaking requests
const matchmakingQueue: { userId: string; timestamp: number }[] = [];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const supabase = await createServerClient();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    const currentTime = Date.now();

    // Remove expired requests (older than 5 minutes)
    const validRequests = matchmakingQueue.filter(
      request => currentTime - request.timestamp < 300000
    );

    // Check if there's a match
    const potentialMatch = validRequests.find(request => request.userId !== userId);
    
    if (potentialMatch) {
      // Create a chat room
      const { data: chatRoom, error: chatError } = await supabase
        .from('chat_rooms')
        .insert({
          participants: [userId, potentialMatch.userId],
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Remove both users from queue
      matchmakingQueue.splice(matchmakingQueue.indexOf(potentialMatch), 1);
      matchmakingQueue.splice(matchmakingQueue.findIndex(r => r.userId === userId), 1);

      return NextResponse.json({
        status: 'matched',
        chatRoomId: chatRoom.id,
        opponentId: potentialMatch.userId
      });
    }

    // Add user to queue if not already present
    if (!matchmakingQueue.find(r => r.userId === userId)) {
      matchmakingQueue.push({
        userId,
        timestamp: currentTime
      });
    }

    return NextResponse.json({ status: 'searching' });
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Failed to process matchmaking' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await request.json();
    
    // Remove user from queue
    const index = matchmakingQueue.findIndex(r => r.userId === userId);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }

    return NextResponse.json({ status: 'cancelled' });
  } catch (error) {
    console.error('Cancel matchmaking error:', error);
    return NextResponse.json({ error: 'Failed to cancel matchmaking' }, { status: 500 });
  }
} 
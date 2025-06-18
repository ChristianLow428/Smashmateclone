'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function FreeBattle() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: cancel matchmaking when component unmounts
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (isSearching) {
        cancelMatchmaking();
      }
    };
  }, [isSearching, searchTimeout]);

  const startMatchmaking = async () => {
    if (!session?.user?.email) {
      router.push('/login');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: (session.user as { id?: string }).id }),
      });

      const data = await response.json();

      if (data.status === 'matched') {
        // Redirect to chat room
        router.push(`/chat/${data.chatRoomId}`);
      } else {
        // Continue searching
        const timeout = setTimeout(startMatchmaking, 5000); // Poll every 5 seconds
        setSearchTimeout(timeout);
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      setIsSearching(false);
    }
  };

  const cancelMatchmaking = async () => {
    if (!session?.user?.email) return;

    try {
      await fetch('/api/matchmaking', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: (session.user as { id?: string }).id }),
      });
    } catch (error) {
      console.error('Cancel matchmaking error:', error);
    } finally {
      setIsSearching(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-100 rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-8">Free Battle</h2>
      {isSearching ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Searching for opponent...</p>
          <button
            onClick={cancelMatchmaking}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={startMatchmaking}
          className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg font-semibold"
        >
          Find Match
        </button>
      )}
    </div>
  );
} 
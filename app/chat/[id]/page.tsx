'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createServerClient } from '@/utils/supabase/server';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export default function ChatRoom({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    const initSupabase = async () => {
      const client = await createServerClient();
      setSupabase(client);

      // Subscribe to new messages
      const channel = client
        .channel(`chat_room_${params.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_room_id=eq.${params.id}`,
          },
          (payload: any) => {
            setMessages(current => [...current, payload.new]);
          }
        )
        .subscribe();

      // Load existing messages
      const { data } = await client
        .from('messages')
        .select('*')
        .eq('chat_room_id', params.id)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
      }

      return () => {
        channel.unsubscribe();
      };
    };

    initSupabase();
  }, [params.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase || !session?.user?.id) return;

    try {
      await supabase.from('messages').insert({
        chat_room_id: params.id,
        sender_id: session.user.id,
        content: newMessage.trim(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!session) {
    return <div>Please log in to access the chat room.</div>;
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              message.sender_id === session.user?.id
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-200 text-gray-800'
            } max-w-[70%]`}
          >
            <p>{message.content}</p>
            <span className="text-xs opacity-70">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
} 
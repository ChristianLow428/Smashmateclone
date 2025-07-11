'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [fullName, setFullName] = useState(user.name || '');
  const [displayName, setDisplayName] = useState(user.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { data: session, update } = useSession();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          // Full name should always be the authenticated user's name
          setFullName(user.name || '');
          // Display name can be customized
          if (data.displayName) {
            setDisplayName(data.displayName);
          } else if (data.name) {
            setDisplayName(data.name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, [user.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          displayName 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the session with the new display name
      console.log('Updating session with display name:', displayName);
      await update({
        user: {
          ...session?.user,
          name: displayName,
        },
      });

      setMessage('Profile updated successfully!');
      
      // Dispatch a custom event to notify the navbar to refresh the display name
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-hawaii-accent font-monopol">
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          value={fullName}
          readOnly
          className="mt-1 block w-full rounded-md border-hawaii-border bg-gray-100 text-hawaii-muted shadow-sm px-3 py-2 cursor-not-allowed"
          placeholder="Your Discord username"
        />
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-hawaii-accent font-monopol">
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 block w-full rounded-md border-hawaii-border bg-card-bg-alt text-hawaii-muted shadow-sm focus:border-hawaii-primary focus:ring-hawaii-primary focus:outline-none px-3 py-2"
          placeholder="Enter your display name"
          required
        />
      </div>

      {message && (
        <div
          className={`p-3 rounded-md ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-hawaii-primary hover:bg-hawaii-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hawaii-primary disabled:opacity-50 transition-colors font-monopol"
      >
        {isLoading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
} 
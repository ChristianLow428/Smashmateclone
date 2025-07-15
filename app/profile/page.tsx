'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProfileForm from '../components/ProfileForm';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hawaii-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-card-bg rounded-lg shadow-lg border border-hawaii-border p-6">
          <h1 className="text-2xl font-bold text-center mb-6 text-hawaii-primary font-monopol">Profile Settings</h1>
        <ProfileForm user={session.user ?? {}} />
      </div>
    </div>
    </main>
  );
} 
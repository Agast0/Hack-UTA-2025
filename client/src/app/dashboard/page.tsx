'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileTeamSelector } from '@/components/layout/mobile-team-selector';
import { MainContent } from '@/components/dashboard/main-content';
import { useAuthStore } from '@/lib/store';

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user: auth0User } = useAuth0();
  const { user, syncUser, isAuthenticated: storeAuthenticated } = useAuthStore();
  const router = useRouter();

  // Sync Auth0 user with backend
  useEffect(() => {
    if (isAuthenticated && auth0User && !user) {
      syncUser({
        sub: auth0User.sub || '',
        email: auth0User.email || '',
        name: auth0User.name,
        picture: auth0User.picture,
      }).catch(console.error);
    }
  }, [isAuthenticated, auth0User, user, syncUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobileTeamSelector />
      <div className="flex h-[calc(100vh-73px-60px)] lg:h-[calc(100vh-73px)]">
        <Sidebar />
        <div className="flex-1 lg:ml-0">
          <MainContent />
        </div>
      </div>
    </div>
  );
}

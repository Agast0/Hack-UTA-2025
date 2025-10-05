'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileTeamSelector } from '@/components/layout/mobile-team-selector';
import { MainContent } from '@/components/dashboard/main-content';

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
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

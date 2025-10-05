'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useState } from 'react';
import { useEffect } from 'react';
import { useUiStore } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const mlgMode = useUiStore((s) => s.mlgMode);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.setAttribute('data-mlg', mlgMode ? 'true' : 'false');
    }
  }, [mlgMode]);

  return (
    <Auth0Provider
      domain="dev-h52hz8oszd0xc8yd.us.auth0.com"
      clientId="2Y14d36migYyogqJARf1X7szyqClwTc4"
      authorizationParams={{
        redirect_uri: 'http://localhost:3000/dashboard'
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
  );
}

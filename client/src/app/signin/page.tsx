'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Bug, Target } from 'lucide-react';
import Image from 'next/image';

export default function SignInPage() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float"></div>
      <div className="absolute top-40 right-32 w-24 h-24 bg-secondary/15 rounded-full blur-lg animate-drift"></div>
      <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-accent/20 rounded-full blur-md animate-float delay-2000"></div>
      <div className="absolute bottom-20 right-20 w-28 h-28 bg-primary/8 rounded-full blur-xl animate-drift delay-500"></div>
      
      {/* Additional Glowing Orbs */}
      <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-primary/5 rounded-full blur-lg animate-glow"></div>
      <div className="absolute bottom-1/3 right-1/3 w-12 h-12 bg-secondary/8 rounded-full blur-md animate-glow delay-1000"></div>
      
      {/* Animated Lines */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 left-0 w-1 h-32 bg-gradient-to-b from-primary/30 to-transparent animate-pulse"></div>
        <div className="absolute top-1/3 right-0 w-1 h-24 bg-gradient-to-b from-secondary/25 to-transparent animate-pulse delay-700"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-20 bg-gradient-to-b from-accent/20 to-transparent animate-pulse delay-1500"></div>
      </div>
      
      <div className="w-full max-w-lg relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="BugZooka Logo"
              width={180}
              height={180}
              className="rounded-2xl shadow-2xl"
            />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight pb-2">
            BugZooka
          </h1>
          <p className="text-xl text-muted-foreground mb-6">Your AI-powered bug hunting companion</p>
          
          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="h-3 w-3 mr-1" />
              Security Testing
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Target className="h-3 w-3 mr-1" />
              Automated Audits
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Bug className="h-3 w-3 mr-1" />
              Bug Detection
            </Badge>
          </div>
        </div>

        {/* Sign In Card */}
        <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome to BugZooka</CardTitle>
            <CardDescription className="text-base">
              Sign in to start your automated security testing journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleLogin}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95 active:translate-y-0 hover:animate-button-pulse relative overflow-hidden group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 relative z-10">
                  <Shield className="h-5 w-5" />
                  <span>Sign In with Auth0</span>
                </div>
              )}
              
              {/* Shimmer effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                🔒 Secure authentication powered by Auth0
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Built with ❤️ for HackUTA 2025
          </p>
        </div>
      </div>
    </div>
  );
}

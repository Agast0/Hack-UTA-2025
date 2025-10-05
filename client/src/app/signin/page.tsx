'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, Shield } from 'lucide-react';

export default function SignInPage() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3 mr-3">
              <Bug className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="bg-secondary rounded-full p-3">
              <Shield className="h-8 w-8 text-secondary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">BugZooka</h1>
          <p className="text-muted-foreground">Your AI-powered bug hunting companion</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome to BugZooka</CardTitle>
            <CardDescription>
              Sign in with Auth0 to start hunting bugs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In with Auth0'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Secure authentication powered by Auth0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Loader2 } from 'lucide-react';

export default function Landing() {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // If the app is still checking who they are, show a spinner
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If they are ALREADY logged in, bypass this page and send them to their profile
  if (isAuthenticated) {
    return <Navigate to="/my-profile" replace />;
  }

  // If they are logged out, show the options
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Full Send Portal</h1>
        <p className="text-muted-foreground">Welcome! Please choose an option below.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-md">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Existing Member
            </CardTitle>
            <CardDescription>Log in to access your profile and dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-lg h-12">
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              New Member
            </CardTitle>
            <CardDescription>Join the community and create your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full text-lg h-12">
              <Link to="/join">Create Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Loader2 } from 'lucide-react';

export default function Portal() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
       console.log("DEBUG: Portal page detected authenticated user, redirecting to profile...");
       navigate('/my-profile', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/my-profile" replace />;
  }

  return (
    /* 1. Removed justify-center so it doesn't force vertical centering
       2. Kept items-center to keep the boxes horizontally centered
       3. Increased padding to pt-20 / md:pt-32 to match the Login screen exactly
    */
    <div className="min-h-screen flex flex-col items-center bg-slate-50 p-4 pt-20 md:pt-32">
      
      <div className="w-full max-w-md text-center mb-10">
        <h1 className="text-4xl font-extrabold text-primary mb-3 tracking-tight">Member Portal</h1>
        <p className="text-muted-foreground text-lg font-medium">Choose an option to get started</p>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full max-w-md">
        <Card className="hover:border-primary/50 transition-all shadow-sm hover:shadow-md border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="w-6 h-6 text-primary" />
              Existing Member
            </CardTitle>
            <CardDescription className="text-base">
              Log in to access your profile, check meetings, and manage your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full text-lg h-12">
              <Link to="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all shadow-sm hover:shadow-md border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="w-6 h-6 text-primary" />
              New Member
            </CardTitle>
            <CardDescription className="text-base">
              New to Full Send? Register here to create your racing profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full text-lg h-12 border-primary text-primary hover:bg-primary/5">
              <Link to="/join">Create Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
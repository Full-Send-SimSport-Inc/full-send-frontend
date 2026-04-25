import React, { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Loader2, ChevronRight } from 'lucide-react';

export default function Portal() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window.storefrontUrls === 'undefined') {
        window.storefrontUrls = {};
    }
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
       navigate('/my-profile', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="py-20 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/my-profile" replace />;
  }

  return (
    /* The "Anti-White-Space" wrapper:
       - No min-h properties.
       - Negative top margin on mobile to fight theme padding.
       - pb-0 to ensure no space below the content inside our app.
    */
    <div className="bg-slate-50 p-4 pt-0 pb-0 md:pt-12 -mt-4 md:mt-0 max-w-4xl mx-auto overflow-hidden">

      {/* Tighter Heading Section */}
      <div className="w-full text-center mb-4 md:mb-10">
        <p className="text-sm md:text-xl font-bold text-muted-foreground tracking-wider opacity-80 py-1">
          Welcome to the Member Portal. Choose an option:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 w-full">

        {/* Existing Member Card */}
        <Card className="hover:border-primary/50 transition-all shadow-sm border-2 bg-white overflow-hidden">
          <CardContent className="p-3 md:p-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1 md:mb-4">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <User className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-slate-900">Existing Member</h3>
              </div>

              <p className="text-xs md:text-base text-muted-foreground leading-snug mb-3 md:mb-4">
                Log in to access your profile, check meetings, and manage your account.
              </p>

              <Button asChild className="w-full h-10 md:h-12 text-sm md:text-lg">
                <Link to="/login" className="flex items-center justify-center gap-1">
                  <span>Sign In</span>
                  <ChevronRight className="w-4 h-4 md:hidden" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* New Member Card */}
        <Card className="hover:border-primary/50 transition-all shadow-sm border-2 border-dashed bg-white overflow-hidden">
          <CardContent className="p-3 md:p-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1 md:mb-4">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <UserPlus className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-slate-900">New Member</h3>
              </div>

              <p className="text-xs md:text-base text-muted-foreground leading-snug mb-3 md:mb-4">
                New to Full Send? Register here to create your racing profile and join the club.
              </p>

              <Button asChild variant="outline" className="w-full h-10 md:h-12 text-sm md:text-lg border-primary text-primary">
                <Link to="/join" className="flex items-center justify-center gap-1">
                  <span>Create Profile</span>
                  <ChevronRight className="w-4 h-4 md:hidden" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Tiny footer margin */}
      <div className="pt-4 pb-2 text-center text-[10px] text-slate-400 md:hidden">
        Full Send v1.0
      </div>
    </div>
  );
}
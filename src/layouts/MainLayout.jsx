import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut, User, Trophy, ShieldCheck, Loader2 } from 'lucide-react';

export default function MainLayout() {
  const { user, logout, isLoadingAuth } = useAuth();
  const location = useLocation();

  // Show a loader if we are still checking the session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine if the user has Admin/Committee permissions
  const isAdmin = user?.roles?.some(role => ['administrator', 'committee'].includes(role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          
          {/* Logo / Home Link */}
          <Link to="/my-profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-bold text-lg hidden xs:block">Full Send Portal</h1>
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/meetings">
              <Button 
                variant={location.pathname === '/meetings' ? "secondary" : "ghost"} 
                size="sm"
                className="gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Meetings</span>
              </Button>
            </Link>

            <Link to="/my-profile">
              <Button 
                variant={location.pathname === '/my-profile' ? "secondary" : "ghost"} 
                size="sm"
                className="gap-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>

            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-blue-600 gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <Button onClick={logout} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1">
        {/* This is where MyProfile.jsx or Meetings.jsx will be rendered */}
        <Outlet />
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-white">
        © {new Date().getFullYear()} Full Send SimSports Inc.
      </footer>
    </div>
  );
}
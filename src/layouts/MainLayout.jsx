import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut, User, Trophy } from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/my-profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Full Send Portal</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">SimSports Inc.</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/meetings">
              <Button variant="ghost" size="sm" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Meetings</span>
              </Button>
            </Link>
            
            <Link to="/my-profile">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* This renders MyProfile or Meetings depending on the URL */}
        <Outlet />
      </main>

      <footer className="py-12 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Full Send SimSports Inc.
      </footer>
    </div>
  );
}
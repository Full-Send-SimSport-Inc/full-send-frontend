import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut, User, Trophy, ShieldCheck, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserNotRegisteredError from '@/components/auth/UserNotRegisteredError';

const NAV_ITEMS = [
  { label: 'My Profile', path: '/my-profile', icon: User },
  { label: 'Meetings', path: '/Meetings', icon: CalendarDays },
];

export default function MainLayout() {
  const { user, logout, isLoadingAuth } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    const logoutUrl = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = logoutUrl;
  };
  
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
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl text-primary">Member Portal</span>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.path 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
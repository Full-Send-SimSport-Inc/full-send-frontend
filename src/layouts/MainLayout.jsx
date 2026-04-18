import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  LogOut, 
  User, 
  Trophy, 
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();

  // Show a blank state or spinner while checking auth to prevent layout jumps
  if (loading) return <div className="min-h-screen bg-slate-50" />;

  // Check if the user is an admin or committee member
  const isAdmin = user?.roles?.some(role => 
    ['administrator', 'committee'].includes(role)
  );

  const navigation = [
    { name: 'Meetings', href: '/meetings', icon: CalendarDays },
    { name: 'My Profile', href: '/my-profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          {/* Logo Section */}
          <Link to="/my-profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="hidden xs:block">
              <h1 className="font-bold text-lg leading-none">Full Send Portal</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">SimSports Inc.</p>
            </div>
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {navigation.map((item) => (
              <Link key={item.name} to={item.href}>
                <Button 
                  variant={location.pathname === item.href ? "secondary" : "ghost"} 
                  size="sm" 
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Button>
              </Link>
            ))}

            {/* Admin Link - Only visible to Committee/Admins */}
            {isAdmin && (
              <Link to="/admin">
                <Button 
                  variant={location.pathname.startsWith('/admin') ? "secondary" : "ghost"}
                  size="sm" 
                  className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden md:inline">Admin</span>
                </Button>
              </Link>
            )}
            
            <div className="h-6 w-px bg-slate-200 mx-1" />

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 px-2 sm:px-3"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto py-6 px-4">
          <Outlet />
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t bg-white">
        © {new Date().getFullYear()} Full Send SimSports Inc.
      </footer>
    </div>
  );
}
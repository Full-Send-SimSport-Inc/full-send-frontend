import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { 
  CalendarDays, 
  LogOut, 
  User, 
  ShieldCheck, 
  Loader2, 
  Users, 
  Mail, 
  LayoutDashboard,
  LogIn 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    const logoutUrl = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = logoutUrl;
  };

  const isAdmin = user?.roles?.some(role => ['administrator', 'committee'].includes(role));
  const isWPAdmin = user?.roles?.includes('administrator');

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-xl text-primary shrink-0 hover:opacity-80 transition-opacity">
              Member Portal
            </Link>
            
            <nav className="hidden lg:flex items-center gap-1">
              {!user && (
                <Link
                  to="/"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === '/' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Portal Home
                </Link>
              )}

              <Link
                to="/meetings"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === '/meetings' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Meetings
              </Link>

              {user && (
                <Link
                  to="/my-profile"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === '/my-profile' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
              )}

              {isAdmin && (
                <>
                    <div className="w-px h-6 bg-slate-200 mx-2" />
                    
                  <Link
                    to="/admin"
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        // Only highlight if it's EXACTLY /admin
                        location.pathname === '/admin' ? "bg-blue-50 text-blue-700" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    >
                    <LayoutDashboard className="w-4 h-4" />
                    Member Dashboard
                  </Link>

                  <Link
                    to="/admin/members"
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        location.pathname.startsWith('/admin/members') ? "bg-blue-50 text-blue-700" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    >
                    <Users className="w-4 h-4" />
                    Member Management
                  </Link>

                  <Link
                    to="/admin/email"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname.startsWith('/admin/email') ? "bg-blue-50 text-blue-700" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Link>

                  <Link
                    to="/admin/agm"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname.startsWith('/admin/agm') ? "bg-blue-50 text-blue-700" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    AGMs
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isWPAdmin && (
              <a 
                href="/wp-admin" 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xl:inline">WP Admin</span>
              </a>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link 
                to="/" 
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-full transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Join
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
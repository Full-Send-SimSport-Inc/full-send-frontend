import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, UserPlus, LogOut, CalendarDays, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import UserNotRegisteredError from '@/components/auth/UserNotRegisteredError';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Members', path: '/admin/members', icon: Users },
  { label: 'AGM', path: '/admin/agm', icon: CalendarDays },
  { label: 'Users', path: '/admin/users', icon: ShieldCheck },
  { label: 'Send Email', path: '/admin/email', icon: Mail },
  { label: 'New Registration', path: '/', icon: UserPlus },
];

export default function AdminLayout() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function verifyAccess() {
      try {
        // Call the WordPress /me endpoint we built in PHP
        const user = await base44.get('/me');
        
        // Check if the WP user has administrator or committee roles
        if (user && user.roles && (user.roles.includes('administrator') || user.roles.includes('committee'))) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    }

    verifyAccess();
  }, []);

  const handleLogout = () => {
    // Redirect to standard WordPress logout URL, then back to the home page
    window.location.href = '/wp-login.php?action=logout&redirect_to=' + encodeURIComponent(window.location.origin);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Verifying credentials...</p>
      </div>
    );
  }

  // If they aren't an admin/committee, show the restricted screen
  if (!authorized) {
    return <UserNotRegisteredError />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <header className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r flex flex-col shrink-0">
        <div className="p-4 md:p-6 flex items-center justify-between md:flex-col md:items-start md:h-full gap-6">
          <div className="w-full space-y-6">
            <Link to="/admin" className="font-black text-xl tracking-tight text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="hidden md:inline">Committee</span>
            </Link>
            <nav className="hidden md:flex flex-col gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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
        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
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
      </header>

      {/* Main Content */}
		<main className="flex-1 w-full min-w-0 bg-slate-50/50">
		  <div className="max-w-7xl mx-auto p-4 md:p-8">
			<Outlet />
		  </div>
		</main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, UserPlus, LogOut, CalendarDays, ShieldCheck, Mail, Loader2, Lock } from 'lucide-react';
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
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    async function verifyAccess() {
      try {
        const user = await base44.get('/me');
        if (user && user.roles) {
          setUserRoles(user.roles);
          if (user.roles.includes('administrator') || user.roles.includes('committee')) {
            setAuthorized(true);
          }
        }
      } catch (error) {
        console.error('Access verification failed:', error);
      } finally {
        setChecking(false);
      }
    }
    verifyAccess();
  }, []);

  const handleLogout = () => {
    const logoutUrl = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = logoutUrl;
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return <UserNotRegisteredError />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl text-primary">FS Portal</span>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {userRoles.includes('administrator') && (
                <a href="/wp-admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors border-l ml-2 pl-4">
                  <Lock className="w-4 h-4" />
                  WP Backend
                </a>
              )}
            </nav>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
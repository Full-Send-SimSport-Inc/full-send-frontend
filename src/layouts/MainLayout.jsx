import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CalendarDays,
  LogOut,
  User,
  ShieldCheck,
  Loader2,
  Users,
  Mail,
  LayoutDashboard,
  LogIn,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    const logoutUrl = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = logoutUrl;
  };

  const isActuallyAdmin = user?.isAdmin === true ||
    user?.roles?.some(role => ['administrator', 'executive_committee', 'committee'].includes(role));

  const isWPAdmin = user?.roles?.includes('administrator');

  if (isLoadingAuth) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const NavLinks = ({ mobile = false }) => {
    const linkClass = mobile
      ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";

    const activeClass = "bg-primary text-primary-foreground shadow-sm";
    const adminActiveClass = "bg-blue-600 text-white shadow-sm";
    const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-slate-100";

    return (
      <div className={cn("flex", mobile ? "flex-col gap-0.5" : "flex-row gap-1 items-center")}>
        {(mobile || !user) && (
          <Link
            to="/"
            className={cn(linkClass, location.pathname === '/' ? activeClass : inactiveClass)}
          >
            <LayoutDashboard className={mobile ? "w-5 h-5" : "w-4 h-4"} />
            Portal Home
          </Link>
        )}

        {user && (
          <Link
            to="/my-profile"
            className={cn(linkClass, location.pathname === '/my-profile' ? activeClass : inactiveClass)}
          >
            <User className={mobile ? "w-5 h-5" : "w-4 h-4"} />
            My Profile
          </Link>
        )}

        <Link
          to="/meetings"
          className={cn(linkClass, location.pathname === '/meetings' ? activeClass : inactiveClass)}
        >
          <CalendarDays className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          Meetings
        </Link>

        {isActuallyAdmin && (
          <>
            {!mobile && <div className="w-px h-6 bg-slate-200 mx-2" />}
            {mobile && (
              <div className="mt-2 mb-1 px-3 border-t pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Management</p>
              </div>
            )}

            <Link
              to="/admin"
              className={cn(linkClass, location.pathname === '/admin' ? adminActiveClass : inactiveClass)}
            >
              <LayoutDashboard className={mobile ? "w-5 h-5" : "w-4 h-4"} />
              Dashboard
            </Link>

            <Link
              to="/admin/members"
              className={cn(linkClass, location.pathname.startsWith('/admin/members') ? adminActiveClass : inactiveClass)}
            >
              <Users className={mobile ? "w-5 h-5" : "w-4 h-4"} />
              Members
            </Link>

            <Link
              to="/admin/email"
              className={cn(linkClass, location.pathname.startsWith('/admin/email') ? adminActiveClass : inactiveClass)}
            >
              <Mail className={mobile ? "w-5 h-5" : "w-4 h-4"} />
              Email
            </Link>

            <Link
              to="/admin/agm"
              className={cn(linkClass, location.pathname.startsWith('/admin/agm') ? adminActiveClass : inactiveClass)}
            >
              <ShieldCheck className={mobile ? "w-5 h-5" : "w-4 h-4"} />
              AGMs
            </Link>
          </>
        )}

        {mobile && isWPAdmin && (
          <a
            href="/wp-admin"
            className={cn(linkClass, "text-amber-700 hover:bg-amber-50 mt-1")}
          >
            <Settings className="w-5 h-5" />
            WordPress Admin
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen relative flex flex-col">
      <header className={cn(
        "bg-white border-b h-16 shrink-0 transition-opacity duration-200",
        isMobile ? "fixed top-0 left-0 right-0 z-[9999]" : "sticky top-0 z-10 shadow-sm",
        (isMobile && mobileMenuOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            {!isMobile && (
              <Link to="/" className="font-bold text-lg sm:text-xl text-primary shrink-0">
                Member Portal
              </Link>
            )}

            <nav className="hidden lg:block ml-4">
              <NavLinks />
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {isWPAdmin && (
              <a href="/wp-admin" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg">
                <LayoutDashboard className="w-4 h-4" />
                <span>WP Admin</span>
              </a>
            )}
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-full">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {!user && isMobile && (
            <Link to="/" className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-full">
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </header>

      {isMobile && <div className="h-16" />}

      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 z-[10000] backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-x-0 top-0 z-[10001] bg-white shadow-2xl overflow-y-auto lg:hidden min-h-screen"
          >
            {/* X Button removed to prevent conflict with WordPress theme header.
                Menu can be closed by clicking the "Close Menu" button or the backdrop.
            */}
            <nav className="p-5 pt-32 flex flex-col">
              <NavLinks mobile={true} />

              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 mt-4 border-t border-slate-100 text-red-600 font-semibold w-full text-left text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mt-6 w-full py-4 text-center text-xs text-slate-400 uppercase tracking-widest font-bold border-t border-slate-50"
              >
                Close Menu
              </button>
            </nav>
          </div>
        </>
      )}

      <main className={cn(
        "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 transition-all duration-300 flex-1",
        (isMobile && mobileMenuOpen) ? "opacity-0" : "opacity-100"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
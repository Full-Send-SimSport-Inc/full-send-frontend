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
  X
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
      ? "flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-semibold transition-colors w-full"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";

    const activeClass = "bg-primary/10 text-primary";
    const adminActiveClass = "bg-blue-50 text-blue-700";
    const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-muted";

    return (
      <>
        {!user && (
          <Link
            to="/"
            className={cn(linkClass, location.pathname === '/' ? activeClass : inactiveClass)}
          >
            <LayoutDashboard className={mobile ? "w-6 h-6" : "w-4 h-4"} />
            Portal Home
          </Link>
        )}

        <Link
          to="/meetings"
          className={cn(linkClass, location.pathname === '/meetings' ? activeClass : inactiveClass)}
        >
          <CalendarDays className={mobile ? "w-6 h-6" : "w-4 h-4"} />
          Meetings
        </Link>

        {user && (
          <Link
            to="/my-profile"
            className={cn(linkClass, location.pathname === '/my-profile' ? activeClass : inactiveClass)}
          >
            <User className={mobile ? "w-6 h-6" : "w-4 h-4"} />
            My Profile
          </Link>
        )}

        {isActuallyAdmin && (
          <>
            {!mobile && <div className="w-px h-6 bg-slate-200 mx-2" />}
            {mobile && <div className="h-px w-full bg-slate-100 my-2" />}

            <Link
              to="/admin"
              className={cn(linkClass, location.pathname === '/admin' ? adminActiveClass : inactiveClass)}
            >
              <LayoutDashboard className={mobile ? "w-6 h-6" : "w-4 h-4"} />
              Member Dashboard
            </Link>

            <Link
              to="/admin/members"
              className={cn(linkClass, location.pathname.startsWith('/admin/members') ? adminActiveClass : inactiveClass)}
            >
              <Users className={mobile ? "w-6 h-6" : "w-4 h-4"} />
              Member Management
            </Link>

            <Link
              to="/admin/email"
              className={cn(linkClass, location.pathname.startsWith('/admin/email') ? adminActiveClass : inactiveClass)}
            >
              <Mail className={mobile ? "w-6 h-6" : "w-4 h-4"} />
              Email
            </Link>

            <Link
              to="/admin/agm"
              className={cn(linkClass, location.pathname.startsWith('/admin/agm') ? adminActiveClass : inactiveClass)}
            >
              <ShieldCheck className={mobile ? "w-6 h-6" : "w-4 h-4"} />
              AGMs
            </Link>
          </>
        )}
      </>
    );
  };

  return (
    <div className="bg-slate-50 block">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 -ml-2 text-muted-foreground hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}

            <Link to="/" className="font-bold text-xl text-primary shrink-0 hover:opacity-80 transition-opacity">
              Member Portal
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <NavLinks />
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
                <span className="hidden xs:inline">Sign In / Join</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white lg:hidden overflow-y-auto">
          <nav className="flex flex-col p-4 gap-2">
            <NavLinks mobile={true} />
          </nav>
        </div>
      )}

      {/* REFINED HEIGHT:
        Subtracting 260px from the viewport height (100vh).
        This accounts for the header (64px), the footer, and the vertical padding (py-12).
      */}
      <main className={cn(
        "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 transition-opacity",
        "min-h-[calc(100vh-230px)]",
        mobileMenuOpen ? "opacity-20 pointer-events-none" : "opacity-100"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
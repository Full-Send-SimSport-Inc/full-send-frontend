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
      ? "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors w-full"
      : "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors";

    const activeClass = "bg-primary text-primary-foreground shadow-sm";
    const adminActiveClass = "bg-blue-600 text-white shadow-sm";
    const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-slate-100";

    return (
      <div className={cn("flex", mobile ? "flex-col gap-1" : "flex-row gap-1 items-center")}>
        {/* Core Portal Links */}
        {!user && (
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

        {/* Admin Section */}
        {isActuallyAdmin && (
          <>
            {!mobile && <div className="w-px h-6 bg-slate-200 mx-2" />}
            {mobile && (
              <div className="mt-4 mb-1 px-3">
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

        {/* WP Admin Link - Mobile Only */}
        {mobile && isWPAdmin && (
          <a
            href="/wp-admin"
            className={cn(linkClass, "text-amber-700 hover:bg-amber-50 mt-2")}
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
      {/* Header Sticky - Lower Z-index than the open menu */}
      <header className="bg-white border-b sticky top-0 z-[100] shadow-sm h-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}

            <Link to="/" className="font-bold text-lg sm:text-xl text-primary shrink-0">
              Member Portal
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:block ml-4">
              <NavLinks />
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isWPAdmin && (
              <a
                href="/wp-admin"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>WP Admin</span>
              </a>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-full transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Actions (Login only) */}
          {!user && isMobile && (
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-full"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Background overlay - stays below menu container but above main content */}
          <div
            className="fixed inset-0 bg-slate-900/40 z-[105] backdrop-blur-sm"
            style={{ top: '64px' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu container - High z-index to overlay header if needed */}
          <div
            className="fixed inset-x-0 top-16 z-[110] bg-white border-b shadow-2xl max-h-[calc(100vh-64px)] overflow-y-auto lg:hidden"
          >
            <nav className="p-4 flex flex-col">
              <NavLinks mobile={true} />

              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-4 mt-4 border-t border-slate-100 text-red-600 font-semibold w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              )}
            </nav>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 transition-all duration-300 flex-1",
        mobileMenuOpen ? "blur-sm pointer-events-none opacity-50" : "opacity-100"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
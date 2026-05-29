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
  Settings,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Corrected path with URL encoding for the space
const LOGO_URL = "https://fullsendsimsport.com.au/wp-content/uploads/Purple%20w_%20Black%20Tyres.png";

export default function MainLayout() {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    const logoutUrl = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
    window.location.href = logoutUrl;
  };

  const isActuallyAdmin = user?.isAdmin === true ||
    user?.roles?.some(role => ['administrator', 'executive_committee', 'committee', 'editor'].includes(role));

  const isWPAdmin = user?.roles?.includes('administrator');
  
  // Check if user should see the limited "WP Backend" link for posting access
  const isWPBackendUser = !isWPAdmin && user?.roles?.some(role => ['executive_committee', 'committee', 'editor', 'author', 'contributor'].includes(role));

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

    // Determine specific access restrictions for the editor role
    const isFullAdmin = user?.roles?.some(role => ['administrator', 'executive_committee', 'committee'].includes(role)) || (user?.isAdmin === true && !user?.roles?.includes('editor'));

    return (
      <div className={cn("flex", mobile ? "flex-col gap-0.5" : "flex-row gap-1 items-center")}>
        <a
          href="https://www.fullsendsimsport.com.au"
          className={cn(linkClass, inactiveClass)}
        >
          <Globe className={mobile ? "w-5 h-5" : "w-4 h-4"} />
          Back to Website
        </a>

        {(mobile || !user) && (
          <Link
            to="/"
            className={cn(linkClass, location.pathname === '/' ? activeClass : inactiveClass)}
          >
            <LayoutDashboard className={mobile ? "w-5 h-5" : "w-4 h-4"} />
            Member Portal Home
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

            {isFullAdmin && (
              <Link
                to="/admin"
                className={cn(linkClass, location.pathname === '/admin' ? adminActiveClass : inactiveClass)}
              >
                <LayoutDashboard className={mobile ? "w-5 h-5" : "w-4 h-4"} />
                Dashboard
              </Link>
            )}

            <Link
              to="/admin/members"
              className={cn(linkClass, location.pathname.startsWith('/admin/members') ? adminActiveClass : inactiveClass)}
            >
              <Users className={mobile ? "w-5 h-5" : "w-4 h-4"} />
              Members
            </Link>

            {isFullAdmin && (
              <>
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
          </>
        )}

        {mobile && isWPAdmin && (
          <a
            href="/wp-admin"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, "text-amber-700 hover:bg-amber-50 mt-1")}
          >
            <Settings className="w-5 h-5" />
            WordPress Admin
          </a>
        )}

        {mobile && isWPBackendUser && (
          <a
            href="/wp-admin"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, "text-blue-700 hover:bg-blue-50 mt-1")}
          >
            <Settings className="w-5 h-5" />
            WP Backend
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen relative flex flex-col">
      <header className={cn(
        "bg-white border-b shrink-0 transition-all duration-200",
        isMobile ? "fixed top-0 left-0 right-0 z-[9999] h-16" : "sticky top-0 z-10 shadow-sm h-[110px]",
        (isMobile && mobileMenuOpen) ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6 h-full">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            <div className={cn(
              "flex items-center h-full",
              isMobile ? "absolute left-1/2 -translate-x-1/2" : "py-4"
            )}>
              <img
                src={LOGO_URL}
                alt="Full Send SimSport Logo"
                className={cn(
                  "w-auto object-contain",
                  isMobile ? "h-10" : "h-[75px]"
                )}
              />
            </div>

            <nav className={cn(isMobile ? "hidden" : "block")}>
              <NavLinks />
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {isWPAdmin && (
              <a 
                href="/wp-admin" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>WP Admin</span>
              </a>
            )}
            {isWPBackendUser && (
              <a 
                href="/wp-admin" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>WP Backend</span>
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
            <nav className="p-5 flex flex-col pt-10">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="self-end p-2 mb-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              <NavLinks mobile={true} />

              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-4 border-t border-slate-100 text-red-600 font-semibold w-full text-left text-sm mt-6"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-3 px-3 py-4 border-t border-slate-100 text-primary font-bold w-full text-left text-sm mt-6"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In to Portal
                </Link>
              )}
            </nav>
          </div>
        </>
      )}

      <main className={cn(
        "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-10 transition-all duration-300 flex-1",
        (isMobile && mobileMenuOpen) ? "opacity-0" : "opacity-100"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
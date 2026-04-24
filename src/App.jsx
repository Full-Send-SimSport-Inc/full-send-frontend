import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Layouts
import MainLayout from '@/layouts/MainLayout';

// Pages
import Join from '@/pages/Join';
import Meetings from '@/pages/Meetings';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminMemberManager from '@/pages/AdminMemberManager';
import AdminAGM from '@/pages/AdminAGM';
import AGMDetail from '@/pages/AGMDetail';
import AdminEmail from '@/pages/AdminEmail';
import Login from '@/pages/Login';
import ProfileView from '@/pages/ProfileView';
import PageNotFound from '@/lib/PageNotFound';
import Portal from '@/pages/Portal';
import SetupAccount from '@/components/auth/SetupAccount';
import ConsentView from '@/pages/ConsentView';

// Defensive fix for Storefront theme script crashes
if (typeof window.storefrontUrls === 'undefined') {
    window.storefrontUrls = {
        "home": "/",
        "cart": "/cart",
        "checkout": "/checkout",
        "account": "/my-account"
    };
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  // 1. Removed hasAdminPrivileges, grabbed 'user' directly
  const { isAuthenticated, user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. We calculate admin status EXACTLY like AdminLayout did
  // This checks the new boolean, but falls back to the role check if the boolean is missing
  const isActuallyAdmin = user?.isAdmin === true

  return (
    <Routes>
        <Route element={<MainLayout />}>
        <Route path="/setup-account/:id/:email" element={<SetupAccount />} />
        <Route path="/consent/:id/:token" element={<ConsentView />} />

        {/* ROOT REDIRECTS */}
        <Route path="/" element={
        isAuthenticated ? (
            // If logged in, send admins to dashboard and members to profile
            isActuallyAdmin ? <Navigate to="/admin/members" replace /> : <Navigate to="/my-profile" replace />
        ) : (
            // If NOT logged in, show the Login/Register choice page
            <Portal />
        )
        } />

        {/* PUBLIC & MEMBER PAGES */}
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/my-profile" replace /> : <Login />} />
        <Route path="/join" element={<Join />} />
         <Route path="/my-profile" element={isAuthenticated ? <ProfileView /> : <Navigate to="/login" replace />} />


        {/* ADMIN NESTED ROUTES */}
        <Route
          path="/admin"
          element={isActuallyAdmin ? <Outlet /> : <Navigate to="/my-profile" replace />}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<AdminMemberManager />} />
          <Route path="members/:id" element={<ProfileView />} />
          <Route path="agm" element={<AdminAGM />} />
          <Route path="agm/:id" element={<AGMDetail />} />
          <Route path="email" element={<AdminEmail />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <HashRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-background">
            <AppRoutes />
          </div>
        </HashRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
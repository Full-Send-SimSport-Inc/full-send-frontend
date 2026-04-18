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
import AdminMembers from '@/pages/AdminMembers';
import MemberDetail from '@/pages/MemberDetail';
import AdminAGM from '@/pages/AdminAGM';
import AGMDetail from '@/pages/AGMDetail';
import AdminEmail from '@/pages/AdminEmail'; 
import AdminUsers from '@/pages/AdminUsers';
import MyProfile from '@/pages/MyProfile';
import Login from '@/pages/Login';
import PageNotFound from '@/lib/PageNotFound';

// Fix for HashRouter silent clicks in WordPress
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const { isAuthenticated, hasAdminPrivileges, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* PARENT ROUTE: Opened here */}
      <Route element={<MainLayout />}>
        
        {/* ROOT PATH */}
        <Route path="/" element={
          isAuthenticated ? (
            hasAdminPrivileges ? <Navigate to="/admin/members" replace /> : <Navigate to="/my-profile" replace />
          ) : (
            <Navigate to="/meetings" replace /> 
          )
        } />

        {/* PUBLIC & MEMBER ROUTES */}
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/my-profile" replace /> : <Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/my-profile" element={isAuthenticated ? <MyProfile /> : <Navigate to="/login" replace />} />

        {/* ADMIN NESTED ROUTES */}
        <Route 
          path="/admin" 
          element={hasAdminPrivileges ? <Outlet /> : <Navigate to="/my-profile" replace />}
        >

          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="agm" element={<AdminAGM />} />
          <Route path="agm/:id" element={<AGMDetail />} />
          <Route path="email" element={<AdminEmail />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<PageNotFound />} />

      </Route> 
      {/* PARENT ROUTE: Correctly closed above */}
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
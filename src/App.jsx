import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Layouts
import AdminLayout from '@/components/admin/AdminLayout';

// Pages
import Join from '@/pages/Join'; 
import Meetings from '@/pages/Meetings';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminMembers from '@/pages/AdminMembers';
import MemberDetail from '@/pages/MemberDetail';
import AdminAGM from '@/pages/AdminAGM';
import AdminEmail from '@/pages/AdminEmail'; 
import AdminUsers from '@/pages/AdminUsers';
import MyProfile from '@/pages/MyProfile';
import Login from '@/pages/Login';

// Auth Components
import SetupAccount from '@/components/auth/SetupAccount';

// Lib / Error Pages
import PageNotFound from '@/lib/PageNotFound';

function AppRoutes() {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  // 1. Wait for Auth to finish before rendering ANY routes
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine if user has admin/committee privileges
  const hasAdminPrivileges = user?.roles?.some(role => 
    ['administrator', 'committee'].includes(role)
  );

  return (
    <Routes>
      {/* PUBLIC & MEMBER ROUTES (Accessible to all logged-in members) */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/my-profile" /> : <Login />} />
      <Route path="/my-profile" element={isAuthenticated ? <MyProfile /> : <Navigate to="/login" />} />
      <Route path="/meetings" element={<Meetings />} />
      
      {/* SETUP ROUTES */}
      <Route path="/setup-account/:id/:email" element={<SetupAccount />} />
      <Route path="/setup-account/:memberId/:email" element={<SetupAccount />} />
      
      {/* ADMIN ROUTES (Strictly guarded by both Component and Logic) */}
      <Route 
        path="/admin" 
        element={hasAdminPrivileges ? <AdminLayout /> : <Navigate to="/my-profile" />}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="agm" element={<AdminAGM />} />
        <Route path="email" element={<AdminEmail />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* ROOT PATH LOGIC */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/my-profile" replace /> : <Join />
      } />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <HashRouter>
          <div className="min-h-screen bg-background">
            <AppRoutes />
          </div>
        </HashRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
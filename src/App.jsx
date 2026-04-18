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
import Portal from '@/pages/Portal'; // NEW PORTAL PAGE
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

  // 1. CRITICAL: While loading, stay on the spinner. 
  // Do NOT try to render routes yet.
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  const hasAdminPrivileges = user?.roles?.some(role => 
    ['administrator', 'committee'].includes(role)
  );

  console.log("DEBUG: AppRoutes Status - Authenticated:", isAuthenticated, "Admin:", hasAdminPrivileges);

  return (
    <Routes>
      {/* 1. ROOT PATH - The Traffic Controller */}
      <Route path="/" element={
        isAuthenticated ? (
          hasAdminPrivileges ? <Navigate to="/admin" replace /> : <Navigate to="/my-profile" replace />
        ) : (
          <Portal />
        )
      } />
      
      {/* 2. PUBLIC ROUTES */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/join" element={(isAuthenticated && user && !user.roles?.includes('administrator')) ? <Navigate to="/" replace /> : <Join />} />
      
      {/* 3. MEMBER ROUTES */}
      <Route 
        path="/my-profile" 
        element={isAuthenticated ? <MyProfile /> : <Navigate to="/login" replace />} 
      />
      <Route path="/meetings" element={<Meetings />} />
      
      {/* 4. ADMIN ROUTES */}
      <Route 
        path="/admin" 
        element={hasAdminPrivileges ? <AdminLayout /> : <Navigate to="/my-profile" replace />}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="agm" element={<AdminAGM />} />
        <Route path="email" element={<AdminEmail />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

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
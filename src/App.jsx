import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';

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

// Auth Components
import SetupAccount from '@/components/auth/SetupAccount';

// Lib / Error Pages
import PageNotFound from '@/lib/PageNotFound';

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <HashRouter>
          <div className="min-h-screen bg-background">
            {/* NO GLOBAL HEADER HERE - it's handled inside the pages/layouts */}
            <Routes>
              {/* Public & Member Routes */}
              <Route path="/" element={<Join />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/my-profile" element={<MyProfile />} />
              
              {/* Account Setup Routes (supporting multiple URL param namings just in case) */}
              <Route path="/setup-account/:id/:email" element={<SetupAccount />} />
              <Route path="/setup-account/:memberId/:email" element={<SetupAccount />} />
              
              {/* Admin Routes (Header is inside AdminLayout) */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="members" element={<AdminMembers />} />
                <Route path="members/:id" element={<MemberDetail />} />
                <Route path="agm" element={<AdminAGM />} />
                <Route path="email" element={<AdminEmail />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </div>
        </HashRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
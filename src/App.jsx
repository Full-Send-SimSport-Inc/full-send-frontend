import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Layouts
import AdminLayout from '@/components/admin/AdminLayout';

// Pages
import Join from '@/components/join/JoinForm';
import Meetings from '@/pages/Meetings';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminMembers from '@/pages/AdminMembers';
import MemberDetail from '@/pages/MemberDetail';
import AdminAGM from '@/pages/AdminAGM';
import AdminEmail from '@/pages/AdminEmail'; 
import AdminUsers from '@/pages/AdminUsers';
import MyProfile from '@/pages/MyProfile';

// Auth Components (New)
import SetupAccount from '@/components/auth/SetupAccount';

// Lib / Error Pages
import PageNotFound from '@/lib/PageNotFound';

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Join />} />
            <Route path="/meetings" element={<Meetings />} />
            
            {/* NEW: Account Setup Route */}
            <Route path="/setup-account/:memberId/:email" element={<SetupAccount />} />
			
			{/* Member Protected Route */}
			<Route path="/my-profile" element={<MyProfile />} />
            
            {/* Admin Routes grouped under the AdminLayout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="members/:id" element={<MemberDetail />} />
              <Route path="agm" element={<AdminAGM />} />
              <Route path="email" element={<AdminEmail />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </HashRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
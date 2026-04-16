import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Clock, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '../components/admin/StatsCard';
import MemberTable from '../components/admin/MemberTable';

export default function AdminDashboard() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.get('/members'),
  });

  const active = members.filter(m => m.status === 'active').length;
  const pending = members.filter(m => m.status === 'pending').length;
  const quorum = Math.ceil(active * 0.5); // 50% quorum by default

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Grab the 5 most recent signups
  const recentMembers = [...members].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of Full Send SimSports membership.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Members" value={members.length} icon={Users} />
        <StatsCard title="Active Members" value={active} icon={UserCheck} accent="bg-green-100 text-green-700" />
        <StatsCard title="Pending Approval" value={pending} icon={Clock} accent="bg-amber-100 text-amber-700" />
        <StatsCard title="AGM Quorum (50%)" value={quorum} icon={Scale} accent="bg-accent/10 text-accent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberTable members={recentMembers} />
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Clock, Scale, User, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import StatsCard from '../components/admin/StatsCard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: rawMembers = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.get('/members'),
  });

  // --- HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    const safeDateStr = String(dateString || '').replace(' ', 'T');
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatLocation = (m) => {
    const parts = [m?.region, m?.country, m?.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not Provided';
  };

  // --- FILTER LOGIC ---
  const members = rawMembers.filter(m => m.status !== 'awaiting_consent');
  const active = members.filter(m => m.status === 'active').length;
  const pending = members.filter(m => m.status === 'pending').length;
  const quorum = Math.ceil(active * 0.5);

  // --- RECENT APPLICATIONS LOGIC ---
  const recentMembers = members
    .filter(m => {
      if (m.status === 'pending') return true;
      if (m.status === 'active') {
        if (!m.created_date) return false;
        const createdDate = new Date(String(m.created_date).replace(' ', 'T'));
        const now = new Date();
        const diffInDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        return diffInDays <= 30;
      }
      return false;
    })
    .sort((a, b) => {
      const dateA = new Date(String(a.created_date || '').replace(' ', 'T'));
      const dateB = new Date(String(b.created_date || '').replace(' ', 'T'));
      return dateB - dateA;
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      {/* COMPACT HEADER */}
      <div className="px-1">
        <h1 className="text-base md:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">Full Send SimSport membership overview.</p>
      </div>

      {/* CLICKABLE MICRO STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <div
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/admin/members', { state: { fromDashboard: true } })}
        >
          <StatsCard title="Total Members" value={members.length} icon={Users} />
        </div>
        <div
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/admin/members', { state: { status: 'active', fromDashboard: true } })}
        >
          <StatsCard title="Active Members" value={active} icon={UserCheck} accent="bg-green-100 text-green-700" />
        </div>
        <div
          className="cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate('/admin/members', { state: { status: 'pending', fromDashboard: true } })}
        >
          <StatsCard title="Pending Approval" value={pending} icon={Clock} accent="bg-amber-100 text-amber-700" />
        </div>
        <div className="cursor-default">
          <StatsCard title="AGM Quorum" value={quorum} icon={Scale} accent="bg-accent/10 text-accent" />
        </div>
      </div>

      {/* RECENT APPLICATIONS */}
      <Card className="hidden md:block border-0 sm:border">
        <CardHeader className="px-4 py-3 md:px-6 md:py-6">
          <CardTitle className="text-sm md:text-lg">Recent Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="px-6 h-12">Applicant</TableHead>
                <TableHead className="px-4 h-12">Location</TableHead>
                <TableHead className="px-4 h-12">Application Date</TableHead>
                <TableHead className="px-4 h-12">Status</TableHead>
                <TableHead className="w-[50px] h-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMembers.map((member) => (
                <TableRow
                  key={member.id}
                  className="transition-colors hover:bg-slate-50/50 cursor-pointer group"
                  onClick={() => navigate(`/admin/members/${member.id}`)}
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm group-hover:text-primary transition-colors">
                          {member.first_name} {member.last_name}
                        </span>
                        <p className="text-xs text-muted-foreground leading-none mt-1">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {formatLocation(member)}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(member.created_date)}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                      member.status === 'active' && "text-green-700 bg-green-50 border-green-200",
                      member.status === 'pending' && "text-orange-700 bg-orange-50 border-orange-200"
                    )}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {recentMembers.length === 0 && (
            <div className="text-center text-muted-foreground py-12 px-4 text-sm">
              No applications from the last 30 days.
            </div>
          )}
        </CardContent>
      </Card>

      <p className="block md:hidden text-center text-[10px] text-muted-foreground pt-2 italic">
        Tap a card to view filtered members
      </p>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, User, Search, Download, Mail, Lock, UserX, Crown } from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ROLE_WEIGHTS = {
  'administrator': 40,
  'executive_committee': 30,
  'committee': 20,
  'fs_member': 10,
  'fs_junior_member': 10,
  'subscriber': 5
};

export default function AdminMemberManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Helpers
  const getWeight = (roles = []) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return Math.max(...roleArray.map(r => ROLE_WEIGHTS[r] || 0), 0);
  };

  const formatRole = (roleStr) => {
    if (!roleStr) return 'No Access';
    return roleStr
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getBestRole = (roles = []) => {
    if (roles.includes('administrator')) return 'administrator';
    if (roles.includes('executive_committee')) return 'executive_committee';
    if (roles.includes('committee')) return 'committee';
    return 'fs_member';
  };

  // Queries
  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.get('/me'),
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.get('/members'),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.get('/admin/users'),
  });

  const myWeight = useMemo(() => getWeight(me?.roles), [me]);
  const isSystemAdmin = me?.roles?.includes('administrator');

  const unifiedData = useMemo(() => {
    return members.map(member => {
      const linkedUser = users.find(u => u.email.toLowerCase() === member.email?.toLowerCase());
      const targetRoles = linkedUser?.roles || ['fs_member'];
      const targetWeight = getWeight(targetRoles);

      return {
        ...member,
        wpUser: linkedUser || null,
        currentRole: linkedUser ? getBestRole(linkedUser.roles) : 'fs_member',
        isDisabled: member.status === 'inactive',
        canEdit: isSystemAdmin || (myWeight > targetWeight)
      };
    }).filter(m => {
      const matchesSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, users, search, statusFilter, myWeight, isSystemAdmin]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.post(`/members/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Failed to update status.')
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => base44.post('/admin/users/role', { user_id: id, new_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated.');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update role.')
  });

  if (loadingMembers || loadingUsers || loadingMe) return (
    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Member Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage portal access levels and community status.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link to="/admin/email"><Mail className="w-4 h-4 mr-2" /> Email</Link></Button>
          <Button variant="outline" onClick={() => {/* export logic */}}><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-1/3 px-6 py-4">Member</TableHead>
                <TableHead className="w-1/6 px-4">Access Level</TableHead>
                <TableHead className="w-1/6 px-4">Account Status</TableHead>
                <TableHead className="w-1/4 px-6 text-right">Manage Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedData.map((member) => (
                <TableRow key={member.id} className={cn("hover:bg-slate-50/50 transition-colors", member.isDisabled && "bg-slate-50/80 opacity-90")}>
                  {/* Member Column */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        member.currentRole === 'administrator' || member.currentRole === 'executive_committee' ? "bg-amber-100 text-amber-600" :
                        member.currentRole === 'committee' ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                      )}>
                        {member.currentRole === 'administrator' ? <Crown className="w-5 h-5" /> :
                         member.currentRole === 'executive_committee' ? <ShieldCheck className="w-5 h-5" /> :
                         <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <Link to={`/admin/members/${member.id}`} className="font-bold text-sm hover:underline leading-tight truncate">
                          {member.first_name} {member.last_name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground truncate">{member.email}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Access Level Column */}
                  <TableCell className="px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {member.wpUser ? formatRole(member.currentRole) : 'No Portal Access'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Account Status Column */}
                  <TableCell className="px-4">
                    <Select
                      value={member.status}
                      onValueChange={(status) => updateStatus.mutate({ id: member.id, status })}
                      disabled={!member.canEdit}
                    >
                      <SelectTrigger className={cn("w-32 h-8 text-[11px] font-bold uppercase",
                        member.status === 'active' && "text-green-700 bg-green-50 border-green-200",
                        member.status === 'inactive' && "text-red-700 bg-red-50 border-red-200",
                        member.status === 'pending' && "text-orange-700 bg-orange-50 border-orange-200"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Manage Role Column */}
                  <TableCell className="px-6 text-right">
                    {member.wpUser ? (
                      <div className="flex justify-end">
                        <Select
                          value={member.currentRole}
                          onValueChange={(role) => updateRole.mutate({ id: member.wpUser.id, role })}
                          disabled={!member.canEdit || member.isDisabled}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs">
                            {!member.canEdit ? (
                              <span className="flex items-center text-muted-foreground"><Lock className="w-3 h-3 mr-2"/> Restricted</span>
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fs_member">Standard Member</SelectItem>
                            {myWeight > ROLE_WEIGHTS.committee && (
                              <SelectItem value="committee">Committee</SelectItem>
                            )}
                            {myWeight > ROLE_WEIGHTS.executive_committee && (
                              <SelectItem value="executive_committee">Executive Committee</SelectItem>
                            )}
                            {isSystemAdmin && (
                               <SelectItem value="administrator">System Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="inline-flex h-8 items-center px-3 rounded bg-slate-50 text-[10px] font-medium text-slate-400 border border-slate-100">
                        PENDING SYNC
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {unifiedData.length === 0 && (
            <div className="text-center py-20 text-muted-foreground border-t">
              <UserX className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No members match your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
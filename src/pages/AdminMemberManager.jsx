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

  // Local state to prevent the "snap-back" during slow WP DB writes
  const [localStatusOverrides, setLocalStatusOverrides] = useState({});

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

      // Prioritize local state over server data to stop the UI from jumping back
      const currentStatus = localStatusOverrides[member.id] || member.status;

      return {
        ...member,
        status: currentStatus,
        wpUser: linkedUser || null,
        currentRole: linkedUser ? getBestRole(linkedUser.roles) : 'fs_member',
        isDisabled: currentStatus === 'inactive',
        canEdit: isSystemAdmin || (myWeight > targetWeight)
      };
    }).filter(m => {
      const matchesSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, users, search, statusFilter, myWeight, isSystemAdmin, localStatusOverrides]);

  // Status Mutation
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.post(`/members/${id}`, { status }),
    onMutate: ({ id, status }) => {
      setLocalStatusOverrides(prev => ({ ...prev, [id]: status }));
    },
    onSuccess: (_, variables) => {
      toast.success(`Status updated to ${variables.status}.`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err, variables) => {
      toast.error('Failed to update status.');
      setLocalStatusOverrides(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    }
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => base44.post('/admin/users/role', { user_id: id, new_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Access role updated.');
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
          <p className="text-muted-foreground text-sm mt-1">Manage profiles, community statuses, and portal access levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="shrink-0"><Link to="/admin/email"><Mail className="w-4 h-4 mr-2" /> Send Email</Link></Button>
          <Button variant="outline" onClick={() => {}} className="shrink-0"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
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
            <SelectItem value="denied">Denied (Consent)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-[35%] px-6 h-12">Member</TableHead>
                <TableHead className="w-[20%] px-4 h-12">Access Level</TableHead>
                <TableHead className="w-[20%] px-4 h-12">Account Status</TableHead>
                <TableHead className="w-[25%] px-6 h-12 text-right">Manage Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedData.map((member) => (
                <TableRow key={member.id} className={cn("transition-colors", member.isDisabled && "bg-slate-50 opacity-75")}>
                  {/* Member Column */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        member.currentRole === 'administrator' || member.currentRole === 'executive_committee' ? "bg-amber-100" :
                        member.currentRole === 'committee' ? "bg-primary/10" : "bg-slate-100"
                      )}>
                        {member.isDisabled ? <UserX className="w-5 h-5 text-muted-foreground" />
                        : member.currentRole === 'administrator' ? <Crown className="w-5 h-5 text-amber-600" />
                        : member.currentRole === 'executive_committee' ? <ShieldCheck className="w-5 h-5 text-amber-600" />
                        : member.currentRole === 'committee' ? <ShieldCheck className="w-5 h-5 text-primary" />
                        : <User className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div className="flex flex-col">
                        <Link to={`/admin/members/${member.id}`} className="font-bold text-sm hover:underline hover:text-primary">
                          {member.first_name} {member.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground leading-none mt-1">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Access Level Column */}
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                      <span className="text-xs font-semibold">
                        {member.wpUser ? formatRole(member.currentRole) : 'No Portal Access'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Account Status Column */}
                  <TableCell className="px-4 py-4">
                    <Select
                      value={member.status}
                      onValueChange={(status) => updateStatus.mutate({ id: member.id, status })}
                      disabled={!member.canEdit || updateStatus.isPending}
                    >
                      <SelectTrigger className={cn("w-36 h-9 text-xs font-bold",
                        member.status === 'active' && "text-green-700 bg-green-50 border-green-200",
                        (member.status === 'inactive' || member.status === 'denied') && "text-red-700 bg-red-50 border-red-200",
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
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end">
                      {member.wpUser ? (
                        <Select
                          value={member.currentRole}
                          onValueChange={(role) => updateRole.mutate({ id: member.wpUser.id, role })}
                          disabled={!member.canEdit || member.isDisabled}
                        >
                          <SelectTrigger className="w-44 h-9 text-xs">
                            {!member.canEdit ? (
                              <span className="flex items-center text-muted-foreground"><Lock className="w-3 h-3 mr-2"/> Restricted</span>
                            ) : member.isDisabled ? (
                              <span className="flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span>
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
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic px-3">Sync Required</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {unifiedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    No members match your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
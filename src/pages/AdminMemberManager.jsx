import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, User, Search, Download, Mail, Lock, UserX, Crown } from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AdminMemberManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Helper to determine the "highest" role for display in the dropdown
  const getBestRole = (roles = []) => {
    if (roles.includes('administrator')) return 'administrator';
    if (roles.includes('executive_committee')) return 'executive_committee';
    if (roles.includes('committee')) return 'committee';
    return 'fs_member';
  };

  // Fetch Members & Users in parallel
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.get('/members'),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.get('/admin/users'),
  });

  // Merge the data based on email
  const unifiedData = useMemo(() => {
    return members.map(member => {
      const linkedUser = users.find(u => u.email.toLowerCase() === member.email?.toLowerCase());
      return {
        ...member,
        wpUser: linkedUser || null,
        currentRole: linkedUser ? getBestRole(linkedUser.roles) : 'fs_member',
        isDisabled: member.status === 'inactive'
      };
    }).filter(m => {
      const matchesSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, users, search, statusFilter]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.post(`/members/${id}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(variables.status === 'inactive' ? 'Account disabled & parked.' : `Status updated to ${variables.status}.`);
    },
    onError: () => toast.error('Failed to update status.')
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => base44.post('/admin/users/role', { user_id: id, new_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Access role updated.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update role.';
      toast.error(message);
    }
  });

  const exportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Status', 'Has Portal Access', 'Role'];
    const rows = unifiedData.map(m => [
      m.first_name, m.last_name, m.email, m.status, 
      m.wpUser ? 'Yes' : 'No', 
      m.currentRole
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "unified_members_export.csv";
    link.click();
  };

  if (loadingMembers || loadingUsers) return (
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
          <Button variant="outline" onClick={exportCSV} className="shrink-0"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
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
          <div className="divide-y">
            {unifiedData.map(member => (
              <div key={member.id} className={cn("flex flex-col lg:flex-row lg:items-center justify-between px-6 py-4 gap-4 transition-colors", member.isDisabled && "bg-slate-50 opacity-75")}>
                
                {/* User Info */}
                <div className="flex items-center gap-3 w-full lg:w-1/3">
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
                  <div>
                    <Link to={`/admin/members/${member.id}`} className="font-bold text-sm hover:underline hover:text-primary">
                      {member.first_name} {member.last_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col text-xs text-muted-foreground mr-4">
                    <span className="font-semibold text-slate-700">Account</span>
                    <span>{member.wpUser ? 'Registered' : 'No Login'}</span>
                  </div>

                  {/* Profile Status Dropdown */}
                  <Select 
                    value={member.status} 
                    onValueChange={(status) => updateStatus.mutate({ id: member.id, status })}
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

                  {/* WP Role Dropdown - Hierarchy aware */}
                  {member.wpUser && !member.wpUser.roles.includes('administrator') && (
                     <Select
                     value={member.currentRole}
                     onValueChange={(role) => updateRole.mutate({ id: member.wpUser.id, role })}
                     disabled={member.isDisabled}
                   >
                     <SelectTrigger className="w-40 h-9 text-xs">
                       {member.isDisabled ? <span className="flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span> : <SelectValue />}
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="fs_member">Standard Member</SelectItem>
                       <SelectItem value="committee">Committee</SelectItem>
                       <SelectItem value="executive_committee">Executive Committee</SelectItem>
                     </SelectContent>
                   </Select>
                  )}
                  {member.wpUser?.roles.includes('administrator') && (
                     <div className="w-40 h-9 flex items-center px-3 text-xs font-bold text-amber-700 bg-amber-50 rounded-md border border-amber-200">System Admin</div>
                  )}
                </div>
              </div>
            ))}
            {unifiedData.length === 0 && <p className="text-center text-muted-foreground py-12">No members match your criteria.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
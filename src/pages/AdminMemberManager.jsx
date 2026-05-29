import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, User, Search, Download, Mail, Lock, UserX, Crown, Calendar, ArrowLeft, FileText, PenTool } from 'lucide-react';
import { toast } from "sonner";
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ROLE_WEIGHTS = {
  'administrator': 40,
  'executive_committee': 30,
  'committee': 20,
  'editor': 15,
  'author': 13,
  'contributor': 11,
  'fs_member': 10,
  'fs_junior_member': 10,
  'subscriber': 5
};

export default function AdminMemberManager() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Detect if we arrived here via a Dashboard click
  const isFromDashboard = !!location.state?.fromDashboard;

  // Local state to prevent the "snap-back" during slow WP DB writes
  const [localStatusOverrides, setLocalStatusOverrides] = useState({});

  // CATCH FILTER FROM DASHBOARD
  useEffect(() => {
    if (location.state?.status) {
      setStatusFilter(location.state.status);
    }
  }, [location.state]);

  // Helpers
  const getWeight = (roles = []) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return Math.max(...roleArray.map(r => ROLE_WEIGHTS[r] || 0), 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Handle potential space in SQL dates
    const safeDateStr = String(dateString || '').replace(' ', 'T');
    const date = new Date(safeDateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRole = (roleStr) => {
    if (!roleStr) return 'No Access';
    if (roleStr === 'fs_member') return 'Adult Member';
    if (roleStr === 'fs_junior_member') return 'Junior Member';
    if (roleStr === 'editor') return 'Editor';
    if (roleStr === 'author') return 'Author';
    if (roleStr === 'contributor') return 'Contributor';

    return roleStr
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getBestRole = (roles = []) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    if (roleArray.includes('administrator')) return 'administrator';
    if (roleArray.includes('executive_committee')) return 'executive_committee';
    if (roleArray.includes('committee')) return 'committee';
    if (roleArray.includes('editor')) return 'editor';
    if (roleArray.includes('author')) return 'author';
    if (roleArray.includes('contributor')) return 'contributor';
    if (roleArray.includes('fs_junior_member')) return 'fs_junior_member';
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
    return members
      .filter(member => (localStatusOverrides[member.id] || member.status) !== 'awaiting_consent')
      .map(member => {
        const linkedUser = users.find(u => u.email.toLowerCase() === member.email?.toLowerCase());

        const currentRole = linkedUser
          ? getBestRole(linkedUser.roles)
          : (member.member_type === 'junior' ? 'fs_junior_member' : 'fs_member');

        const targetWeight = ROLE_WEIGHTS[currentRole] || 0;
        const currentStatus = localStatusOverrides[member.id] || member.status;

        return {
          ...member,
          status: currentStatus,
          wpUser: linkedUser || null,
          currentRole: currentRole,
          isDisabled: currentStatus === 'inactive',
          canEdit: isSystemAdmin || (myWeight > targetWeight)
        };
      }).filter(m => {
        const matchesSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const matchesType = typeFilter === 'all' || m.currentRole === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      });
  }, [members, users, search, statusFilter, typeFilter, myWeight, isSystemAdmin, localStatusOverrides]);

  // Mutations
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
    <div className="space-y-4 md:space-y-6">
      {/* Back Button - Visible only if navigating from dashboard */}
      {isFromDashboard && (
        <div className="block">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground h-8">
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">Member Directory</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Manage profiles, statuses, and portal access.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-none text-xs h-9"><Link to="/admin/email"><Mail className="w-3.5 h-3.5 mr-2" /> Email</Link></Button>
          <Button variant="outline" onClick={() => {}} className="flex-1 sm:flex-none text-xs h-9"><Download className="w-3.5 h-3.5 mr-2" /> Export</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 md:w-48 h-10 text-xs"><SelectValue placeholder="Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="fs_member">Adult Members</SelectItem>
              <SelectItem value="fs_junior_member">Junior Members</SelectItem>
              <SelectItem value="contributor">Contributors</SelectItem>
              <SelectItem value="author">Authors</SelectItem>
              <SelectItem value="editor">Editors</SelectItem>
              <SelectItem value="committee">Committee</SelectItem>
              <SelectItem value="executive_committee">Executive Committee</SelectItem>
              <SelectItem value="administrator">Administrators</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 md:w-40 h-10 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="denied">Denied (Consent)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 sm:border">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[30%] px-6 h-12">Member Name</TableHead>
                  <TableHead className="w-[15%] px-4 h-12">Joined</TableHead>
                  <TableHead className="w-[15%] px-4 h-12">Type</TableHead>
                  <TableHead className="w-[15%] px-4 h-12">Status</TableHead>
                  <TableHead className="w-[25%] px-6 h-12 text-right">Manage Access Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unifiedData.map((member) => (
                  <TableRow key={member.id} className={cn("transition-colors", member.isDisabled && "bg-slate-50 opacity-75")}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          member.currentRole === 'administrator' || member.currentRole === 'executive_committee' ? "bg-amber-100" :
                          member.currentRole === 'committee' ? "bg-primary/10" : 
                          member.currentRole === 'editor' ? "bg-blue-50" : 
                          member.currentRole === 'author' || member.currentRole === 'contributor' ? "bg-purple-50" : "bg-slate-100"
                        )}>
                          {member.isDisabled ? <UserX className="w-5 h-5 text-muted-foreground" />
                          : member.currentRole === 'administrator' ? <Crown className="w-5 h-5 text-amber-600" />
                          : member.currentRole === 'executive_committee' ? <ShieldCheck className="w-5 h-5 text-amber-600" />
                          : member.currentRole === 'committee' ? <ShieldCheck className="w-5 h-5 text-primary" />
                          : member.currentRole === 'editor' ? <FileText className="w-5 h-5 text-blue-600" />
                          : member.currentRole === 'author' || member.currentRole === 'contributor' ? <PenTool className="w-5 h-5 text-purple-600" />
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
                    <TableCell className="px-4 py-4">
                      <span className="text-xs font-medium text-slate-600">
                        {member.wpUser?.registered ? formatDate(member.wpUser.registered) : <span className="text-slate-300 italic">Not Linked</span>}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-xs font-semibold">
                        {member.wpUser ? formatRole(member.currentRole) : 'No Portal Access'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Select
                        value={member.status}
                        onValueChange={(status) => updateStatus.mutate({ id: member.id, status })}
                        disabled={!member.canEdit || updateStatus.isPending}
                      >
                        <SelectTrigger className={cn("w-32 h-8 text-[11px] font-bold",
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
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        {member.wpUser ? (
                          <Select
                            value={member.currentRole}
                            onValueChange={(role) => updateRole.mutate({ id: member.wpUser.id, role })}
                            disabled={!member.canEdit || member.isDisabled}
                          >
                            <SelectTrigger className="w-40 h-8 text-[11px]">
                              {!member.canEdit ? (
                                <span className="flex items-center text-muted-foreground"><Lock className="w-3 h-3 mr-2"/> Restricted</span>
                              ) : member.isDisabled ? (
                                <span className="flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fs_member">Adult Member</SelectItem>
                              <SelectItem value="fs_junior_member">Junior Member</SelectItem>
                              {myWeight >= ROLE_WEIGHTS.editor && (
                                <SelectItem value="contributor">Contributor</SelectItem>
                              )}
                              {myWeight >= ROLE_WEIGHTS.editor && (
                                <SelectItem value="author">Author</SelectItem>
                              )}
                              {myWeight >= ROLE_WEIGHTS.editor && (
                                <SelectItem value="editor">Editor</SelectItem>
                              )}
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
                          <span className="text-[10px] text-muted-foreground italic px-3">Sync Required</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet Card List View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {unifiedData.map((member) => (
              <div key={member.id} className={cn("p-4 flex flex-col gap-3", member.isDisabled && "bg-slate-50/50")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      member.currentRole === 'administrator' || member.currentRole === 'executive_committee' ? "bg-amber-100" : 
                      member.currentRole === 'editor' ? "bg-blue-50" : 
                      member.currentRole === 'author' || member.currentRole === 'contributor' ? "bg-purple-50" : "bg-slate-100"
                    )}>
                      {member.isDisabled ? <UserX className="w-4 h-4 text-muted-foreground" /> 
                      : member.currentRole === 'editor' ? <FileText className="w-4 h-4 text-blue-600" />
                      : member.currentRole === 'author' || member.currentRole === 'contributor' ? <PenTool className="w-4 h-4 text-purple-600" />
                      : <User className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <Link to={`/admin/members/${member.id}`} className="font-bold text-sm truncate hover:text-primary">
                        {member.first_name} {member.last_name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                     <span className="text-[10px] font-medium text-slate-500">
                       {isFromDashboard ? 'Applied' : 'Joined'}
                     </span>
                     <span className="text-[10px] font-bold">
                       {isFromDashboard
                         ? formatDate(member.created_date)
                         : (member.wpUser?.registered ? formatDate(member.wpUser.registered) : 'N/A')
                       }
                     </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Status</p>
                    <Select
                      value={member.status}
                      onValueChange={(status) => updateStatus.mutate({ id: member.id, status })}
                      disabled={!member.canEdit || updateStatus.isPending}
                    >
                      <SelectTrigger className={cn("w-full h-8 text-[10px] font-bold",
                        member.status === 'active' && "text-green-700 bg-green-50",
                        member.status === 'pending' && "text-orange-700 bg-orange-50",
                        (member.status === 'inactive' || member.status === 'denied') && "text-red-700 bg-red-50"
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
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Portal Role</p>
                    {member.wpUser ? (
                      <Select
                        value={member.currentRole}
                        onValueChange={(role) => updateRole.mutate({ id: member.wpUser.id, role })}
                        disabled={!member.canEdit || member.isDisabled}
                      >
                        <SelectTrigger className="w-full h-8 text-[10px]">
                          {!member.canEdit ? (
                            <span className="flex items-center text-muted-foreground"><Lock className="w-3 h-3 mr-1.5"/> Restricted</span>
                          ) : member.isDisabled ? (
                            <span className="flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fs_member">Adult</SelectItem>
                          <SelectItem value="fs_junior_member">Junior</SelectItem>
                          {myWeight >= ROLE_WEIGHTS.editor && (
                            <SelectItem value="contributor">Contributor</SelectItem>
                          )}
                          {myWeight >= ROLE_WEIGHTS.editor && (
                            <SelectItem value="author">Author</SelectItem>
                          )}
                          {myWeight >= ROLE_WEIGHTS.editor && (
                            <SelectItem value="editor">Editor</SelectItem>
                          )}
                          {myWeight > ROLE_WEIGHTS.committee && (
                            <SelectItem value="committee">Committee</SelectItem>
                          )}
                          {myWeight > ROLE_WEIGHTS.executive_committee && (
                            <SelectItem value="executive_committee">Exec</SelectItem>
                          )}
                          {isSystemAdmin && (
                            <SelectItem value="administrator">Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-8 flex items-center bg-slate-50 rounded border px-2 text-[10px] italic text-muted-foreground">No Access</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {unifiedData.length === 0 && (
            <div className="text-center text-muted-foreground py-12 px-4 text-sm">
              No members match your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
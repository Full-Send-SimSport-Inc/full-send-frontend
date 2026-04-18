import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function AdminUsers() {
  const queryClient = useQueryClient();

  // Fetch all users from our new custom WP endpoint
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.get('/admin/users'),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => base44.post('/admin/users/role', { user_id: id, new_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully.');
    },
    onError: () => toast.error('Failed to update role.')
  });

  const deleteUser = useMutation({
    mutationFn: (id) => base44.post('/admin/users/delete', { user_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted.');
    },
    onError: () => toast.error('Failed to delete user.')
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">User Accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage account roles and access levels.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {user.roles.includes('committee') || user.roles.includes('administrator')
                      ? <ShieldCheck className="w-4 h-4 text-primary" />
                      : <User className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden md:block w-24">
                    {user.registered ? format(new Date(user.registered), 'dd MMM yyyy') : '—'}
                  </span>
                  
                  {/* Prevent admins from accidentally demoting other top-level administrators */}
                  {!user.roles.includes('administrator') ? (
                    <Select
                      value={user.roles.includes('committee') ? 'committee' : 'fs_member'}
                      onValueChange={(role) => updateRole.mutate({ id: user.id, role })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fs_member">Member</SelectItem>
                        <SelectItem value="committee">Committee</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-32 h-8 flex items-center px-3 text-xs font-semibold text-primary bg-primary/5 rounded-md border border-primary/10">
                      Administrator
                    </div>
                  )}

                  {!user.roles.includes('administrator') && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {user.display_name}'s account and all associated data from WordPress. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser.mutate(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
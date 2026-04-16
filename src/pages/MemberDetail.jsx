import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Gamepad2, Shield, UserCircle, CheckCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MemberDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  
  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => base44.get(`/members/${id}`),
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus) => {
      return await base44.post(`/members/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      alert("Member Approved Successfully!");
      queryClient.invalidateQueries(['member', id]);
    },
    onError: (err) => {
      alert(`Update failed: ${err.response?.data?.message || "Error"}`);
    }
  });

  if (isLoading) return <div className="p-20 text-center font-medium">Loading Member Profile...</div>;

  if (error || !member) return (
    <div className="p-20 text-center space-y-4">
      <Shield className="w-12 h-12 text-destructive mx-auto" />
      <h2 className="text-xl font-bold text-destructive">Member Not Found</h2>
      <Button asChild variant="outline"><Link to="/admin/members">Return to List</Link></Button>
    </div>
  );

  const platforms = Array.isArray(member?.sim_platforms) ? member.sim_platforms : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" asChild>
          <Link to="/admin/members"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>

        {member?.status === 'pending' && (
          <Button 
            onClick={() => updateStatus.mutate('active')}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={updateStatus.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" /> 
            {updateStatus.isPending ? 'Processing...' : 'Approve Member'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">{member?.first_name} {member?.last_name}</CardTitle>
            <Badge className={cn(
              "capitalize",
              member?.status === 'active' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            )}>
              {member?.status || 'pending'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div><strong>Email:</strong> {member?.email}</div>
               <div><strong>Phone:</strong> {member?.phone}</div>
               <div><strong>Type:</strong> <span className="capitalize">{member?.member_type}</span></div>
               <div><strong>Discord:</strong> {member?.discord_username}</div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-bold text-sm uppercase text-muted-foreground mb-2">Location</h4>
              <p className="text-sm">
                {member?.street_address}<br />
                {member?.city}, {member?.state} {member?.postcode}
              </p>
            </div>

            {/* SECTION: IF VIEWING A JUNIOR (SHOW PARENT) */}
            {member?.member_type === 'junior' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-sm text-blue-800 uppercase mb-2">Guardian Info</h4>
                {member?.parent_id ? (
                  <div className="text-sm">
                    <p><strong>Linked Account:</strong> <Link to={`/admin/members/${member.parent_id}`} className="text-blue-700 hover:underline font-semibold">{member.parent_name} ↗</Link></p>
                    <p><strong>Email:</strong> {member.parent_email}</p>
                  </div>
                ) : (
                  <div className="text-sm text-amber-600">Unlinked Record: {member.parent_name} ({member.parent_email})</div>
                )}
              </div>
            )}

            {/* SECTION: IF VIEWING A PARENT (SHOW CHILDREN) - TWO WAY LINK */}
            {member?.children && member.children.length > 0 && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h4 className="font-bold text-sm text-purple-800 uppercase mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Linked Junior Members
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {member.children.map(child => (
                    <div key={child.id} className="flex justify-between items-center bg-white p-2 rounded border border-purple-200 shadow-sm">
                      <Link to={`/admin/members/${child.id}`} className="text-sm font-medium text-purple-700 hover:underline">
                        {child.name} ↗
                      </Link>
                      <Badge variant="outline" className="text-[10px] uppercase">{child.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Platforms</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {platforms.length > 0 ? (
              platforms.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)
            ) : (
              <span className="text-sm text-muted-foreground">No platforms listed</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 p-6 bg-slate-900 text-green-400 rounded-lg overflow-hidden border border-slate-700">
        <h3 className="text-white font-mono mb-4 border-b border-slate-700 pb-2">Database Raw Data (Relational Debug)</h3>
        <pre className="text-xs overflow-auto max-h-96 font-mono leading-relaxed">
          {JSON.stringify(member, null, 2)}
        </pre>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, UserCircle, CheckCircle2, AlertCircle, Lock, 
  ArrowLeft, Shield, Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

export default function ProfileView() {
  const { id } = useParams(); // If present, it's an admin viewing a specific member
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, checkLoginStatus, isLoadingAuth } = useAuth();
  
  // Determine if this is an Admin editing someone else, or a User editing themselves
  const isEditingSelf = !id; 
  const isAdmin = user?.roles?.some(r => ['administrator', 'committee'].includes(r));
  const isEditableAdmin = isAdmin && !isEditingSelf;

  const [form, setForm] = useState({
    first_name: '', last_name: '', dob: '', status: '',
    email: '', phone: '', street_address: '', city: '', state: '', postcode: '', 
    discord_username: '', sim_platforms: []
  });

  const [saveStatus, setSaveStatus] = useState('idle');

  // Fetch Member Data (Only if viewing someone else)
  const { data: fetchedMember, isLoading: isFetching, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => base44.get(`/members/${id}`),
    enabled: !!id, // Only run if ID is in URL
  });

  // Decide which data source to use
  const profileData = isEditingSelf ? user?.member_details : fetchedMember;
  const isLoading = isLoadingAuth || (!!id && isFetching);

  // Populate form when data arrives
  useEffect(() => {
    if (profileData) {
      setForm({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        dob: profileData.dob || '',
        status: profileData.status || 'pending',
        email: profileData.email || user?.email || '', 
        phone: profileData.phone || '',
        street_address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '', 
        postcode: profileData.postcode || '',
        discord_username: profileData.discord_username || '',
        sim_platforms: Array.isArray(profileData.sim_platforms) ? profileData.sim_platforms : []
      });
    }
  }, [profileData, user]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      if (isEditingSelf) {
        await base44.post('/update-me', form);
        await checkLoginStatus(); 
      } else {
        await base44.post(`/members/${id}`, form);
        queryClient.invalidateQueries(['member', id]);
      }
      toast.success('Profile updated successfully!');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile.');
      setSaveStatus('error');
    }
  };

  // Quick Approve Button for Admins
  const handleApprove = async () => {
    if (!isAdmin || !id) return;
    try {
      await base44.post(`/members/${id}`, { status: 'active' });
      queryClient.invalidateQueries(['member', id]);
      toast.success('Member Approved');
    } catch (err) {
      toast.error('Failed to approve member');
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error || !profileData) return (
    <div className="p-20 text-center space-y-4">
      <Shield className="w-12 h-12 text-destructive mx-auto" />
      <h2 className="text-xl font-bold text-destructive">Member Not Found</h2>
      <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isEditingSelf && (
            <Button variant="ghost" onClick={() => navigate('/admin/members')} className="pl-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          <h2 className="text-2xl font-bold tracking-tight">{isEditingSelf ? 'My Profile' : 'Edit Member'}</h2>
        </div>

        {isEditableAdmin && profileData.status === 'pending' && (
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Member
          </Button>
        )}
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto space-y-6">
        {/* Profile Header Summary */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <UserCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profileData.first_name} {profileData.last_name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="capitalize">{profileData.member_type || 'Member'}</span>
              <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                  profileData.status === 'active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              )}>
                  {profileData.status || 'pending'}
              </span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Core Identity Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed relative">
                {!isEditableAdmin && (
                  <div className="absolute top-2 right-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input 
                    value={form.first_name} 
                    onChange={e => handleChange('first_name', e.target.value)} 
                    disabled={!isEditableAdmin} 
                    className={!isEditableAdmin ? "bg-muted" : ""} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input 
                    value={form.last_name} 
                    onChange={e => handleChange('last_name', e.target.value)} 
                    disabled={!isEditableAdmin} 
                    className={!isEditableAdmin ? "bg-muted" : ""} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input 
                    type="date"
                    value={form.dob} 
                    onChange={e => handleChange('dob', e.target.value)} 
                    disabled={!isEditableAdmin} 
                    className={!isEditableAdmin ? "bg-muted" : ""} 
                  />
                </div>

                {isEditableAdmin && (
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={form.status} onValueChange={val => handleChange('status', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Relational Data (Parents / Children) */}
                {profileData.member_type === 'junior' && profileData.parent_id && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-slate-200">
                    <Label className="text-xs uppercase text-muted-foreground">Linked Guardian</Label>
                    <div className="flex gap-2 text-sm mt-1">
                       <span className="font-semibold">{profileData.parent_name}</span> 
                       <span className="text-muted-foreground">({profileData.parent_email})</span>
                       {isAdmin && <Link to={`/admin/members/${profileData.parent_id}`} className="text-blue-600 hover:underline ml-auto">View ↗</Link>}
                    </div>
                  </div>
                )}

                {profileData.children?.length > 0 && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-slate-200">
                    <Label className="text-xs uppercase text-muted-foreground flex items-center"><Users className="w-3 h-3 mr-1"/> Linked Juniors</Label>
                    <div className="space-y-1 mt-2">
                      {profileData.children.map(c => (
                        <div key={c.id} className="flex justify-between text-sm bg-white p-2 border rounded">
                          <span>{c.name}</span>
                          {isAdmin ? <Link to={`/admin/members/${c.id}`} className="text-blue-600 hover:underline">View ↗</Link> : <span className="uppercase text-[10px] text-muted-foreground">{c.status}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Info (Open to User & Admin) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Discord Username</Label>
                    <Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-primary">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Street Address</Label>
                    <Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>City / Suburb</Label>
                    <Input value={form.city} onChange={e => handleChange('city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input placeholder="e.g. NSW" value={form.state} onChange={e => handleChange('state', e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-2">
                    <Label>Postcode</Label>
                    <Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sim Platforms */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-primary">Sim Platforms</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SIM_PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox 
                        checked={form.sim_platforms.includes(p)}
                        onCheckedChange={checked => handleChange('sim_platforms', checked 
                          ? [...form.sim_platforms, p] 
                          : form.sim_platforms.filter(x => x !== p)
                        )} 
                      />
                      <span className="text-sm group-hover:text-primary transition-colors">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={saveStatus === 'saving'} className="w-full h-12 text-lg">
                {saveStatus === 'saving' ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving Changes...</> : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Debug block (Admins Only) */}
        {isEditableAdmin && (
          <div className="mt-8 p-4 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
             <h3 className="text-green-400 font-mono text-xs mb-2">RAW DB OUTPUT</h3>
             <pre className="text-green-400 text-[10px] overflow-auto max-h-40">{JSON.stringify(profileData, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
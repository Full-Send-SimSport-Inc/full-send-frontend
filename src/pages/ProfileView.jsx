import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, UserCircle, CheckCircle2, Lock, 
  ArrowLeft, Shield, Users, Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

// Helper to convert DD/MM/YYYY or other strings to YYYY-MM-DD for the HTML5 input
const formatToInputDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
};

export default function ProfileView() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, checkLoginStatus, isLoadingAuth } = useAuth();
  
  const isAdmin = user?.roles?.some(r => ['administrator', 'committee'].includes(r));
  const isEditingSelf = !id; 
  const hasFullPermissions = isAdmin; 

  const [form, setForm] = useState({
    first_name: '', last_name: '', dob: '', status: '',
    email: '', phone: '', street_address: '', city: '', state: '', postcode: '', 
    discord_username: '', sim_platforms: []
  });

  const [saveStatus, setSaveStatus] = useState('idle');

  const { data: fetchedMember, isLoading: isFetching, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => base44.get(`/members/${id}`),
    enabled: !!id,
  });

  const profileData = isEditingSelf ? user?.member_details : fetchedMember;
  const isLoading = isLoadingAuth || (!!id && isFetching);

  useEffect(() => {
    if (profileData) {
      setForm({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        // Use a fallback to check for common alternative naming conventions
        dob: formatToInputDate(profileData.dob || profileData.date_of_birth), 
        status: profileData.status || 'active',
        email: profileData.email || user?.email || '', 
        phone: profileData.phone || '',
        street_address: profileData.street_address || '',
        city: profileData.city || '',
        state: profileData.state || '', 
        postcode: profileData.postcode || '',
        discord_username: profileData.discord_username || '',
        sim_platforms: Array.isArray(profileData.sim_platforms) ? profileData.sim_platforms : []
      });
    } else if (isEditingSelf && user) {
        setForm(prev => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            status: 'active'
        }));
    }
  }, [profileData, user, isEditingSelf]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      if (isEditingSelf) {
        if (!profileData && isAdmin) {
          // If the backend still uses the "stitched" date logic for /join,
          // we need to explode the YYYY-MM-DD back into parts for the initial creation
          const [y, m, d] = form.dob ? form.dob.split('-') : ['', '', ''];
          
          await base44.post('/join', { 
            ...form, 
            member_type: 'adult',
            dob_day: d,
            dob_month: m,
            dob_year: y
          });
        } else {
          // Standard update
          await base44.post('/update-me', form);
        }
        await checkLoginStatus(); 
      } else {
        // Admin editing someone else
        await base44.post(`/members/${id}`, form);
        queryClient.invalidateQueries(['member', id]);
      }
      toast.success('Profile updated successfully!');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
      setSaveStatus('error');
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!profileData && !isEditingSelf) return (
    <div className="p-20 text-center space-y-4">
      <Shield className="w-12 h-12 text-destructive mx-auto" />
      <h2 className="text-xl font-bold text-destructive">Member Not Found</h2>
      <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isEditingSelf && (
            <Button variant="ghost" onClick={() => navigate('/admin/members')} className="pl-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          <h2 className="text-2xl font-bold tracking-tight">{isEditingSelf ? 'My Profile' : 'Edit Member'}</h2>
        </div>
      </div>

      <main className="max-w-3xl w-full mx-auto space-y-6">
        {isEditingSelf && isAdmin && !user?.member_details && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3 text-blue-800 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <div>
                    <p className="font-bold">Administrator Account</p>
                    <p>No member profile record found. Saving this form will initialize your record.</p>
                </div>
            </div>
        )}

        {/* Profile Card Summary */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <UserCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{form.first_name} {form.last_name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="capitalize">{isAdmin ? 'Administrator' : (profileData?.member_type || 'Member')}</span>
              <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                  form.status === 'active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              )}>
                  {form.status || 'pending'}
              </span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Member Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed relative">
                {!hasFullPermissions && (
                  <div className="absolute top-2 right-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </div>
                )}
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} disabled={!hasFullPermissions} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} disabled={!hasFullPermissions} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} disabled={!hasFullPermissions} />
                </div>
                {hasFullPermissions && (
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={form.status} onValueChange={val => handleChange('status', val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2"><Label>Email</Label><Input value={form.email} disabled /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
              </div>

              <Button type="submit" disabled={saveStatus === 'saving'} className="w-full">
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* RESTORED DEBUG BLOCKS */}
        {isAdmin && (
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
               <h3 className="text-green-400 font-mono text-xs mb-2 uppercase tracking-widest flex justify-between">
                <span>Debug: Raw DB Record</span>
                <span className="text-[10px] opacity-50">Source: {isEditingSelf ? 'AuthContext' : 'API Endpoint'}</span>
               </h3>
               <pre className="text-green-400 text-[10px] overflow-auto max-h-60 p-2 bg-black/30 rounded">
                  {JSON.stringify(profileData || "No record found in members table", null, 2)}
               </pre>
            </div>

            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
               <h3 className="text-blue-400 font-mono text-xs mb-2 uppercase tracking-widest">Debug: UI Form State</h3>
               <pre className="text-blue-400 text-[10px] overflow-auto max-h-60 p-2 bg-black/30 rounded">
                  {JSON.stringify(form, null, 2)}
               </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
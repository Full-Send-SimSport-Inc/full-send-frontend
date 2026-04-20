import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Loader2, UserCircle, Lock, ArrowLeft, Shield, Info, AlertTriangle, MessageSquare, Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const COMM_PREFS = ["Discord", "Twitter/X", "Instagram", "Facebook", "Bluesky", "Linkedin", "Email"];

const SIM_ENVIRONMENTS = [
  "Console with controller/gamepad",
  "Console with wheel and pedals",
  "PC with controller/gamepad",
  "PC with wheel and pedals"
];

const RACING_INTERESTS = [
  "Road Racing (Open Wheelers/Formula Style)",
  "Road Racing (Sports Cars/Hypercars)",
  "Oval Racing (Open Wheelers/Formula Style)",
  "Oval Racing (Sports Cars/Hypercars)",
  "Dirt Road Racing",
  "Dirt Oval Racing",
  "Team Endurance Racing",
  "Solo Endurance Racing",
  "Solo Sprint Racing"
];

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
    discord_username: '', 
    comm_prefs: [],
    sim_environment: '',
    racing_interests: [],
    sim_platforms: [],
    sim_platforms_other: '', 
    parent_name: '', parent_email: '',
    region: '', country: '', member_type: '' 
  });

  const [saveStatus, setSaveStatus] = useState('idle');

  const { data: fetchedMember, isLoading: isFetching } = useQuery({
    queryKey: ['member', id],
    queryFn: () => base44.get(`/members/${id}`),
    enabled: !!id,
  });

  const profileData = isEditingSelf ? user?.member_details : fetchedMember;
  const isLoading = isLoadingAuth || (!!id && isFetching);

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
  
  useEffect(() => {
    if (profileData && Object.keys(profileData).length > 0) {
        setForm({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            dob: formatToInputDate(profileData.dob || profileData.date_of_birth),
            status: profileData.status || 'pending',
            email: profileData.email || '',
            phone: profileData.phone || '',
            street_address: profileData.street_address || '',
            city: profileData.city || '',
            state: profileData.state || '',
            postcode: profileData.postcode || '',
            discord_username: profileData.discord_username || '',
            comm_prefs: Array.isArray(profileData.comm_prefs) ? profileData.comm_prefs : ['Email'],
            sim_environment: profileData.sim_environment || '',
            racing_interests: Array.isArray(profileData.racing_interests) ? profileData.racing_interests : [],
            sim_platforms: Array.isArray(profileData.sim_platforms) ? profileData.sim_platforms : [],
            sim_platforms_other: profileData.sim_platforms_other || '',
            parent_name: profileData.parent_name || '', 
            parent_email: profileData.parent_email || '',
            region: profileData.region || '',
            country: profileData.country || '',
            member_type: profileData.member_type || ''
      });
    }
  }, [profileData, user, isEditingSelf]);

  const isFormValid = 
    form.first_name.trim() !== '' &&
    form.last_name.trim() !== '' &&
    form.dob !== '' &&
    form.email.trim() !== '' &&
    form.discord_username.trim() !== '' &&
    form.comm_prefs.length > 0 &&
    form.sim_environment !== '' &&
    form.racing_interests.length > 0 &&
    (form.member_type !== 'junior' || (form.parent_name.trim() !== '' && form.parent_email.trim() !== ''));

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
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
      toast.error('Failed to update profile.');
      setSaveStatus('error');
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isEditingSelf && <Button variant="ghost" onClick={() => navigate('/admin/members')} className="pl-0"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>}
          <h2 className="text-2xl font-bold tracking-tight">{isEditingSelf ? 'My Profile' : 'Edit Member'}</h2>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto space-y-6">
        
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center"><UserCircle className="w-10 h-10" /></div>
          <div>
            <h1 className="text-2xl font-bold">{form.first_name} {form.last_name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="capitalize">{form.member_type || 'Member'}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", form.status === 'active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                  {form.status || 'pending'}
              </span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Member Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed relative">
                {!hasFullPermissions && <div className="absolute top-2 right-2 text-xs font-medium text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</div>}
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} disabled={!hasFullPermissions} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} disabled={!hasFullPermissions} /></div>
                <div className="space-y-2"><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} disabled={!hasFullPermissions} /></div>
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

              {form.member_type === 'junior' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-primary"><Shield className="w-5 h-5" /><h3 className="font-semibold text-lg">Parent Details</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary/5 p-4 rounded-lg">
                    <div className="space-y-2"><Label>Parent Name *</Label><Input value={form.parent_name} onChange={e => handleChange('parent_name', e.target.value)} disabled={!hasFullPermissions} /></div>
                    <div className="space-y-2"><Label>Parent Email *</Label><Input value={form.parent_email} onChange={e => handleChange('parent_email', e.target.value)} disabled={!hasFullPermissions} /></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2"><Label>Email Address *</Label><Input value={form.email} onChange={e => handleChange('email', e.target.value)} /></div>
                <div className="space-y-2"><Label>Discord Username *</Label><Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} /></div>
              </div>

              {/* Communication Preferences */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-primary"><MessageSquare className="w-5 h-5" /><h3 className="font-semibold text-lg">Communication Preferences *</h3></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg">
                  {COMM_PREFS.map(pref => (
                    <label key={pref} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={form.comm_prefs.includes(pref)} onCheckedChange={(checked) => {
                        const next = checked ? [...form.comm_prefs, pref] : form.comm_prefs.filter(p => p !== pref);
                        handleChange('comm_prefs', next);
                      }}/>
                      <span className="text-sm group-hover:text-primary">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sim Racing Profile */}
                <div className="space-y-6 pt-4 border-t">
                <h3 className="font-semibold text-lg text-primary">Sim Racing Profile</h3>
                
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Sim Environment *
                    </Label>
                    {/* Switched from Select to Input to fix the default value binding issue */}
                    <Input 
                    placeholder="e.g. PC with wheel and pedals" 
                    value={form.sim_environment} 
                    onChange={e => handleChange('sim_environment', e.target.value)} 
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                    Common setups: Console/PC with controller or wheel/pedals.
                    </p>
                </div>

                <div className="space-y-3">
                    <Label>Racing Interests *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RACING_INTERESTS.map(interest => (
                        <label key={interest} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border">
                        <Checkbox 
                            checked={form.racing_interests.includes(interest)} 
                            onCheckedChange={(checked) => {
                            const next = checked ? [...form.racing_interests, interest] : form.racing_interests.filter(i => i !== interest);
                            handleChange('racing_interests', next);
                            }}
                        />
                        <span className="text-[11px] leading-tight">{interest}</span>
                        </label>
                    ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>Platforms & Software</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SIM_PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer group">
                        <Checkbox 
                            checked={form.sim_platforms.includes(p)} 
                            onCheckedChange={checked => {
                            const next = checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p);
                            handleChange('sim_platforms', next);
                            if (!checked && p === 'Other') handleChange('sim_platforms_other', '');
                            }} 
                        />
                        <span className="text-sm group-hover:text-primary">{p}</span>
                        </label>
                    ))}
                    </div>
                    {form.sim_platforms.includes("Other") && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Other Platforms</Label>
                        <Input 
                        placeholder="Specify other platforms" 
                        value={form.sim_platforms_other} 
                        onChange={e => handleChange('sim_platforms_other', e.target.value)} 
                        />
                    </div>
                    )}
                </div>
                </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg text-primary">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Region</Label><Input value={form.region} disabled /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={form.country} disabled /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Street Address</Label><Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} /></div>
                  <div className="space-y-2"><Label>City / Suburb</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
                  <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => handleChange('state', e.target.value)} /></div>
                </div>
              </div>

              <Button type="submit" disabled={saveStatus === 'saving' || !isFormValid} className="w-full h-12 text-lg">
                {saveStatus === 'saving' ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 mt-8">
             <h3 className="text-green-400 font-mono text-xs mb-2 uppercase tracking-widest">Debug: Record Details</h3>
             <pre className="text-green-400 text-[10px] overflow-auto max-h-40">{JSON.stringify(profileData, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Added Link for navigation
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  UserCircle, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  LogOut, 
  User, 
  Calendar 
} from 'lucide-react'; // Added Lucide icons for the header
import { cn } from '@/lib/utils';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function MyProfile() {
  const { user, checkLoginStatus, logout, isLoadingAuth } = useAuth(); // Added logout and isLoadingAuth
  
  const [form, setForm] = useState({
    email: '',
    phone: '', 
    street_address: '', 
    city: '', 
    state: '', 
    postcode: '', 
    discord_username: '', 
    sim_platforms: []
  });
  
  const [status, setStatus] = useState('idle'); 
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.member_details) {
      const details = user.member_details;
      setForm({
        email: user.email || '', 
        phone: details.phone || '',
        street_address: details.street_address || '',
        city: details.city || '',
        state: details.state || '', 
        postcode: details.postcode || '',
        discord_username: details.discord_username || '',
        sim_platforms: Array.isArray(details.sim_platforms) ? details.sim_platforms : []
      });
    }
  }, [user]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      await base44.post('/update-me', form);
      await checkLoginStatus(); 
      setStatus('success');
      setMessage('Profile updated successfully!');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to update profile.');
    }
  };

  // Improved loading state to prevent layout shift
  if (isLoadingAuth || !user?.member_details) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const details = user.member_details;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ADDED HEADER: Matches the style and functionality of AdminLayout */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl text-primary">FS Portal</span>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/my-profile"
                className="bg-primary/10 text-primary flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                to="/meetings"
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Meetings
              </Link>
            </nav>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Profile Content - Your original UI structure is preserved here */}
      <main className="flex-1 max-w-3xl w-full mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <UserCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{details.first_name} {details.last_name}</h1>
            <p className="text-muted-foreground">
              {details.membership_type || 'Member'} • Status: 
              <span className={cn(
                  "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                  details.status === 'active' 
                  ? "bg-green-100 text-green-700 border-green-200" 
                  : "bg-orange-100 text-orange-700 border-orange-200"
              )}>
                  {details.status || 'pending'}
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
              
              {/* Locked Admin-Controlled Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                <div className="md:col-span-2 flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Lock className="w-3 h-3" /> ADMIN CONTROLLED FIELDS
                </div>
                
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input disabled value={details.first_name || ''} className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input disabled value={details.last_name || ''} className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input disabled value={details.dob || ''} className="bg-muted" />
                </div>

                <div className="space-y-2">
                    <Label>Current Status</Label>
                    <div className="h-10 flex items-center">
                      <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                          details.status === 'active' 
                          ? "bg-green-100 text-green-700 border-green-200" 
                          : "bg-orange-100 text-orange-700 border-orange-200"
                      )}>
                          {details.status || 'pending'}
                      </span>
                    </div>
                </div>

                {/* Parent (Junior Members) */}
                {details.parent_name && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-slate-200">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Linked Parent / Guardian</Label>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{details.parent_name}</p>
                        <p className="text-xs text-slate-500">{details.parent_email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Linked Juniors (Adult Members/Parents) */}
                {details.children && details.children.length > 0 && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-slate-200">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Linked Junior Members</Label>
                    <div className="space-y-2">
                      {details.children.map(child => (
                        <div key={child.id} className="flex justify-between items-center p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                          <span className="text-sm font-medium text-purple-900">{child.name}</span>
                          <span className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                            child.status === 'active' ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"
                          )}>
                            {child.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="md:col-span-2 text-xs text-muted-foreground italic mt-2">
                  Please contact an administrator to update these fields.
                </p>
              </div>

              {/* Editable Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                      type="email"
                      value={form.email} 
                      onChange={e => handleChange('email', e.target.value)} 
                    />
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

              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5" /> {message}
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-5 h-5" /> {message}
                </div>
              )}

              <Button type="submit" disabled={status === 'saving'} className="w-full h-12 text-lg">
                {status === 'saving' ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving Changes...</> : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
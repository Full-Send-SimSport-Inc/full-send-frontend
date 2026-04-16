import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function MyProfile() {
  const { user, checkLoginStatus } = useAuth();
  
  const [form, setForm] = useState({
    phone: '', street_address: '', city: '', state: '', 
    postcode: '', discord_username: '', sim_platforms: []
  });
  
  const [status, setStatus] = useState('idle'); // idle, saving, success, error
  const [message, setMessage] = useState('');

  // Pre-fill the form when the user data loads
  useEffect(() => {
    if (user?.member_details) {
      const details = user.member_details;
      setForm({
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
      // Hit the new WP endpoint
      await base44.post('/update-me', form);
      
      // Refresh local user context to ensure app has latest data
      await checkLoginStatus(); 
      
      setStatus('success');
      setMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  if (!user?.member_details) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const details = user.member_details;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <UserCircle className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{details.first_name} {details.last_name}</h1>
          <p className="text-muted-foreground capitalize">
            {details.membership_type || 'Member'} • Status: <span className="font-semibold">{details.status}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update My Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Read Only Email */}
            <div className="space-y-2">
              <Label>Email Address (Cannot be changed here)</Label>
              <Input disabled value={user.email} className="bg-muted" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discord Username</Label>
                <Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Location</h3>
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
                  <Select value={form.state} onValueChange={v => handleChange('state', v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Sim Platforms</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SIM_PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={form.sim_platforms.includes(p)}
                      onCheckedChange={checked => handleChange('sim_platforms', checked 
                        ? [...form.sim_platforms, p] 
                        : form.sim_platforms.filter(x => x !== p)
                      )} 
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            {status === 'success' && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5" /> {message}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" /> {message}
              </div>
            )}

            <Button type="submit" disabled={status === 'saving'} className="w-full">
              {status === 'saving' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
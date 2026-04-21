import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

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

export default function OnboardingView({ user, onComplete }) {
  const [form, setForm] = useState({
    discord_username: '',
    comm_prefs: ['Email'],
    sim_environment: '',
    racing_interests: [],
    sim_platforms: [],
    sim_platforms_other: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Strict Validation Logic
  const isFormValid = 
    form.discord_username.trim() !== '' &&
    form.comm_prefs.length > 0 &&
    form.sim_environment !== '' &&
    form.racing_interests.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Explicit Error Checks
    if (!form.discord_username.trim()) return setError("Please enter your Discord username.");
    if (form.comm_prefs.length === 0) return setError("Please select at least one communication preference.");
    if (!form.sim_environment) return setError("Please select your sim racing environment.");
    if (form.racing_interests.length === 0) return setError("Please select at least one racing interest.");

    setError('');
    setLoading(true);

    try {
      await base44.post(`/members/self/onboarding`, form);
      onComplete(); // Triggers the refreshUser function passed from Portal.jsx
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message;
      setError(serverMessage || "Failed to save onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 w-full animate-in fade-in zoom-in-95 duration-300">
      <Card className="shadow-2xl border-primary/20">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            🚀 Welcome, {user.display_name}!
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Let's finish setting up your racing profile before you hit the track.
          </p>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Discord - Mandatory */}
            <div className="p-5 bg-slate-900 text-white rounded-xl shadow-inner">
               <Label className="text-base font-bold mb-3 block">Discord Username *</Label>
               <Input 
                 value={form.discord_username} 
                 onChange={e => setForm({...form, discord_username: e.target.value})}
                 className="bg-white text-black max-w-md"
                 placeholder="e.g. racer_44"
                 required
               />
               <p className="text-sm text-slate-300 mt-2">
                 Discord is mandatory for all Full Send official communications, race briefings, and community chat.
               </p>
            </div>

            {/* Communication Preferences */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Communication Preferences *</h3>
              </div>
              <p className="text-sm text-muted-foreground">Select preferred contact methods (Email is default).</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COMM_PREFS.map(pref => (
                  <label key={pref} className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox 
                      checked={form.comm_prefs.includes(pref)} 
                      onCheckedChange={(checked) => {
                        const next = checked ? [...form.comm_prefs, pref] : form.comm_prefs.filter(p => p !== pref);
                        setForm({...form, comm_prefs: next});
                      }}
                    />
                    <span className="text-sm group-hover:text-primary transition-colors">{pref}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sim Racing Profile fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                
                {/* Sim Environment */}
                <div className="space-y-4">
                    <Label className="font-bold flex items-center gap-2 text-primary text-base">
                      <Monitor className="w-5 h-5"/> Sim Environment *
                    </Label>
                    <Select value={form.sim_environment} onValueChange={v => setForm({...form, sim_environment: v})} required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="What equipment do you operate with?" />
                        </SelectTrigger>
                        <SelectContent>
                            {SIM_ENVIRONMENTS.map(env => <SelectItem key={env} value={env}>{env}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* Racing Interests */}
                <div className="space-y-4">
                    <Label className="text-base font-bold text-primary">Racing Interests *</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {RACING_INTERESTS.map(interest => (
                        <label key={interest} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border transition-colors">
                          <Checkbox 
                            checked={form.racing_interests.includes(interest)} 
                            onCheckedChange={(checked) => {
                              const next = checked ? [...form.racing_interests, interest] : form.racing_interests.filter(i => i !== interest);
                              setForm({...form, racing_interests: next});
                            }}
                          />
                          <span className="text-xs leading-tight">{interest}</span>
                        </label>
                      ))}
                    </div>
                </div>

                {/* Platforms */}
                <div className="space-y-4 md:col-span-2 pt-4 border-t">
                  <Label className="text-base font-bold text-primary">Active Platforms (select all that apply)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    {SIM_PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox 
                          checked={form.sim_platforms.includes(p)} 
                          onCheckedChange={checked => {
                            const next = checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p);
                            setForm({...form, sim_platforms: next});
                            if (!checked && p === 'Other') setForm(prev => ({...prev, sim_platforms_other: ''}));
                          }} 
                        />
                        <span className="text-sm">{p}</span>
                      </label>
                    ))}
                  </div>
                  {form.sim_platforms.includes('Other') && (
                    <div className="space-y-2 mt-4 pl-4 border-l-2 border-primary/20 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="sim_platforms_other" className="text-xs uppercase tracking-wider text-muted-foreground">Please specify other platform(s)</Label>
                        <Input 
                          id="sim_platforms_other" 
                          placeholder="e.g. BeamNG, KartKraft, Richard Burns Rally" 
                          value={form.sim_platforms_other} 
                          onChange={e => setForm({...form, sim_platforms_other: e.target.value})} 
                          className="bg-white max-w-md"
                        />
                    </div>
                   )}
                </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold shadow-lg mt-4" 
              disabled={loading || !isFormValid}
            >
              {loading ? <><Loader2 className="animate-spin mr-2" /> Saving Profile...</> : "Complete My Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
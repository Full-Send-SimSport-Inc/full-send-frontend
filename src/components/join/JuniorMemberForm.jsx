import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, MessageSquare, Globe, Gamepad2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const COMMON_COUNTRIES = ["Australia", "New Zealand", "United Kingdom", "United States", "Canada"];

const getStatePlaceholder = (country) => {
  switch (country) {
    case "United States": return "e.g. California";
    case "Canada": return "e.g. Ontario";
    case "New Zealand": return "e.g. Auckland";
    case "United Kingdom": return "e.g. Greater London or County";
    default: return "State / Province / Region";
  }
};

export default function JuniorMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState(''); // 'junior_racing' or 'junior_supporting'
  const [hasDiscord, setHasDiscord] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', parent_email: '', phone: '',
    street_address: '', city: '', state: '',
    postcode: '', country: 'Australia', discord_username: '',
    sim_platforms: [], agreed_to_terms: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMemberId, setSubmittedMemberId] = useState(null);
  const [password, setPassword] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitted) {
      setSubmitting(true);
      setError('');
      try {
        const response = await fetch('/wp-json/full-send/v1/setup-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: submittedMemberId,
            email: form.email,
            password: password
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create account');
        setAccountCreated(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!memberType) {
        setError('Please select a membership type.');
        return;
      }
      if (hasDiscord === true && !form.discord_username) {
        setError('Please provide your Discord username.');
        return;
      }
      if (!form.agreed_to_terms) {
        setError('Parent/Guardian agreement is required.');
        return;
      }

      setSubmitting(true);
      setError('');

      try {
        const payload = { ...form, status: 'pending', member_type: memberType };
        const res = await base44.entities.Member.create(payload);
        setSubmittedMemberId(res.id);
        setSubmitted(true);
        window.scrollTo(0, 0);
      } catch (err) {
        setError('Failed to submit application. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (accountCreated) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="max-w-md mx-auto border-0 shadow-2xl text-center p-12">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Application Sent!</h2>
          <p className="text-muted-foreground my-4">Your application is pending parent/guardian consent.</p>
          <Button asChild className="w-full mt-4"><Link to="/admin">Go to Login</Link></Button>
        </Card>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="max-w-md mx-auto border-0 shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Set Junior Password</h2>
            <p className="text-sm text-muted-foreground mt-1">This will be used to log into the member portal.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} />
            {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create Account'}
            </Button>
          </form>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
        ← Back to selection
      </button>

      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-6 text-white flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold">Junior Membership Application</h2>
            <p className="text-slate-400 text-sm">Under 18 years of age</p>
          </div>
        </div>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* New Membership Type Selection for Juniors */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Select Junior Member Type *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => setMemberType('junior_racing')} className={cn("flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center gap-2", memberType === 'junior_racing' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40")}>
                  <Gamepad2 className={cn("w-6 h-6", memberType === 'junior_racing' ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-bold text-sm">Racing Junior</span>
                </button>
                <button type="button" onClick={() => setMemberType('junior_supporting')} className={cn("flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center gap-2", memberType === 'junior_supporting' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40")}>
                  <Heart className={cn("w-6 h-6", memberType === 'junior_supporting' ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-bold text-sm">Supporting Junior</span>
                </button>
              </div>
            </div>



            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name *</Label><Input required value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input required value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Junior Email *</Label><Input type="email" required value={form.email} onChange={e => handleChange('email', e.target.value)} /></div>
                <div className="space-y-2"><Label>Phone (Optional)</Label><Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
                <div className="space-y-2">
                    <Label>Parent/Guardian Email *</Label><Input type="email" required value={form.parent_email} onChange={e => handleChange('parent_email', e.target.value)} placeholder="The email your parent used to join"/>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Country *</Label>
                  <Select value={form.country} onValueChange={v => { handleChange('country', v); handleChange('state', ''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMON_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="Other">Other / International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2"><Label>Street Address</Label><Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} /></div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>City *</Label><Input required value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>{form.country === 'Australia' ? 'State *' : 'State/Province *'}</Label>
                    {form.country === 'Australia' ? (
                      <Select value={form.state} onValueChange={v => handleChange('state', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input required value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder={getStatePlaceholder(form.country)} />
                    )}
                  </div>
                  <div className="space-y-2"><Label>Postcode</Label><Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} /></div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-xl border border-dashed">
                <Label className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Do you have a Discord account? *</Label>
                <div className="flex gap-4">
                  <Button type="button" variant={hasDiscord === true ? "default" : "outline"} onClick={() => setHasDiscord(true)} className="flex-1">Yes</Button>
                  <Button type="button" variant={hasDiscord === false ? "default" : "outline"} onClick={() => { setHasDiscord(false); handleChange('discord_username', ''); }} className="flex-1">No</Button>
                </div>
                <AnimatePresence mode="wait">
                  {hasDiscord === true && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 pt-2">
                      <Label>Discord Username *</Label>
                      <Input required value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} placeholder="username#0000" />
                    </motion.div>
                  )}
                  {hasDiscord === false && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 text-sm bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                      No problem! You'll need Discord for club communications. You can <a href="https://discord.com/register" target="_blank" rel="noreferrer" className="underline font-bold">create an account here</a> then update your profile later.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Show Sim Platforms only if they are a Racing Junior */}
              {memberType === 'junior_racing' && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">Sim Platforms You Race On</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SIM_PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer group">
                        <Checkbox checked={form.sim_platforms.includes(p)} onCheckedChange={checked => handleChange('sim_platforms', checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p))} />
                        <span className="text-sm group-hover:text-primary transition-colors">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-1" />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer font-normal">
                I agree to become a junior member of Full Send SimSports Inc. I understand that my parent or guardian must confirm membership and consent to my personal information being stored for membership management purposes before my membership is activated. *
              </Label>
            </div>

            {error && <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            <Button type="submit" disabled={submitting} size="lg" className="w-full text-base font-semibold shadow-lg shadow-black/10">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Junior Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
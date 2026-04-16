import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function JuniorMemberForm({ onBack }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    street_address: '', city: '', state: '',
    postcode: '', country: 'Australia', discord_username: '',
    sim_platforms: [], agreed_to_terms: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMemberId, setSubmittedMemberId] = useState(null); // Captured member ID
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
      // Step 2: Create Account
      setSubmitting(true);
      setError('');
      try {
        const response = await fetch('/wp-json/full-send/v1/setup-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: submittedMemberId, // Correctly passing the ID
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
      // Step 1: Submit Application
      if (!form.agreed_to_terms) {
        setError('Parent/Guardian agreement is required.');
        return;
      }

      setSubmitting(true);
      setError('');

      try {
        const res = await base44.entities.Member.create({ ...form, status: 'pending', member_type: 'junior' });
        
        setSubmittedMemberId(res.id); // Capturing generated ID
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
        <Card className="max-w-md mx-auto border-0 shadow-2xl">
          <CardContent className="pt-12 pb-10 px-8 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Sent!</h2>
            <p className="text-muted-foreground mb-8">
              Great! Your junior application has been received. Your parent/guardian will be contacted to confirm consent.
            </p>
            <Button asChild className="w-full" size="lg">
              <Link to="/admin">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="max-w-md mx-auto border-0 shadow-2xl overflow-hidden">
          <div className="bg-secondary-foreground h-2" />
          <CardContent className="pt-10 pb-8 px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Almost there!</h2>
              <p className="text-muted-foreground text-sm">Create a password to manage your membership details.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Choose Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </CardContent>
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
        <div className="bg-secondary-foreground p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-bold">Junior Membership Application</h2>
          </div>
          <p className="text-white/70 text-sm">For racers under 18 years of age.</p>
        </div>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input required value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input required value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Junior Email Address *</Label>
                  <Input type="email" required value={form.email} onChange={e => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input required value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address *</Label>
                <Input required value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input required value={form.city} onChange={e => handleChange('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={form.state} onValueChange={v => handleChange('state', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Postcode *</Label>
                  <Input required value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Discord Username (Optional)</Label>
                <Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} placeholder="username#0000" />
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-semibold">Sim Platforms You Race On</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SIM_PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.sim_platforms.includes(p)}
                        onCheckedChange={checked => handleChange('sim_platforms', checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p))}
                      />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-1" />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer font-normal">
                I agree to become a junior member of Full Send SimSports Inc. I understand that my parent or guardian must confirm consent before my membership is activated. *
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <Button type="submit" disabled={submitting} size="lg" className="w-full text-base font-semibold shadow-lg shadow-black/10">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Junior Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Gamepad2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function AdultMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    street_address: '', city: '', state: '',
    postcode: '', country: 'Australia', discord_username: '',
    sim_platforms: [], agreed_to_terms: false,
    dob: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null); // Fixed naming here

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation
    if (!form.agreed_to_terms) {
      setError("You must agree to the terms to continue.");
      return;
    }

    if (!memberType) {
        setError("Please select a membership type.");
        return;
    }

    // 2. Date Validation: Ensure all three dropdowns are selected
    if (!form.dob) {
      setError("Please select your full date of birth.");
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 3. Prepare Payload: Combine date and normalize state key
      const payload = {
        ...form,
        state: form.state,
        member_type: 'adult',
        sub_type: memberType
      };

      // 4. Send to WordPress
      const response = await base44.post('/join', payload);
      
      setSubmittedData({
        id: response.data?.id || response.id, 
        email: form.email
      });
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedData) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-6">
        <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur">
          <CardContent className="pt-12 pb-12 px-6 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black mb-4">Application Received!</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Thank you for applying. The committee will review your application shortly.
              </p>
              
              <div className="space-y-3 max-w-sm mx-auto">
                <Button asChild className="w-full" size="lg">
                  <Link to={`/setup-account/${submittedData.id}/${submittedData.email}`}>
                    Set Up My Account Password
                  </Link>
                </Button>
                
                <Button onClick={onBack} variant="outline" className="w-full">
                  Return to Options
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="max-w-2xl mx-auto py-10 px-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
        ← Back to membership options
      </button>
      <Card className="border-0 shadow-xl shadow-primary/5">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Member Type Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Membership Type *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setMemberType('racing')}
                  className={cn("p-4 rounded-xl border-2 text-left transition-all",
                    memberType === 'racing' ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <Gamepad2 className={cn("w-6 h-6 mb-2", memberType === 'racing' ? "text-primary" : "text-muted-foreground")} />
                  <p className="font-semibold text-sm">Racing Member</p>
                  <p className="text-xs text-muted-foreground mt-1">Active sim racer competing in events</p>
                </button>
                <button type="button" onClick={() => setMemberType('supporting')}
                  className={cn("p-4 rounded-xl border-2 text-left transition-all",
                    memberType === 'supporting' ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <Heart className={cn("w-6 h-6 mb-2", memberType === 'supporting' ? "text-primary" : "text-muted-foreground")} />
                  <p className="font-semibold text-sm">Supporting Member</p>
                  <p className="text-xs text-muted-foreground mt-1">Non-racing supporter / parent / guardian</p>
                </button>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} placeholder="Smith" required />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="0400 000 000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Date of Birth *</Label>
                  <Input 
                    type="date" 
                    value={form.dob} 
                    onChange={e => handleChange('dob', e.target.value)} 
                    required 
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>City / Suburb</Label>
                  <Input value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="Melbourne" />
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
                  <Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} placeholder="3000" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={e => handleChange('country', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Sim Racing — only for racing members */}
            {memberType === 'racing' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Sim Racing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Discord Username</Label>
                    <Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} placeholder="username#1234" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Sim Platforms (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SIM_PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={form.sim_platforms.includes(p)}
                            onCheckedChange={checked => handleChange('sim_platforms', checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p))} />
                          <span className="text-sm">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I agree to become a member of Full Send SimSports Inc. and consent to my personal information being stored for membership management purposes. *
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <Button type="submit" disabled={submitting} size="lg" className="w-full text-base font-semibold">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
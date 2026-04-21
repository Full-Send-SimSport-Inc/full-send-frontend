import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Gauge, Heart, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const REGIONS = ["Oceania", "Africa", "Asia", "Europe", "North America", "South America"];

export default function AdultMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState('');
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [form, setForm] = useState({
    first_name: '', 
    last_name: '', 
    email: '', 
    phone: '',
    region: '', 
    country: '', 
    street_address: '', 
    city: '', 
    state: '', 
    postcode: '', 
    agreed_to_terms: false, 
    dob: '',
    reason_for_joining: '', // New field
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleRegionChange = async (selectedRegion) => {
    handleChange('region', selectedRegion);
    handleChange('country', '');
    handleChange('state', '');
    setCountries([]);
    if (!selectedRegion) return;
    setLoadingCountries(true);

    try {
      let url = `https://restcountries.com/v3.1/region/${selectedRegion.toLowerCase()}`;
      if (selectedRegion === 'North America' || selectedRegion === 'South America') {
        url = `https://restcountries.com/v3.1/subregion/${encodeURIComponent(selectedRegion.toLowerCase())}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      let countryNames = data.map(c => c.name.common).sort();
      if (selectedRegion === 'Oceania') {
        countryNames = countryNames.filter(c => c !== 'Australia' && c !== 'New Zealand');
        countryNames.unshift('New Zealand'); 
        countryNames.unshift('Australia');
      }
      setCountries(countryNames);
    } catch (err) {
      console.error("Failed to fetch countries", err);
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.agreed_to_terms) return setError("You must agree to the terms to continue.");
    if (!memberType) return setError("Please select a membership type.");
    if (!form.dob) return setError("Please select your full date of birth.");
    if (form.reason_for_joining.trim().length < 20) return setError("Please provide a more detailed reason for joining (min 20 characters).");
    if (!form.region) return setError("Region is required.");
    if (!form.country) return setError("Country is required.");
    if (form.country === 'Australia' && !form.state) return setError("State is required for Australian residents.");

    setSubmitting(true);
    setError('');

    try {
      const payload = { ...form, member_type: 'adult', sub_type: memberType };
      const response = await base44.post('/join', payload);
      setSubmittedData({ id: response.data?.id || response.id, email: form.email });
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.data?.message || err.message;
      setError(serverMessage || "An error occurred during submission.");
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
                Thank you for applying to Full Send SimSport. The committee will review your application shortly. 
                Keep an eye on your email inbox for your next steps!
              </p>
              <div className="space-y-3 max-w-sm mx-auto">
                <Button onClick={onBack} variant="outline" className="w-full">Return to Home</Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFormValid = 
    memberType &&
    form.first_name.trim() !== '' &&
    form.last_name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.dob !== '' &&
    form.reason_for_joining.trim().length >= 20 &&
    form.region !== '' &&
    form.country !== '' &&
    (form.country !== 'Australia' || form.state !== '') &&
    form.agreed_to_terms;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="max-w-2xl mx-auto py-10 px-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
        ← Back to membership options
      </button>
      <Card className="border-0 shadow-xl shadow-primary/5">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Member Type Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Membership Type *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setMemberType('racing')}
                  className={cn("p-4 rounded-xl border-2 text-left transition-all",
                    memberType === 'racing' ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <Gauge className={cn("w-6 h-6 mb-2", memberType === 'racing' ? "text-primary" : "text-muted-foreground")} />
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
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} required /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} required /></div>
                <div className="space-y-2"><Label>Email Address *</Label><Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} required /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} required className="w-full" /></div>
              </div>
            </div>

            {/* Recruitment Details - THE NEW FIELD */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recruitment Details
              </h3>
              <div className="space-y-2 mt-4">
                <Label htmlFor="reason">Why would you like to join Full Send SimSport? *</Label>
                <Textarea 
                  id="reason"
                  placeholder="Tell us a bit about yourself and why you're interested in our community..."
                  value={form.reason_for_joining} 
                  onChange={e => handleChange('reason_for_joining', e.target.value)}
                  className="min-h-[120px] resize-none"
                  required
                />
                <p className="text-[10px] text-muted-foreground italic">
                  This helps our committee ensure we are recruiting members who align with our values.
                </p>
              </div>
            </div>

            {/* Location Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Region *</Label>
                  <Select value={form.region} onValueChange={handleRegionChange} required>
                    <SelectTrigger><SelectValue placeholder="Select geographic region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {form.region && (
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select value={form.country} onValueChange={v => { handleChange('country', v); handleChange('state', ''); }} disabled={loadingCountries} required>
                      <SelectTrigger><SelectValue placeholder={loadingCountries ? "Loading..." : "Select Country"} /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.country && (
                  <div className="space-y-2">
                    <Label>State / Province {form.country === 'Australia' && '*'}</Label>
                    {form.country === 'Australia' ? (
                      <Select value={form.state} onValueChange={v => handleChange('state', v)} required>
                        <SelectTrigger><SelectValue placeholder="Select AU State" /></SelectTrigger>
                        <SelectContent>{AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder="e.g. California (Optional)" />
                    )}
                  </div>
                )}
                <div className="space-y-2 md:col-span-2"><Label>Street Address</Label><Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} /></div>
                <div className="space-y-2"><Label>City / Suburb</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
                <div className="space-y-2"><Label>Postcode</Label><Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} /></div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg border">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I agree to apply for membership of Full Send SimSport Inc. and consent to my personal information being stored for application review purposes. *
              </Label>
            </div>

            {error && <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            <Button type="submit" disabled={submitting || !isFormValid} size="lg" className="w-full text-base font-bold shadow-lg">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Gamepad2, Heart, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

// Hardcoded with Oceania at the top
const REGIONS = ["Oceania", "Africa", "Asia", "Europe", "North America", "South America"];

export default function AdultMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState('');
  
  // Custom states for the API filtering
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    region: '', country: '', street_address: '', city: '', state: '', postcode: '', 
    has_discord: null, discord_username: '', 
    sim_platforms: [], agreed_to_terms: false, dob: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // --- NEW REGION HANDLING LOGIC ---
  const handleRegionChange = async (selectedRegion) => {
    handleChange('region', selectedRegion);
    handleChange('country', '');
    handleChange('state', '');
    setCountries([]);

    if (!selectedRegion) return;
    setLoadingCountries(true);

    try {
      let url = `https://restcountries.com/v3.1/region/${selectedRegion.toLowerCase()}`;
      // API uses "subregion" for the Americas
      if (selectedRegion === 'North America' || selectedRegion === 'South America') {
        url = `https://restcountries.com/v3.1/subregion/${encodeURIComponent(selectedRegion.toLowerCase())}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      // Extract country names and sort alphabetically
      let countryNames = data.map(c => c.name.common).sort();

      // Force Australia to the top if Oceania is selected
      if (selectedRegion === 'Oceania') {
        countryNames = countryNames.filter(c => c !== 'Australia' && c !== 'New Zealand');
        countryNames.unshift('New Zealand'); 
        countryNames.unshift('Australia');
      }

      setCountries(countryNames);
    } catch (err) {
    // 1. Check for the message from the PHP WP_Error
    const serverMessage = err.response?.data?.message;
    
    // 2. Check if the error is a string itself (some wrappers do this)
    const fallbackMessage = typeof err === 'string' ? err : "An error occurred during submission.";

    setError(serverMessage || fallbackMessage);
    console.error("Submission Error:", err.response?.data); // Helpful for debugging
    }; finally {
      setLoadingCountries(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.agreed_to_terms) return setError("You must agree to the terms to continue.");
    if (!memberType) return setError("Please select a membership type.");
    if (!form.dob) return setError("Please select your full date of birth.");
    
    // City removed from mandatory validation
    if (!form.region) return setError("Region is required.");
    if (!form.country) return setError("Country is required.");
    if (form.country === 'Australia' && !form.state) {
      return setError("State is required for Australian residents.");
    }

    if (form.has_discord === null) return setError("Please specify if you have a Discord account.");
    if (form.has_discord === 'no') return setError("A Discord account is mandatory. Please create one using the link provided and enter your username.");
    if (form.has_discord === 'yes' && !form.discord_username) return setError("Please enter your Discord username.");

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        member_type: 'adult',
        sub_type: memberType
      };

      const response = await base44.post('/join', payload);
      
      setSubmittedData({
        id: response.data?.id || response.id, 
        email: form.email
      });
    } catch (err) {
    // 1. Check for the message from the PHP WP_Error
    const serverMessage = err.response?.data?.message;
    
    // 2. Check if the error is a string itself (some wrappers do this)
    const fallbackMessage = typeof err === 'string' ? err : "An error occurred during submission.";

    setError(serverMessage || fallbackMessage);
    console.error("Submission Error:", err.response?.data); // Helpful for debugging
    };
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

  const isFormValid = 
    memberType &&
    form.first_name.trim() !== '' &&
    form.last_name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.dob !== '' &&
    form.region !== '' &&
    form.country !== '' &&
    // State only required if Australia
    (form.country !== 'Australia' || form.state !== '') &&
    // Discord MUST be 'yes' AND username must be filled
    form.has_discord === 'yes' &&
    form.discord_username.trim() !== '' &&
    form.agreed_to_terms;

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

            {/* Location Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                {/* 1. REGION SELECT */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Region *</Label>
                  <Select value={form.region} onValueChange={handleRegionChange} required>
                    <SelectTrigger><SelectValue placeholder="Select geographic region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. COUNTRY SELECT (Only visible if Region selected) */}
                {form.region && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Country *</Label>
                    <Select value={form.country} onValueChange={v => { handleChange('country', v); handleChange('state', ''); }} disabled={loadingCountries} required>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCountries ? "Loading..." : "Select Country"} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 3. STATE SELECT (Only visible if Country selected) */}
                {form.country && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    {/* Dynamic Label: Only shows asterisk if Australia */}
                    <Label>State / Province {form.country === 'Australia' && '*'}</Label>
                    
                    {form.country === 'Australia' ? (
                    <Select 
                        value={form.state} 
                        onValueChange={v => handleChange('state', v)} 
                        required
                    >
                        <SelectTrigger><SelectValue placeholder="Select AU State" /></SelectTrigger>
                        <SelectContent>
                        {AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    ) : (
                    <Input 
                        value={form.state} 
                        onChange={e => handleChange('state', e.target.value)} 
                        placeholder="e.g. California, Ontario (Optional)" 
                        /* 'required' removed here */
                    />
                    )}
                </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label>Street Address</Label>
                  <Input 
                    value={form.street_address} 
                    onChange={e => handleChange('street_address', e.target.value)} 
                    placeholder="123 Main St" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>City / Suburb</Label>
                  <Input 
                    value={form.city} 
                    onChange={e => handleChange('city', e.target.value)} 
                    placeholder="Melbourne" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input 
                    value={form.postcode} 
                    onChange={e => handleChange('postcode', e.target.value)} 
                    placeholder="3000" 
                  />
                </div>
              </div>
            </div>

            {/* Discord & Sim Racing */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Community & Racing</h3>
              <div className="grid grid-cols-1 gap-6">
                
                {/* Mandatory Discord Section */}
                <div className="space-y-3 p-4 bg-slate-50 border rounded-lg">
                  <Label className="text-base">Do you have a Discord account? *</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Discord is mandatory for all Full Send official communications, race briefings, and community chat.
                  </p>
                  
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="discord" 
                        className="w-4 h-4 text-primary"
                        checked={form.has_discord === 'yes'} 
                        onChange={() => handleChange('has_discord', 'yes')} 
                      /> 
                      <span className="font-medium">Yes, I have an account</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="discord" 
                        className="w-4 h-4 text-primary"
                        checked={form.has_discord === 'no'} 
                        onChange={() => handleChange('has_discord', 'no')} 
                      /> 
                      <span className="font-medium">No, I don't</span>
                    </label>
                  </div>

                  {form.has_discord === 'yes' && (
                    <div className="pt-3 space-y-2 animate-in fade-in">
                      <Label>Discord Username *</Label>
                      <Input 
                        value={form.discord_username} 
                        onChange={e => handleChange('discord_username', e.target.value)} 
                        placeholder="e.g. username#1234 or username" 
                        className="max-w-md bg-white"
                      />
                    </div>
                  )}

                  {form.has_discord === 'no' && (
                    <div className="pt-3 animate-in fade-in">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm flex flex-col gap-2">
                        <p><strong>You will need a Discord account to complete your application.</strong></p>
                        <a 
                          href="https://discord.com/register" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline w-fit"
                        >
                          Click here to create a free account <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="mt-1">Once you have created your account, select "Yes" above and enter your new username.</p>
                      </div>
                    </div>
                  )}
                </div>

                {memberType === 'racing' && (
                  <div className="space-y-2">
                    <Label>Sim Platforms (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {SIM_PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={form.sim_platforms.includes(p)}
                            onCheckedChange={checked => handleChange('sim_platforms', checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p))} />
                          <span className="text-sm">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

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

            <Button type="submit" disabled={submitting || !isFormValid} size="lg" className="w-full text-base font-semibold">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
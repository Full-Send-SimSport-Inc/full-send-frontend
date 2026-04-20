import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Gauge, Heart } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const REGIONS = ["Oceania", "Africa", "Asia", "Europe", "North America", "South America"];

export default function JuniorMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState('junior_racing');
    
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [form, setForm] = useState({
    parent_name: '', parent_email: '', // Preserved
    first_name: '', last_name: '', email: '', phone: '',
    region: '', country: '', street_address: '', city: '', state: '', postcode: '', 
    has_discord: null, discord_username: '', 
    sim_platforms: [], 
    sim_platforms_other: '', // Added as requested
    agreed_to_terms: false, dob: '',
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
        member_type: 'junior',
        sub_type: memberType
      };

      const response = await base44.post('/join', payload);
      
      setSubmittedData({
        id: response.data?.id || response.id, 
        email: form.email
      });
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.data?.message || err.message;
      setError(serverMessage || "An error occurred during submission.");
      console.error("Full Error Object:", err);
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
                Thank you for applying. A confirmation email has been sent to your parent/guardian for approval.
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
    form.parent_name.trim() !== '' &&
    form.parent_email.trim() !== '' &&
    form.email.trim() !== '' &&
    form.dob !== '' &&
    form.region !== '' &&
    form.country !== '' &&
    (form.country !== 'Australia' || form.state !== '') &&
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
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMemberType('junior_racing')}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2",
                  memberType === 'junior_racing' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40"
                )}
              >
                <Gauge className={cn("w-6 h-6", memberType === 'junior_racing' ? "text-primary" : "text-muted-foreground")} />
                <span className="font-bold">Racing Junior</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberType('junior_supporting')}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2",
                  memberType === 'junior_supporting' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40"
                )}
              >
                <Heart className={cn("w-6 h-6", memberType === 'junior_supporting' ? "text-primary" : "text-muted-foreground")} />
                <span className="font-bold">Supporting Junior</span>
              </button>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 mb-4 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold">Parent / Guardian Verification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Name *</Label>
                  <Input value={form.parent_name} onChange={e => handleChange('parent_name', e.target.value)} placeholder="Full Name" required />
                </div>
                <div className="space-y-2">
                  <Label>Parent Email *</Label>
                  <Input type="email" value={form.parent_email} onChange={e => handleChange('parent_email', e.target.value)} placeholder="parent@example.com" required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your parent/guardian will receive an email to approve this junior membership application.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Junior Member Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} placeholder="Junior's Name" required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} placeholder="Surname" required />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="junior@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number (Optional)</Label>
                  <Input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
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

            <div>
              <h3 className="text-lg font-semibold mb-4">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {form.country && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>State / Province {form.country === 'Australia' && '*'}</Label>
                    {form.country === 'Australia' ? (
                      <Select value={form.state} onValueChange={v => handleChange('state', v)} required>
                        <SelectTrigger><SelectValue placeholder="Select AU State" /></SelectTrigger>
                        <SelectContent>
                          {AU_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder="e.g. California, Ontario (Optional)" />
                    )}
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} placeholder="123 Main St" />
                </div>

                <div className="space-y-2">
                  <Label>City / Suburb</Label>
                  <Input value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="Melbourne" />
                </div>

                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} placeholder="3000" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Community & Racing</h3>
              <div className="grid grid-cols-1 gap-6">
                
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
                      <span className="font-medium ml-2">Yes, I have an account</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="discord" 
                        className="w-4 h-4 text-primary"
                        checked={form.has_discord === 'no'} 
                        onChange={() => handleChange('has_discord', 'no')} 
                      /> 
                      <span className="font-medium ml-2">No, I don't</span>
                    </label>
                  </div>

                  {form.has_discord === 'yes' && (
                    <div className="pt-3 space-y-2 animate-in fade-in">
                      <Label>Discord Username *</Label>
                      <Input 
                        value={form.discord_username} 
                        onChange={e => handleChange('discord_username', e.target.value)} 
                        placeholder="e.g. username#1234" 
                        className="max-w-md bg-white"
                      />
                    </div>
                  )}

                  {form.has_discord === 'no' && (
                    <div className="pt-3 animate-in fade-in">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm flex flex-col gap-2">
                        <p><strong>You will need a Discord account for team communications. Please create your Discord account and then return to complete your application.</strong></p>
                        <a href="https://discord.com/register" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline w-fit">
                          Click here to create a free account
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {memberType === 'junior_racing' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sim Platforms (select all that apply)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {SIM_PLATFORMS.map(p => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={form.sim_platforms.includes(p)}
                              onCheckedChange={checked => {
                                const next = checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p);
                                handleChange('sim_platforms', next);
                                if (!checked && p === 'Other') handleChange('sim_platforms_other', '');
                              }} 
                            />
                            <span className="text-sm">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {form.sim_platforms.includes('Other') && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pl-6 border-l-2 border-primary/20">
                        <Label htmlFor="sim_platforms_other" className="text-xs uppercase tracking-wider text-muted-foreground">Please specify other platform(s)</Label>
                        <Input 
                          id="sim_platforms_other" 
                          placeholder="e.g. BeamNG, Dirt Rally 2.0" 
                          value={form.sim_platforms_other} 
                          onChange={e => handleChange('sim_platforms_other', e.target.value)} 
                        />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-0.5" />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I agree to become a junior member of Full Send SimSports Inc. I understand that my parent or guardian must confirm consent to my personal information being stored for membership management purposes before my membership is activated. *
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
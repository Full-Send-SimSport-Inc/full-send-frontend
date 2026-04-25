import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Gauge,
  Heart,
  MessageSquare,
  ChevronDown,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const REGIONS = ["Oceania", "Africa", "Asia", "Europe", "North America", "South America"];

export default function JuniorMemberForm({ onBack }) {
  const [memberType, setMemberType] = useState(''); // Default to empty
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [expandedSection, setExpandedSection] = useState('membership'); // Default first section

  const [form, setForm] = useState({
    parent_name: '',
    parent_email: '',
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
    reason_for_joining: '',
    agreed_to_terms: false,
    dob: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
    if (!memberType) return setError("Please select a membership type.");
    if (!form.agreed_to_terms) return setError("You must agree to the terms to continue.");
    if (!form.dob) return setError("Please select the date of birth.");
    if (!form.region) return setError("Region is required.");
    if (form.reason_for_joining.trim().length < 20) return setError("Please provide a more detailed reason for joining (min 20 characters).");
    if (!form.country) return setError("Country is required.");
    if (form.country === 'Australia' && !form.state) return setError("State is required for Australian residents.");

    setSubmitting(true);
    setError('');

    try {
      const payload = { ...form, member_type: 'junior', sub_type: memberType };
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
      <div className="max-w-2xl mx-auto py-10 px-4">
        <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur">
          <CardContent className="pt-12 pb-12 px-6 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Application Received!</h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Thank you for applying. A confirmation email has been sent to <strong>{form.parent_email}</strong>.
                The committee will review the application once parental consent is confirmed.
              </p>
              <Button onClick={onBack} variant="outline" className="w-full max-w-sm">Return to Home</Button>
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
    form.first_name.trim() !== '' &&
    form.last_name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.dob !== '' &&
    form.reason_for_joining.trim().length >= 20 &&
    form.region !== '' &&
    form.country !== '' &&
    (form.country !== 'Australia' || form.state !== '') &&
    form.agreed_to_terms;

  const AccordionSection = ({ id, title, icon: Icon, children, badge }) => (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="font-bold text-base sm:text-lg block leading-none">{title}</span>
            {badge && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{badge}</span>}
          </div>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-200", expandedSection === id && "rotate-180")} />
      </button>
      <AnimatePresence>
        {expandedSection === id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 sm:px-6 sm:pb-8 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="max-w-2xl mx-auto py-8 sm:py-10 px-4">

      <button onClick={onBack} className="group text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors font-medium">
        <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to membership options
      </button>

      <Card className="border-0 shadow-2xl shadow-primary/5 overflow-hidden">
        <form onSubmit={handleSubmit}>

          {/* Section 1: Membership Type */}
          <AccordionSection id="membership" title="Membership Type" icon={Gauge}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <button type="button"
                onClick={() => { setMemberType('junior_racing'); setExpandedSection('parent'); }}
                className={cn("flex flex-col items-center p-5 rounded-xl border-2 transition-all gap-2",
                  memberType === 'junior_racing' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40")}>
                <Gauge className={cn("w-6 h-6", memberType === 'junior_racing' ? "text-primary" : "text-muted-foreground")} />
                <span className="font-bold text-sm">Racing Junior</span>
                <p className="text-[11px] text-muted-foreground text-center">Competing in Junior league events</p>
              </button>
              <button type="button"
                onClick={() => { setMemberType('junior_supporting'); setExpandedSection('parent'); }}
                className={cn("flex flex-col items-center p-5 rounded-xl border-2 transition-all gap-2",
                  memberType === 'junior_supporting' ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/40")}>
                <Heart className={cn("w-6 h-6", memberType === 'junior_supporting' ? "text-primary" : "text-muted-foreground")} />
                <span className="font-bold text-sm">Supporting Junior</span>
                <p className="text-[11px] text-muted-foreground text-center">Non-racing community member</p>
              </button>
            </div>
          </AccordionSection>

          {/* Section 2: Parent / Guardian Verification */}
          <AccordionSection id="parent" title="Parent / Guardian" icon={ShieldCheck} badge="Required Verification">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Name *</Label>
                  <Input value={form.parent_name} onChange={e => handleChange('parent_name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Parent Email *</Label>
                  <Input type="email" value={form.parent_email} onChange={e => handleChange('parent_email', e.target.value)} required />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight italic">
                A verification link will be sent to the parent email to confirm consent for this application.
              </p>
            </div>
          </AccordionSection>

          {/* Section 3: Junior Member Details */}
          <AccordionSection id="junior" title="Junior Member" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email Address *</Label><Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} required /></div>
              <div className="space-y-2"><Label>Phone (Optional)</Label><Input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} required className="w-full" /></div>
            </div>
          </AccordionSection>

          {/* Section 4: Recruitment */}
          <AccordionSection id="recruitment" title="Recruitment" icon={MessageSquare}>
            <div className="space-y-3">
              <Label htmlFor="reason">Why would you like to join Full Send SimSport? *</Label>
              <Textarea
                id="reason"
                placeholder="Tell us a bit about yourself..."
                value={form.reason_for_joining}
                onChange={e => handleChange('reason_for_joining', e.target.value)}
                className="min-h-[120px] resize-none text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground italic">
                This helps our committee ensure we are recruiting members who align with our community values.
              </p>
            </div>
          </AccordionSection>

          {/* Section 5: Location */}
          <AccordionSection id="location" title="Location" icon={MapPin}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Region *</Label>
                <Select value={form.region} onValueChange={handleRegionChange} required>
                  <SelectTrigger><SelectValue placeholder="Select geographic region" /></SelectTrigger>
                  <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.region && (
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select value={form.country} onValueChange={v => { handleChange('country', v); handleChange('state', ''); }} disabled={loadingCountries} required>
                    <SelectTrigger><SelectValue placeholder={loadingCountries ? "Loading..." : "Select Country"} /></SelectTrigger>
                    <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                    <Input value={form.state} onChange={e => handleChange('state', e.target.value)} placeholder="Optional" />
                  )}
                </div>
              )}
              <div className="space-y-2 sm:col-span-2"><Label>Street Address</Label><Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
              <div className="space-y-2"><Label>Postcode</Label><Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} /></div>
            </div>
          </AccordionSection>

          {/* Submission Area */}
          <div className="p-6 bg-muted/20 border-t border-border">
            <div className="flex items-start gap-3 p-4 bg-background rounded-xl border mb-6 shadow-sm">
              <Checkbox id="terms" checked={form.agreed_to_terms} onCheckedChange={v => handleChange('agreed_to_terms', v)} className="mt-1" />
              <Label htmlFor="terms" className="text-xs sm:text-sm leading-relaxed cursor-pointer font-medium">
                I agree to apply for junior membership of Full Send SimSport Inc. I understand that my parent or guardian must confirm consent for my details to be stored for membership management purposes before my application is processed. *
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting || !isFormValid} size="lg" className="w-full text-base font-bold shadow-xl shadow-primary/20">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
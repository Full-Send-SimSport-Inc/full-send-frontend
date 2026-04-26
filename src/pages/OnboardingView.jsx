import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, MessageSquare, AlertCircle, Loader2, ChevronDown, Rocket, Trophy, Globe, Heart } from 'lucide-react';
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

const AccordionSection = ({ id, title, icon: Icon, children, badge, expandedSection, toggleSection }) => (
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

export default function OnboardingView({ user, onComplete }) {
  /**
   * ENHANCED TYPE CHECK:
   * ProfileView indicates primary classification lives in member_details.member_type.
   * We search for the keyword 'supporting' across all potential type fields to
   * catch 'Supporting', 'Junior Supporting', etc.
   */
  const effectiveType = (
    user?.member_details?.member_type ||
    user?.member_type ||
    user?.sub_type ||
    user?.membership_subtype ||
    ''
  ).toLowerCase();

  const isSupporting = effectiveType.includes('supporting');

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
  const [expandedSection, setExpandedSection] = useState('discord');

  const isFormValid =
    form.discord_username.trim() !== '' &&
    form.comm_prefs.length > 0 &&
    (isSupporting || (form.sim_environment !== '' && form.racing_interests.length > 0));

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.discord_username.trim()) return setError("Please enter your Discord username.");
    if (form.comm_prefs.length === 0) return setError("Please select at least one communication preference.");

    if (!isSupporting) {
        if (!form.sim_environment) return setError("Please select your sim racing environment.");
        if (form.racing_interests.length === 0) return setError("Please select at least one racing interest.");
    }

    setError('');
    setLoading(true);

    try {
      await base44.post(`/members/self/onboarding`, form);
      onComplete();
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message;
      setError(serverMessage || "Failed to save onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-8 sm:pb-12 pt-0 px-4 w-full animate-in fade-in zoom-in-95 duration-300">
      <Card className="shadow-2xl border-primary/20 overflow-hidden p-0">
        <CardHeader className="bg-primary/5 border-b pb-6 pt-5">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            {isSupporting ? <Heart className="w-6 h-6 text-primary" /> : <Trophy className="w-6 h-6 text-primary" />}
            Welcome, {user?.display_name || user?.member_details?.first_name || 'Member'}!
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            {isSupporting
              ? "Let's finish setting up your community profile."
              : "Let's finish setting up your racing profile before you hit the track."}
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <AccordionSection
            id="discord"
            title="Identity & Contact"
            icon={MessageSquare}
            badge="Mandatory"
            expandedSection={expandedSection}
            toggleSection={toggleSection}
          >
            <div className="space-y-6">
              <div className="p-5 bg-primary/100 border border-primary/20 rounded-xl shadow-sm">
                <Label className="text-sm font-bold mb-3 block text-background uppercase tracking-wide">Discord Username *</Label>
                <Input
                  value={form.discord_username}
                  onChange={e => setForm({...form, discord_username: e.target.value})}
                  className="bg-white border-primary/20 focus-visible:ring-primary w-full"
                  placeholder="e.g. racer_44"
                  required
                />
                <p className="text-xs text-background mt-3 leading-relaxed">
                  Discord is mandatory for official team communications and community chat.
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold block">Communication Preferences *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COMM_PREFS.map(pref => (
                    <label key={pref} className={cn(
                      "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all",
                      form.comm_prefs.includes(pref) ? "bg-primary/5 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                    )}>
                      <Checkbox
                        checked={form.comm_prefs.includes(pref)}
                        onCheckedChange={(checked) => {
                          const next = checked ? [...form.comm_prefs, pref] : form.comm_prefs.filter(p => p !== pref);
                          setForm({...form, comm_prefs: next});
                        }}
                      />
                      <span className="text-xs font-medium leading-tight">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </AccordionSection>

          {!isSupporting && (
            <>
              <AccordionSection
                id="equipment"
                title="Sim Environment"
                icon={Monitor}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="space-y-4">
                  <Label className="font-bold block">What equipment do you operate with? *</Label>
                  <Select value={form.sim_environment} onValueChange={v => setForm({...form, sim_environment: v})} required>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select your setup" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIM_ENVIRONMENTS.map(env => <SelectItem key={env} value={env}>{env}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionSection>

              <AccordionSection
                id="interests"
                title="Racing Interests"
                icon={Trophy}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RACING_INTERESTS.map(interest => (
                    <label key={interest} className={cn(
                      "flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all",
                      form.racing_interests.includes(interest) ? "bg-primary/5 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                    )}>
                      <Checkbox
                        checked={form.racing_interests.includes(interest)}
                        onCheckedChange={(checked) => {
                          const next = checked ? [...form.racing_interests, interest] : form.racing_interests.filter(i => i !== interest);
                          setForm({...form, racing_interests: next});
                        }}
                      />
                      <span className="text-xs font-medium leading-tight">{interest}</span>
                    </label>
                  ))}
                </div>
              </AccordionSection>

              <AccordionSection
                id="platforms"
                title="Active Platforms"
                icon={Globe}
                expandedSection={expandedSection}
                toggleSection={toggleSection}
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SIM_PLATFORMS.map(p => (
                      <label key={p} className={cn(
                        "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all",
                        form.sim_platforms.includes(p) ? "bg-primary/5 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                      )}>
                        <Checkbox
                          checked={form.sim_platforms.includes(p)}
                          onCheckedChange={checked => {
                            const next = checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p);
                            setForm({...form, sim_platforms: next});
                            if (!checked && p === 'Other') setForm(prev => ({...prev, sim_platforms_other: ''}));
                          }}
                        />
                        <span className="text-xs font-medium leading-tight">{p}</span>
                      </label>
                    ))}
                  </div>
                  <AnimatePresence>
                    {form.sim_platforms.includes('Other') && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-2 pl-4 border-l-2 border-primary"
                      >
                        <Label htmlFor="sim_platforms_other" className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Specify Other Platforms</Label>
                        <Input
                          id="sim_platforms_other"
                          placeholder="e.g. BeamNG, KartKraft"
                          value={form.sim_platforms_other}
                          onChange={e => setForm({...form, sim_platforms_other: e.target.value})}
                          className="bg-white max-w-md"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </AccordionSection>
            </>
          )}

          <div className="p-6 sm:p-8 bg-muted/20 border-t border-border">
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 mb-6 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Saving Profile...
                </>
              ) : (
                "Complete My Profile"
              )}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-4 uppercase tracking-widest font-medium">
              Information can be updated later in your profile settings
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
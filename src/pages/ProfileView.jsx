import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Loader2, UserCircle, Lock, Unlock, ArrowLeft, Shield, MessageSquare, Monitor, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import OnboardingView from './OnboardingView';

const ROLE_WEIGHTS = {
    'administrator': 40,
    'executive_committee': 30,
    'committee': 20,
    'fs_member': 10,
    'fs_junior_member': 10,
    'subscriber': 5
};

const SIM_PLATFORMS = [
  "iRacing", "Assetto Corsa Competizione", "Assetto Corsa EVO", "Assetto Corsa Rally",
  "rFactor 2", "Automobilista 2", "Gran Turismo", "F1 Series",
  "LMU", "Project Motor Racing", "Rennsport", "Other"
];

const COMM_PREFS = ["Discord", "Twitter/X", "Instagram", "Facebook", "Bluesky", "Linkedin", "Email"];

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

export default function ProfileView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, checkLoginStatus, isLoadingAuth, refreshUser } = useAuth();

    const getWeight = (roles) => {
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return Math.max(...roleArray.map(r => ROLE_WEIGHTS[r] || 0));
    };

    const currentUserWeight = useMemo(() => getWeight(user?.roles || []), [user]);
    const isAdmin = currentUserWeight >= 20;

    // Check if editing self by comparing Member ID (Username)
    const isEditingSelf = !id || id === user?.member_details?.member_id;

    const [isLocked, setIsLocked] = useState(true);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [form, setForm] = useState({
        first_name: '', last_name: '', dob: '', status: '',
        email: '', phone: '', street_address: '', city: '', state: '', postcode: '',
        discord_username: '',
        comm_prefs: [],
        sim_environment: '',
        racing_interests: [],
        sim_platforms: [],
        sim_platforms_other: '',
        parent_name: '', parent_email: '',
        region: '', country: '', member_type: '',
        reason_for_joining: '',
        onboarding_complete: false,
        member_id: '' // For visual reference (e.g. OlorinFiresky)
    });

    const [saveStatus, setSaveStatus] = useState('idle');

    const { data: fetchedMember, isLoading: isFetching, error: fetchError } = useQuery({
        queryKey: ['member', id],
        queryFn: () => base44.get(`/members/${id}`),
        enabled: !!id && !isEditingSelf,
        retry: false
    });

    const profileData = isEditingSelf ? user?.member_details : fetchedMember;
    const isLoading = isLoadingAuth || (!!id && !isEditingSelf && isFetching);

    const canManageThisRecord = useMemo(() => {
        if (isEditingSelf) return true;
        if (!isAdmin) return false;
        const targetWeight = getWeight(profileData?.roles || 'fs_member');
        return currentUserWeight > targetWeight;
    }, [isEditingSelf, isAdmin, currentUserWeight, profileData]);

    const formatToInputDate = (dateStr) => {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return '';
    };

    useEffect(() => {
        if (profileData) {
            setForm({
                first_name: profileData.first_name || '',
                last_name: profileData.last_name || '',
                dob: formatToInputDate(profileData.dob),
                status: profileData.status || 'pending',
                email: profileData.email || '',
                phone: profileData.phone || '',
                street_address: profileData.street_address || '',
                city: profileData.city || '',
                state: profileData.state || '',
                postcode: profileData.postcode || '',
                discord_username: profileData.discord_username || '',
                comm_prefs: Array.isArray(profileData.comm_prefs) ? profileData.comm_prefs : ['Email'],
                sim_environment: profileData.sim_environment || '',
                racing_interests: Array.isArray(profileData.racing_interests) ? profileData.racing_interests : [],
                sim_platforms: Array.isArray(profileData.sim_platforms) ? profileData.sim_platforms : [],
                sim_platforms_other: profileData.sim_platforms_other || '',
                parent_name: profileData.parent_name || '',
                parent_email: profileData.parent_email || '',
                region: profileData.region || '',
                country: profileData.country || '',
                member_type: profileData.member_type || '',
                reason_for_joining: profileData.reason_for_joining || '',
                onboarding_complete: !!profileData.onboarding_complete,
                member_id: profileData.member_id || ''
            });
            setHasChanges(false);
        }
    }, [profileData, isEditingSelf]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const processSubmit = async () => {
        setSaveStatus('saving');
        setShowSaveConfirm(false);
        try {
            if (isEditingSelf) {
                await base44.post('/update-me', form);
                await checkLoginStatus();
            } else {
                await base44.post(`/members/${id}`, form);
                queryClient.invalidateQueries(['member', id]);
            }
            toast.success('Profile updated successfully!');
            setSaveStatus('success');
            setIsLocked(true);
            setHasChanges(false);
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile.');
            setSaveStatus('error');
        }
    };

    if (fetchError?.response?.status === 403) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 text-center bg-white rounded-xl shadow-lg border">
                <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-6">You do not have the required rank to edit this profile.</p>
                <Button onClick={() => navigate('/admin/members')}>Return to Directory</Button>
            </div>
        );
    }

    if (user && user.onboarding_complete === false && isEditingSelf) {
        return <OnboardingView user={user} onComplete={refreshUser} />;
    }

    if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    const isFormValid = form.first_name.trim() !== '' && form.last_name.trim() !== '' && form.email.trim() !== '';

    // --- SECTIONS DEFINITION ---

    const IdentitySection = (
        <div key="sec-identity" className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed relative">
            <div className="absolute top-2 right-2 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                {(!canManageThisRecord || isEditingSelf) ? <><Lock className="w-3 h-3" /> Identity Locked</> : <><Unlock className="w-3 h-3 text-green-600" /> Identity Editable</>}
            </div>
            <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} disabled={isLocked || isEditingSelf} /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} disabled={isLocked || isEditingSelf} /></div>
            <div className="space-y-2"><Label>Date of Birth *</Label><Input type="date" value={form.dob} onChange={e => handleChange('dob', e.target.value)} disabled={isLocked || isEditingSelf} /></div>
            {isAdmin && !isEditingSelf && (
                <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={form.status} onValueChange={val => handleChange('status', val)} disabled={isLocked}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );

    const JuniorSection = form.member_type === 'junior' ? (
        <div key="sec-junior" className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-primary"><Shield className="w-5 h-5" /><h3 className="font-semibold text-lg">Parent Details</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary/5 p-4 rounded-lg">
                <div className="space-y-2"><Label>Parent Name *</Label><Input value={form.parent_name} onChange={e => handleChange('parent_name', e.target.value)} disabled={isLocked || isEditingSelf} /></div>
                <div className="space-y-2"><Label>Parent Email *</Label><Input value={form.parent_email} onChange={e => handleChange('parent_email', e.target.value)} disabled={isLocked || isEditingSelf} /></div>
            </div>
        </div>
    ) : null;

    const ContactSection = (
        <div key="sec-contact" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2"><Label>Email Address *</Label><Input value={form.email} onChange={e => handleChange('email', e.target.value)} disabled={isLocked} /></div>
            <div className="space-y-2"><Label>Discord Username *</Label><Input value={form.discord_username} onChange={e => handleChange('discord_username', e.target.value)} disabled={isLocked} /></div>
        </div>
    );

    const LocationSection = (
        <div key="sec-location" className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg text-primary">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Region</Label><Input value={form.region} onChange={e => handleChange('region', e.target.value)} disabled={isLocked} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => handleChange('country', e.target.value)} disabled={isLocked} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Street Address</Label><Input value={form.street_address} onChange={e => handleChange('street_address', e.target.value)} disabled={isLocked} /></div>
                <div className="space-y-2"><Label>City / Suburb</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} disabled={isLocked} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => handleChange('state', e.target.value)} disabled={isLocked} /></div>
                <div className="space-y-2"><Label>Postcode</Label><Input value={form.postcode} onChange={e => handleChange('postcode', e.target.value)} disabled={isLocked} /></div>
            </div>
        </div>
    );

    const RecruitmentSection = (
        <div key="sec-recruitment" className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-primary"><Shield className="w-5 h-5" /><h3 className="font-semibold text-lg">Recruitment & Mission Alignment</h3></div>
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-dashed relative">
                <div className="absolute top-2 right-2 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    {(!canManageThisRecord || isEditingSelf) ? <><Lock className="w-3 h-3" /> Field Locked</> : <><Unlock className="w-3 h-3 text-green-600" /> Field Editable</>}
                </div>
                <Label>Why did you join Full Send SimSport?</Label>
                <Textarea value={form.reason_for_joining} onChange={e => handleChange('reason_for_joining', e.target.value)} disabled={isLocked || isEditingSelf} className="min-h-[100px] bg-white resize-none" />
                <p className="text-[10px] text-muted-foreground italic">Note: This is provided during application for committee review.</p>
            </div>
        </div>
    );

    const CommPrefsSection = (
        <div key="sec-comm" className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-primary"><MessageSquare className="w-5 h-5" /><h3 className="font-semibold text-lg">Communication Preferences *</h3></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg">
                {COMM_PREFS.map(pref => (
                    <label key={pref} className={cn("flex items-center gap-2 cursor-pointer group", isLocked && "pointer-events-none")}>
                        <Checkbox disabled={isLocked} checked={form.comm_prefs.includes(pref)} onCheckedChange={(checked) => {
                            const next = checked ? [...form.comm_prefs, pref] : form.comm_prefs.filter(p => p !== pref);
                            handleChange('comm_prefs', next);
                        }}/>
                        <span className="text-sm group-hover:text-primary">{pref}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    const SimRacingSection = (
        <div key="sec-sim" className="space-y-6 pt-4 border-t">
            <h3 className="font-semibold text-lg text-primary">Sim Racing Profile</h3>
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Sim Environment *</Label>
                <Input disabled={isLocked} placeholder="e.g. PC with wheel and pedals" value={form.sim_environment} onChange={e => handleChange('sim_environment', e.target.value)} />
            </div>
            <div className="space-y-3">
                <Label>Racing Interests *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RACING_INTERESTS.map(interest => (
                        <label key={interest} className={cn("flex items-start gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded border", isLocked && "pointer-events-none")}>
                            <Checkbox disabled={isLocked} checked={form.racing_interests.includes(interest)} onCheckedChange={(checked) => {
                                const next = checked ? [...form.racing_interests, interest] : form.racing_interests.filter(i => i !== interest);
                                handleChange('racing_interests', next);
                            }}/>
                            <span className="text-[11px] leading-tight">{interest}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <Label>Platforms & Software</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SIM_PLATFORMS.map(p => (
                        <label key={p} className={cn("flex items-center gap-2 cursor-pointer group", isLocked && "pointer-events-none")}>
                            <Checkbox disabled={isLocked} checked={form.sim_platforms.includes(p)} onCheckedChange={checked => {
                                const next = checked ? [...form.sim_platforms, p] : form.sim_platforms.filter(x => x !== p);
                                handleChange('sim_platforms', next);
                                if (!checked && p === 'Other') handleChange('sim_platforms_other', '');
                            }} />
                            <span className="text-sm group-hover:text-primary">{p}</span>
                        </label>
                    ))}
                </div>
                {form.sim_platforms.includes("Other") && (
                    <Input disabled={isLocked} placeholder="Specify other platforms" value={form.sim_platforms_other} onChange={e => handleChange('sim_platforms_other', e.target.value)} className="mt-2" />
                )}
            </div>
        </div>
    );

    const orderedSections = [
        IdentitySection,
        JuniorSection,
        ContactSection,
        LocationSection,
        RecruitmentSection,
        CommPrefsSection,
        SimRacingSection
    ].filter(Boolean);

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

            <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Update</AlertDialogTitle><AlertDialogDescription>Are you sure you want to save these changes?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={processSubmit}>Save Changes</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle className="text-destructive">Discard Changes?</AlertDialogTitle><AlertDialogDescription>All unsaved changes will be lost.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Stay & Edit</AlertDialogCancel><AlertDialogAction onClick={() => { setIsLocked(true); setHasChanges(false); setShowCancelConfirm(false); }} className="bg-destructive">Discard Changes</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {!isEditingSelf && <Button variant="ghost" onClick={() => navigate('/admin/members')} className="pl-0"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>}
                    <h2 className="text-2xl font-bold tracking-tight">{isEditingSelf ? 'My Profile' : 'Edit Member'}</h2>
                </div>
                {canManageThisRecord && (
                    <Button variant={isLocked ? "outline" : "destructive"} onClick={() => isLocked ? setIsLocked(false) : (hasChanges ? setShowCancelConfirm(true) : setIsLocked(true))} className="gap-2">
                        {isLocked ? <><Unlock className="w-4 h-4" /> Unlock for Editing</> : <><Lock className="w-4 h-4" /> Cancel & Lock</>}
                    </Button>
                )}
            </div>

            <main className="flex-1 max-w-3xl w-full mx-auto space-y-6">
                <div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center"><UserCircle className="w-10 h-10" /></div>
                        <div>
                            <h1 className="text-2xl font-bold leading-none mb-1">{form.first_name} {form.last_name}</h1>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="capitalize">{form.member_type || 'Member'}</span>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", form.status === 'active' ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200")}>
                                    {form.status || 'pending'}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Member Reference</span>
                        <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-mono text-sm font-bold">
                            <Hash className="w-3 h-3 text-slate-400" />
                            {form.member_id}
                        </div>
                    </div>
                </div>

                <Card className={cn("transition-all", isLocked ? "opacity-95 shadow-sm" : "ring-2 ring-primary/20 shadow-lg")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Member Information</CardTitle>
                        {isLocked && <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Record Locked</span>}
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col space-y-8">

                            {orderedSections}

                            <Button
                                onClick={() => setShowSaveConfirm(true)}
                                disabled={saveStatus === 'saving' || !isFormValid || isLocked}
                                className="w-full h-12 text-lg"
                            >
                                {saveStatus === 'saving' ? 'Saving...' : 'Save Profile Changes'}
                            </Button>
                            {isLocked && <p className="text-center text-xs text-muted-foreground italic">Unlock the record to enable editing.</p>}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
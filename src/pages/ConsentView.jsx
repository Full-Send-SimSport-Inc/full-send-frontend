import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, XCircle } from 'lucide-react';

export default function ConsentView() {
    const { id, token } = useParams();
    const [status, setStatus] = useState('idle'); // idle, processing, success, error, declined
    const [message, setMessage] = useState('');

    const handleConsent = async (action) => {
        setStatus('processing');
        try {
            const response = await base44.post('/parental-consent', {
                id: id,
                token: token,
                action: action // 'approve' or 'decline'
            });
            
            if (response.success) {
                setStatus(action === 'approve' ? 'success' : 'declined');
                setMessage(response.message);
            }
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'This consent link is invalid or has expired.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Parental Consent</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6 pt-4">
                    
                    {status === 'idle' && (
                        <div className="space-y-6">
                            <p className="text-slate-600">
                                You are reviewing a Junior Membership application for your child. Please select an option below to proceed.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button onClick={() => handleConsent('approve')} className="w-full bg-green-600 hover:bg-green-700 text-lg h-12">
                                    <CheckCircle2 className="w-5 h-5 mr-2" /> I Consent to this Application
                                </Button>
                                <Button onClick={() => handleConsent('decline')} variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive text-lg h-12">
                                    <XCircle className="w-5 h-5 mr-2" /> I Do Not Consent
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="py-8 flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-muted-foreground font-medium">Recording your decision...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-4 space-y-4">
                            <div className="flex justify-center"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
                            <h3 className="text-xl font-semibold text-slate-900">Consent Provided</h3>
                            <p className="text-slate-600">{message || "Thank you. The application has been forwarded to our committee."}</p>
                        </div>
                    )}

                    {status === 'declined' && (
                        <div className="py-4 space-y-4">
                            <div className="flex justify-center"><XCircle className="w-16 h-16 text-destructive" /></div>
                            <h3 className="text-xl font-semibold text-slate-900">Consent Declined</h3>
                            <p className="text-slate-600">{message || "You have declined consent. The application has been cancelled and the applicant will be notified."}</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-4 space-y-4">
                            <div className="flex justify-center"><AlertCircle className="w-16 h-16 text-destructive" /></div>
                            <h3 className="text-xl font-semibold text-slate-900">Verification Failed</h3>
                            <p className="text-slate-600">{message}</p>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
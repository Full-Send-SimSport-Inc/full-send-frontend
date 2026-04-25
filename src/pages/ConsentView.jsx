import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <Card className="shadow-2xl border-0 overflow-hidden">
                    <CardHeader className="text-center pb-6 pt-8 bg-primary/5 border-b">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-primary/10">
                                <ShieldCheck className="w-8 h-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Parental Consent</CardTitle>
                        <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-1">
                            Junior Membership Verification
                        </p>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-10">
                        <AnimatePresence mode="wait">
                            {status === 'idle' && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-sm leading-relaxed text-slate-600">
                                        "You are reviewing a Junior Membership application for your child to join the Full Send SimSport community. This requires your verified authorization to proceed."
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Button
                                            onClick={() => handleConsent('approve')}
                                            className="w-full bg-green-600 hover:bg-green-700 text-base font-bold h-14 shadow-lg shadow-green-600/20"
                                        >
                                            <CheckCircle2 className="w-5 h-5 mr-2" /> I Consent to this Application
                                        </Button>
                                        <Button
                                            onClick={() => handleConsent('decline')}
                                            variant="outline"
                                            className="w-full text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive font-bold h-14"
                                        >
                                            <XCircle className="w-5 h-5 mr-2" /> I Do Not Consent
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {status === 'processing' && (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="py-12 flex flex-col items-center gap-4"
                                >
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs">Recording decision...</p>
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-6 text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">Application Approved</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {message || "Thank you. Your consent has been recorded and the application has been forwarded to our committee for final review."}
                                    </p>
                                </motion.div>
                            )}

                            {status === 'declined' && (
                                <motion.div
                                    key="declined"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-6 text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <XCircle className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">Application Declined</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {message || "You have declined consent. The application has been cancelled and the applicant has been notified."}
                                    </p>
                                </motion.div>
                            )}

                            {status === 'error' && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-6 text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">Link Invalid</h3>
                                    <p className="text-slate-600 leading-relaxed">{message}</p>
                                    <div className="pt-4">
                                        <p className="text-xs text-muted-foreground italic">
                                            If you believe this is an error, please contact the Full Send SimSport committee.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function SetupAccount() {
  // Grab params from URL
  const { id, memberId, email } = useParams();
  const finalId = id || memberId;

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await base44.post('/setup-account', {
        member_id: finalId,
        email: email,
        password: formData.password
      });

      setStatus('success');

      // Redirect to custom login logic after delay
      setTimeout(() => {
        window.location.href = window.location.origin + '/portal/?setup_done=1';
      }, 3000);

    } catch (err) {
      console.error('Setup failed:', err);
      setStatus('error');
      setErrorMessage(err.message || "Failed to create account. Please try again.");
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-50 p-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <Card className="shadow-2xl border-0 p-8 sm:p-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Account Ready!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your login has been created and you are being automatically signed in as <br/>
              <span className="text-foreground font-bold">{email}</span>.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
               <Loader2 className="w-5 h-5 animate-spin text-primary" />
               <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Redirecting to portal...</p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-50 p-4 pt-12 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8 px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-primary/10">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Activate Account</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Set a secure password for <span className="text-foreground font-semibold">{email}</span>
          </p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-center text-primary">
              Security Credentials
            </p>
          </CardHeader>
          <CardContent className="p-6 sm:p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password font-bold">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="h-12 bg-slate-50 pr-12 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground ml-1 italic">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword font-bold">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={cn(
                    "h-12 bg-slate-50 transition-colors focus:bg-white",
                    formData.confirmPassword && formData.password !== formData.confirmPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="font-medium">{errorMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  'Activate Account'
                )}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-tighter font-medium opacity-60">
                Full Send SimSport Member Security
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
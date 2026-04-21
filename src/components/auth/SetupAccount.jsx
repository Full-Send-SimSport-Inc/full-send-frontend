import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function SetupAccount() {
  // Grab params from URL. We destructure 'email' directly so it's defined for the JSX below.
  const { id, memberId, email } = useParams();
  
  // Create a fallback for the ID in case the route uses different naming
  const finalId = id || memberId;

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
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
      // FIX: Aligning payload keys with PHP expectations
      const response = await base44.post('/setup-account', {
        member_id: finalId, // PHP expects member_id
        email: email,       // From useParams
        password: formData.password
      });

      setStatus('success');
      
      // NEW: Redirect to our custom login page after a short delay
      setTimeout(() => {
        // This triggers the PHP logic to check roles and steer to #/admin or #/my-profile
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
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto py-16 px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Account Ready!</h2>
        <p className="text-muted-foreground mb-8">
          Your login has been created and you have been automatically signed in as <strong>{email}</strong>.
        </p>
        <Button className="w-full" onClick={() => window.location.href = '/portal/?setup_done=1'}>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto py-12 px-6">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Activate Your Account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Set a password for <strong>{email}</strong> to access your Full Send SimSport Member Portal.
        </p>
      </div>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full py-6 text-lg" 
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Activating account...</>
              ) : (
                'Activate Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
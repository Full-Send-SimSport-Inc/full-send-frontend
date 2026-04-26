import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const key = searchParams.get('key');
  const login = searchParams.get('login');

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/wp-json/full-send/v1/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, login, password }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to reset password. Link may be expired.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!key || !login) {
    return <div className="text-center p-10">Invalid reset link.</div>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-auto">
        <Card className="shadow-2xl border-primary/10 overflow-hidden p-0">
          <CardHeader className="bg-primary/5 border-b pb-8 pt-8">
            <CardTitle className="text-3xl font-black text-center">Set New Password</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-10">
            {success ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-bold">Password Updated!</p>
                <Button className="w-full" onClick={() => navigate('/login')}>Back to Sign In</Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : 'Update Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
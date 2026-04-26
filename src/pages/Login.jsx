import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { checkLoginStatus } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log("DEBUG: Starting login attempt for:", email);

    try {
      const response = await fetch('/wp-login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          log: email,
          pwd: password,
          'wp-submit': 'Log In',
          'testcookie': '1'
        }),
      });

      console.log("DEBUG: Login Response Status:", response.status);

      // Slight delay to allow browser to save the WordPress cookie
      if (response.status === 200 || response.ok) {
        console.log("DEBUG: Login appears successful, redirecting...");
        setTimeout(() => {
          window.location.href = window.location.origin + '/portal/?login_success=1';
        }, 500);
      } else {
        setError("Invalid email or password. Please try again.");
      }

    } catch (err) {
      console.error("DEBUG: Login Error:", err);
      setError("A connection error occurred. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto"
      >
        <Card className="shadow-2xl border-primary/10 overflow-hidden p-0">
          <CardHeader className="space-y-1 pb-8 pt-8 bg-primary/5 border-b">
            <div className="flex justify-center mb-2">
            </div>
            <CardTitle className="text-3xl font-black text-center tracking-tight">Sign In</CardTitle>
            <p className="text-center text-sm text-muted-foreground font-medium">
              Access your Full Send SimSport profile
            </p>
          </CardHeader>

          <CardContent className="pt-8 px-6 sm:px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-5">

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold ml-1">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>

              <div className="text-center mt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  Secure Member Access
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
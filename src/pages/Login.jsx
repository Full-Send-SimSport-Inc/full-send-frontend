import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // States for Password Reset functionality
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { checkLoginStatus } = useAuth();
  const navigate = useNavigate();

  // --- Fixed Login Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log("DEBUG: Starting login attempt for:", email);

    try {
      // We use credentials: 'include' to ensure WordPress cookies are set in the browser
      const response = await fetch('/wp-login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          log: email,
          pwd: password,
          'wp-submit': 'Log In',
          'testcookie': '1',
          'redirect_to': window.location.origin + '/portal/?login_success=1'
        }),
      });

      console.log("DEBUG: Final Response URL:", response.url);

      if (response.ok && !response.url.includes('wp-login.php')) {
        console.log("DEBUG: Login successful, redirecting...");
        // Wait a moment for cookies to settle then refresh into the portal
        setTimeout(() => {
          window.location.href = window.location.origin + '/portal/?login_success=1';
        }, 500);
      } else {
        console.warn("DEBUG: Login failed - invalid credentials.");
        setError("Invalid email or password. Please try again.");
      }

    } catch (err) {
      console.error("DEBUG: Login Error:", err);
      setError("A connection error occurred. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  // --- Password Reset Logic ---
  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/wp-json/full-send/v1/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResetSuccess(true);
      } else {
        setError("Could not process reset request. Please try again later.");
      }
    } catch (err) {
      setError("A connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /**
     * FIX: Changed items-center to items-start on mobile to pull content up.
     * Changed min-h-[80vh] to a more flexible min-h-0 on mobile.
     */
    <div className="min-h-0 md:min-h-[80vh] flex items-start md:items-center justify-center bg-slate-50 p-4 pt-4 md:pt-0">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto"
      >
        <Card className="shadow-2xl border-primary/10 overflow-hidden p-0">
          <CardHeader className="space-y-1 pb-6 pt-6 md:pb-8 md:pt-8 bg-primary/5 border-b">
            <div className="flex justify-center mb-2"></div>
            <CardTitle className="text-2xl md:text-3xl font-black text-center tracking-tight">
              {isResetMode ? 'Reset Password' : 'Sign In'}
            </CardTitle>
            <p className="text-center text-sm text-muted-foreground font-medium px-2">
              {isResetMode
                ? 'Enter your email to receive a reset link'
                : 'Access your Full Send SimSport profile'}
            </p>
          </CardHeader>

          <CardContent className="pt-6 px-6 sm:px-10 pb-8 md:pb-10">
            <AnimatePresence mode="wait">
              {resetSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="flex justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <p className="font-medium text-slate-700">Check your inbox!</p>
                  <p className="text-sm text-muted-foreground">
                    If an account exists for {email}, you will receive a reset link shortly.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setResetSuccess(false);
                      setIsResetMode(false);
                    }}
                  >
                    Back to Login
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={isResetMode ? handleResetRequest : handleSubmit}
                  className="space-y-5"
                >
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

                  {!isResetMode && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setIsResetMode(true)}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
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
                  )}

                  <div className="pt-2 space-y-3">
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {isResetMode ? 'Sending Link...' : 'Authenticating...'}
                        </>
                      ) : (
                        isResetMode ? 'Send Reset Link' : 'Sign In'
                      )}
                    </Button>

                    {isResetMode && (
                      <button
                        type="button"
                        className="w-full flex items-center justify-center py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsResetMode(false)}
                        disabled={loading}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                      </button>
                    )}
                  </div>

                  <div className="text-center mt-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      Secure Member Access
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
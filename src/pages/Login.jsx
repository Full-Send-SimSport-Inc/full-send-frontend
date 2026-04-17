import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkLoginStatus } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Authenticate with WordPress
      const response = await fetch('/wp-login.php', {
        method: 'POST',
        body: new URLSearchParams({ 
          log: email, 
          pwd: password, 
          'wp-submit': 'Log In',
          'testcookie': '1' 
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // 2. Hard Refresh to the portal root
      // We do NOT call checkLoginStatus() here because it will trigger the 403 error.
      // By redirecting to /portal/, your PHP admin_init will see the fresh login 
      // cookie and redirect the browser to /#/admin or /#/my-profile automatically.
      
      if (response.ok) {
        window.location.href = window.location.origin + '/portal/';
      } else {
        throw new Error("Invalid login");
      }

    } catch (err) {
      console.error("Login error:", err);
      // If you have an setError state, use it here
      if (typeof setError === 'function') setError("Login failed. Check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Member Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
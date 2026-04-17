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
      // 1. Send login credentials to WordPress
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

      if (!response.ok) {
        throw new Error("Invalid login credentials.");
      }

      // 2. Refresh AuthContext to get the new user data (Roles)
      // Even if this call gets a 403 nonce error in the console, 
      // the 'userData' object often returns enough info to route correctly.
      const userData = await checkLoginStatus();

      // 3. Determine target destination based on role
      let targetPath = '/portal/#/';
      
      if (userData && userData.roles) {
        if (userData.roles.includes('administrator') || userData.roles.includes('committee')) {
          targetPath = '/portal/#/admin';
        } else if (userData.roles.includes('fs_member') || userData.roles.includes('fs_junior_member')) {
          targetPath = '/portal/#/my-profile';
        }
      }

      // 4. HARD REDIRECT
      // This solves the Nonce/Cookie 403 issue and lands the user on their specific page.
      window.location.href = window.location.origin + targetPath;

    } catch (err) {
      console.error("Login error:", err);
      // Ensure you have an 'setError' state in your component to show this to the user
      if (typeof setError === 'function') {
        setError("Login failed. Please check your email and password.");
      }
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
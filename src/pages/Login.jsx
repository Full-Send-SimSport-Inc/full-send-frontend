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

      // 2. We don't check the JSON response (as wp-login returns HTML)
      // We just check if the request was successful
      if (response.ok) {
        // We need to check the user role to decide the destination
        // We can't use 'base44.get' yet because of the nonce issue, 
        // so we use a small trick: reload to the specific hash we want.

        // Note: For non-admins, the PHP above will 'override' this and force them 
        // to their correct spot. For Admins, this will set their landing spot.
        
        let target = '/portal/#/admin'; // Default destination for Committee/Admins
        
        // If you want to be even more precise, you could fetch user info here,
        // but simply reloading to the portal root is often enough if PHP is tuned.
        
        window.location.href = window.location.origin + target;
        
        // This force reloads the page at the /#/admin address, 
        // refreshing the nonce and landing you in the Admin Dashboard.
      }
      } else {
        throw new Error("Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      // Add an error state to your UI here if you wish
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
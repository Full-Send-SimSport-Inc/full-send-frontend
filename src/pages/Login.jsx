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

      // We use a slight delay to allow the browser to save the WordPress cookie
      if (response.status === 200 || response.ok) {
        console.log("DEBUG: Login appears successful, redirecting...");
        setTimeout(() => {
          window.location.href = window.location.origin + '/portal/?login_success=1';
        }, 500);
      } else {
        throw new Error("Invalid login status: " + response.status);
      }

    } catch (err) {
      console.error("DEBUG: Login Error:", err);
      alert("Login failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 1. Changed items-center to items-start (pushes content to top)
       2. Added pt-20 (padding-top) to keep it from hitting the very top edge
       3. md:pt-32 adds even more space on larger screens for a better "upper-third" look
    */
    <div className="min-h-screen flex items-start justify-center bg-slate-50 p-4 pt-20 md:pt-32">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
             <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-6 h-6 text-primary" />
             </div>
          </div>
          <CardTitle className="text-2xl text-center">Member Portal</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Enter your credentials to access your profile
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="name@example.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
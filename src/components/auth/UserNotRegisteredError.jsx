import React from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserNotRegisteredError = ({ memberId, email }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-orange-100">
            <ShieldAlert className="w-10 h-10 text-orange-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
          <p className="text-slate-600 mb-8">
            You must be logged in with an authorized account to access this area.
          </p>

          <div className="space-y-4">
            {/* OPTION 1: Login (For existing users) */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-left">
              <div className="flex gap-4">
                <LogIn className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">Sign In</p>
                  <p className="text-xs text-slate-600 mb-3">Already have an account? Log in to access the portal.</p>
                  <Button asChild className="w-full justify-between">
                    <Link to="/login">
                      Go to Login
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* OPTION 2: Setup Account (For new approvals) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex gap-4">
                <KeyRound className="w-5 h-5 text-slate-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">First time here?</p>
                  <p className="text-xs text-slate-600 mb-3">If you're a new member, you'll need to set your password first.</p>
                  
                  <Button asChild className="w-full justify-between" variant="outline">
                    <Link to={memberId && email ? `/setup-account/${memberId}/${email}` : "/"}>
                      Setup My Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/" className="text-sm text-slate-500 hover:text-primary transition-colors">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
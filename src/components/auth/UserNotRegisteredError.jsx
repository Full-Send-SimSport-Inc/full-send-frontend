import React from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
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
            We couldn't find an active user account for your email. You must be an approved member to access this area.
          </p>

          <div className="space-y-4">
            {/* NEW: Setup Account Call to Action */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-left">
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Already a member?</p>
                  <p className="text-xs text-slate-600 mb-3">If you have been approved but haven't set a password yet, you can do that now.</p>
                  
                  {/* If we have the details, link directly. Otherwise, link to a general setup or join page */}
                  <Button asChild className="w-full justify-between" variant="outline">
                    <Link to={memberId && email ? `/setup-account/${memberId}/${email}` : "/"}>
                      Setup My Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Help Text */}
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-left">
              <p className="font-medium mb-2 text-slate-700">Still having trouble?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verify you used the correct email address</li>
                <li>Contact a Full Send admin for assistance</li>
                <li>Try logging out and back in again</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
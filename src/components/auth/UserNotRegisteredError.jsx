import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ShieldAlert, ArrowRight, LogIn, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const UserNotRegisteredError = ({ memberId, email }) => {
  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-50 p-4 pt-16 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-2xl border-0 overflow-hidden">
          {/* Header Area */}
          <div className="bg-orange-50/50 border-b border-orange-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-3xl bg-white shadow-sm border border-orange-100">
              <ShieldAlert className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Authorized personnel only
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <p className="text-center text-slate-600 text-sm leading-relaxed">
              You must be logged in with an authorized account to access this area. Please choose an option below to continue.
            </p>

            <div className="space-y-4">
              {/* OPTION 1: Login */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-5 bg-primary/5 rounded-2xl border border-primary/10 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <LogIn className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-base leading-none mb-1">Sign In</p>
                    <p className="text-xs text-slate-500 mb-4 leading-snug">Already have an account? Log in to access the portal.</p>
                    <Button asChild className="w-full h-11 font-bold group shadow-md shadow-primary/10">
                      <Link to="/login">
                        Go to Login
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* OPTION 2: Setup Account */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-base leading-none mb-1">First time here?</p>
                    <p className="text-xs text-slate-500 mb-4 leading-snug">If you're a new member, you'll need to set your password first.</p>

                    <Button asChild className="w-full h-11 font-bold group" variant="outline">
                      <Link to={memberId && email ? `/setup-account/${memberId}/${email}` : "/"}>
                        Setup My Account
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="pt-4 flex justify-center">
              <Button asChild variant="ghost" className="text-slate-500 hover:text-primary transition-colors">
                <Link to="/" className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold">
                  <Home className="w-3 h-3" />
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-semibold">
          Full Send SimSport • Member Security System
        </p>
      </motion.div>
    </div>
  );
};

export default UserNotRegisteredError;
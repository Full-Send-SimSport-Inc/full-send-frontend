import React from 'react';
import JoinHero from '../components/join/JoinHero';
import JoinForm from '../components/join/JoinForm';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Join() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero and Form components should handle their own internal padding/margins */}
      <JoinHero />
      <JoinForm />

      {/* Responsive Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground space-y-4">
        <p>© {new Date().getFullYear()} Full Send SimSport Inc. All rights reserved.</p>

        <div className="flex flex-wrap justify-center items-center gap-y-2 gap-x-4">
          <Link
            to="/meetings"
            className="text-muted-foreground inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            View General Meetings
          </Link>

          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Lock className="w-3 h-3" />
            Committee Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
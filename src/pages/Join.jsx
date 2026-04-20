import React from 'react';
import JoinHero from '../components/join/JoinHero';
import JoinForm from '../components/join/JoinForm';
import { Link } from 'react-router-dom';
import { Lock, CalendarDays } from 'lucide-react';

export default function Join() {
  return (
    <div className="min-h-screen bg-background">
      <JoinHero />
      <JoinForm />
      <footer className="text-center py-8 text-xs text-muted-foreground space-y-2">
        <p>© {new Date().getFullYear()} Full Send SimSport Inc. All rights reserved.</p>
        <Link
          to="/meetings" className="text-muted-foreground mx-3 inline-flex items-center gap-1.5 hover:text-primary transition-colors">View General Meetings




        </Link>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
          
          <Lock className="w-3 h-3" />
          Committee Login
        </Link>
      </footer>
    </div>);

}
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
    </div>
  );
}
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Heart, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdultMemberForm from './AdultMemberForm';
import JuniorMemberForm from './JuniorMemberForm';

const options = [
  {
    key: 'adult',
    icon: User,
    title: 'Adult Membership',
    subtitle: '18 and over',
    description: 'Choose between a Racing Member (active competitor) or Supporting Member (non-racing supporter/parent/guardian).',
    color: 'text-primary'
  },
  {
    key: 'junior',
    icon: Users,
    title: 'Junior Membership',
    subtitle: 'Under 18',
    description: 'For young racers under 18. Requires a parent or guardian who is already a registered Full Send SimSports member.',
    color: 'text-secondary-foreground'
  }
];

export default function JoinForm() {
  const [selected, setSelected] = useState(null);

  if (selected === 'adult') return <AdultMemberForm onBack={() => setSelected(null)} />;
  if (selected === 'junior') return <JuniorMemberForm onBack={() => setSelected(null)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="max-w-2xl mx-auto py-12 px-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Membership Type</h2>
        <p className="text-muted-foreground">Choose the membership that applies to you to get started.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {options.map(opt => {
          const Icon = opt.icon;
          return (
            <button key={opt.key} onClick={() => setSelected(opt.key)}
              className={cn(
                "text-left p-6 rounded-2xl border-2 bg-card shadow-lg shadow-primary/5 transition-all hover:shadow-xl hover:border-primary/60 hover:-translate-y-0.5",
                "border-border"
              )}>
              <div className={cn("w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4")}>
                <Icon className={cn("w-6 h-6", opt.color)} />
              </div>
              <p className="font-bold text-lg">{opt.title}</p>
              <p className="text-xs font-medium text-muted-foreground mb-2">{opt.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{opt.description}</p>
              <div className="mt-4 text-sm font-semibold text-primary flex items-center gap-1">
                Get started →
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
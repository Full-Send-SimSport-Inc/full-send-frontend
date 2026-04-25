import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Users } from 'lucide-react';
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
    description: 'For young racers or supporters under 18. Requires a parent or guardian who is already a registered Full Send SimSports member.',
    color: 'text-secondary-foreground'
  }
];

export default function JoinForm() {
  const [selected, setSelected] = useState(null);

  if (selected === 'adult') return <AdultMemberForm onBack={() => setSelected(null)} />;
  if (selected === 'junior') return <JuniorMemberForm onBack={() => setSelected(null)} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-2xl mx-auto py-8 sm:py-12 px-4 sm:px-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Select Membership Type</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
          Choose the membership that applies to you to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {options.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              className={cn(
                "group text-left p-6 rounded-2xl border-2 bg-card shadow-lg shadow-primary/5 transition-all duration-200",
                "hover:shadow-xl hover:border-primary/60 active:scale-[0.98] sm:hover:-translate-y-1",
                "border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/20")}>
                <Icon className={cn("w-6 h-6", opt.color)} />
              </div>

              <p className="font-bold text-lg sm:text-xl mb-0.5">{opt.title}</p>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">{opt.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {opt.description}
              </p>

              <div className="mt-auto text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                Get started <span className="text-base">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
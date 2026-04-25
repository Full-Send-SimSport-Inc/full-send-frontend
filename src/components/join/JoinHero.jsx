import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Trophy } from 'lucide-react';

export default function JoinHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent py-10 sm:py-16 px-4 sm:px-6 text-white">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-accent rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-2xl mx-auto text-center"
      >
        {/* Title - Reduced margin-bottom */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2 leading-tight">
          Join Our Team
        </h1>

        {/* Subtitle - Reduced margin-bottom on desktop */}
        <p className="text-sm sm:text-lg text-white/80 max-w-lg mx-auto mb-6 sm:mb-4 px-2">
          Register using the options below to become an official member and part of a great team at Full Send SimSport!
        </p>

        {/* Inline Feature Tags */}
        <div className="flex flex-row items-center justify-center gap-3 sm:gap-8 text-[10px] sm:text-sm text-white/70 uppercase tracking-wider font-bold">
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Official</span>
          </div>

          <div className="w-1 h-1 bg-white/30 rounded-full sm:hidden" /> {/* Small separator dot on mobile */}

          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Compete</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
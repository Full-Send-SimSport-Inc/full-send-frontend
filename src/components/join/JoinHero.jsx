import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Flag, Trophy } from 'lucide-react';

export default function JoinHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent py-12 sm:py-20 px-4 sm:px-6 text-white">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-accent rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-2xl mx-auto text-center"
      >

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 leading-[1.1]">
          Join Our Team
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/80 max-w-lg mx-auto mb-8 px-2">
          Become an official member of Full Send SimSport Inc. Fill in your details below to become a part of a great team.
        </p>

        {/* Feature Tags */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-white/70">
          <div className="flex items-center gap-2 py-1 px-3 sm:p-0 bg-white/5 sm:bg-transparent rounded-full sm:rounded-none border border-white/5 sm:border-0">
            <Flag className="w-4 h-4 text-white" />
            <span className="font-medium">Official Membership</span>
          </div>
          <div className="flex items-center gap-2 py-1 px-3 sm:p-0 bg-white/5 sm:bg-transparent rounded-full sm:rounded-none border border-white/5 sm:border-0">
            <Trophy className="w-4 h-4 text-white" />
            <span className="font-medium">Compete & Connect</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
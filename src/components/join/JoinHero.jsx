import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Users, Trophy } from 'lucide-react';

export default function JoinHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent py-20 px-6 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-2xl mx-auto text-center">
        
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-6 text-sm font-medium">
          <Gamepad2 className="w-4 h-4" />
          Full Send SimSport Inc.
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Join Our Team

        </h1>
        <p className="text-lg text-white/80 max-w-lg mx-auto mb-8">Become an official member of Full Send SimSport Inc. Fill in your details below to become a part of a great team.

        </p>
        <div className="flex items-center justify-center gap-8 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Official Membership</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Compete & Connect</span>
          </div>
        </div>
      </motion.div>
    </div>);

}
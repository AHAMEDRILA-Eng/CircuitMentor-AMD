'use client';

import React, { useState } from 'react';
import { Cpu, Wifi, Zap, Check, ChevronRight, ArrowRight } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface IoTPlatformSelectionProps {
  platforms?: Platform[];
  selectedPlatform?: string | null;
  onSelect?: (platformId: string) => void;
}

const PLATFORM_META: Record<string, { icon: React.ReactNode; color: string; border: string; glow: string }> = {
  'arduino-uno': {
    icon: <Cpu className="w-6 h-6 text-emerald-400" />,
    color: 'bg-emerald-500/15',
    border: 'border-emerald-400/20',
    glow: 'hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
  },
  'esp32': {
    icon: <Wifi className="w-6 h-6 text-cyan-400" />,
    color: 'bg-cyan-500/15',
    border: 'border-cyan-400/20',
    glow: 'hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]',
  },
  'raspberry-pi-pico': {
    icon: <Zap className="w-6 h-6 text-violet-400" />,
    color: 'bg-violet-500/15',
    border: 'border-violet-400/20',
    glow: 'hover:border-violet-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
  },
  'arduino-nano': {
    icon: <Cpu className="w-6 h-6 text-amber-400" />,
    color: 'bg-amber-500/15',
    border: 'border-amber-400/20',
    glow: 'hover:border-amber-400/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
  },
};

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300',
  intermediate: 'bg-amber-500/10   border-amber-400/20   text-amber-300',
  advanced: 'bg-red-500/10     border-red-400/20     text-red-300',
};

const DEFAULT_PLATFORMS: Platform[] = [
  { id: 'arduino-uno', name: 'Arduino Uno', description: 'Perfect for beginners. Most popular microcontroller with vast community support and libraries.', difficulty: 'beginner' },
  { id: 'esp32', name: 'ESP32', description: 'Built-in Wi-Fi and Bluetooth. Ideal for IoT cloud connectivity and wireless sensor networks.', difficulty: 'intermediate' },
  { id: 'raspberry-pi-pico', name: 'Raspberry Pi Pico', description: 'Powerful dual-core ARM processor. Great for complex real-time projects requiring more compute.', difficulty: 'intermediate' },
  { id: 'arduino-nano', name: 'Arduino Nano', description: 'Ultra-compact footprint. Fully compatible with Uno — perfect for space-constrained embedded projects.', difficulty: 'beginner' },
];

export function IoTPlatformSelection({
  platforms = DEFAULT_PLATFORMS,
  selectedPlatform,
  onSelect,
}: IoTPlatformSelectionProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [localSelected, setLocalSelected] = useState<string | null>(selectedPlatform ?? null);

  const handleSelect = (id: string) => {
    setLocalSelected(id);
    onSelect?.(id);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-indigo-600/8 blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-1/3 w-80 h-80 rounded-full bg-cyan-500/8 blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 circuit-bg opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-4xl animate-scale-in">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-strong border border-cyan-400/20 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-widest mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            IoT Detected · Choose Your Platform
          </div>
          <h2 className="text-5xl font-black text-white mb-4 tracking-tight">
            Pick Your <span className="text-gradient-primary">Microcontroller</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Your idea needs IoT connectivity. Select the platform that matches your experience level.
          </p>
        </div>

        {/* Platform grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {platforms.map(platform => {
            const meta = PLATFORM_META[platform.id] ?? PLATFORM_META['arduino-uno'];
            const isSelected = localSelected === platform.id;

            return (
              <button
                key={platform.id}
                onClick={() => handleSelect(platform.id)}
                onMouseEnter={() => setHovered(platform.id)}
                onMouseLeave={() => setHovered(null)}
                className={`
                                    group text-left glass-strong rounded-2xl p-6 border transition-all duration-300
                                    ${isSelected
                    ? `${meta.border} ${meta.color} scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.2)]`
                    : `border-white/8 hover:scale-[1.015] ${meta.glow}`
                  }
                                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${meta.color} border ${meta.border} flex items-center justify-center transition-all duration-300`}>
                      {meta.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{platform.name}</h3>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFFICULTY_BADGE[platform.difficulty]}`}>
                        {platform.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                                        ${isSelected
                      ? 'bg-indigo-500 border-indigo-400'
                      : 'border-white/20 group-hover:border-white/40'
                    }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">{platform.description}</p>
              </button>
            );
          })}
        </div>

        {/* Confirm CTA */}
        <div className={`mt-8 flex justify-center transition-all duration-300 ${localSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="glass-strong border border-indigo-400/20 rounded-2xl px-6 py-4 flex items-center gap-6">
            <div>
              <p className="text-white font-bold text-sm">
                {platforms.find(p => p.id === localSelected)?.name}
              </p>
              <p className="text-slate-500 text-xs">Platform selected — choose how to build</p>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

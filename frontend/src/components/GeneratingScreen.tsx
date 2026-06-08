'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Cpu, CheckCircle2, Loader2, Zap, Lock } from 'lucide-react';

interface GeneratingScreenProps {
  title?: string;
  subtitle?: string;
  mode?: 'QUICK_BUILD' | 'LEARNING_MODE';
}

const QUICK_STEPS = [
  { label: 'Parsing project intent', icon: <Zap className="w-4 h-4" /> },
  { label: 'Running registry completeness check', icon: <Shield className="w-4 h-4" /> },
  { label: 'Allocating Arduino pin map', icon: <Cpu className="w-4 h-4" /> },
  { label: 'Building condition models', icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: 'Generating deterministic sketch', icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: 'Validating EIL safety rules', icon: <Shield className="w-4 h-4" /> },
];

const LEARNING_STEPS = [
  { label: 'Analysing your idea', icon: <Zap className="w-4 h-4" /> },
  { label: 'Mapping recommended components', icon: <Cpu className="w-4 h-4" /> },
  { label: 'Building project blueprint', icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: 'Preparing teaching material', icon: <CheckCircle2 className="w-4 h-4" /> },
  { label: 'Locking backend engine', icon: <Lock className="w-4 h-4" /> },
];

export function GeneratingScreen({
  title,
  subtitle,
  mode = 'QUICK_BUILD',
}: GeneratingScreenProps) {
  const steps = mode === 'LEARNING_MODE' ? LEARNING_STEPS : QUICK_STEPS;
  const [activeStep, setActiveStep] = useState(0);

  const resolvedTitle = title ?? (mode === 'LEARNING_MODE' ? 'Setting Up Your Learning Path' : 'Building Your Circuit');
  const resolvedSubtitle = subtitle ?? (mode === 'LEARNING_MODE'
    ? 'Preparing your personalised 8-phase guided journey.'
    : 'Deterministic engine is running — no LLM touches your code.');

  // Auto-advance steps for visual progress
  useEffect(() => {
    if (activeStep >= steps.length) return;
    const t = setTimeout(() => setActiveStep(s => s + 1), 900 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [activeStep, steps.length]);

  const accentColor = mode === 'LEARNING_MODE' ? 'amber' : 'indigo';
  const orb1Class = mode === 'LEARNING_MODE'
    ? 'bg-amber-600/10'
    : 'bg-indigo-600/12';
  const orb2Class = mode === 'LEARNING_MODE'
    ? 'bg-violet-500/8'
    : 'bg-cyan-500/8';

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/3 left-1/4 w-80 h-80 rounded-full ${orb1Class} blur-[100px] animate-float`} />
        <div className={`absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full ${orb2Class} blur-[80px] animate-float`} style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 circuit-bg opacity-25" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-scale-in">

        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer ring */}
            <div className={`w-24 h-24 rounded-full border-2 border-${accentColor}-500/20 flex items-center justify-center`}>
              {/* Spinning arc */}
              <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-${accentColor}-500 animate-spin`} />
              {/* Inner icon */}
              <div className={`w-14 h-14 rounded-full bg-${accentColor}-500/10 border border-${accentColor}-400/20 flex items-center justify-center`}>
                <Cpu className={`w-7 h-7 text-${accentColor}-400`} />
              </div>
            </div>
            {/* Pulse dot */}
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-${accentColor}-500 flex items-center justify-center animate-pulse`}>
              <Zap className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{resolvedTitle}</h2>
          <p className="text-slate-400 leading-relaxed">{resolvedSubtitle}</p>
        </div>

        {/* Steps */}
        <div className="glass-strong border border-white/8 rounded-2xl p-6 space-y-3">
          {steps.map((step, idx) => {
            const done = idx < activeStep;
            const current = idx === activeStep;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500
                                    ${done ? 'opacity-100' : ''}
                                    ${current ? 'opacity-100 bg-white/5' : ''}
                                    ${!done && !current ? 'opacity-30' : ''}
                                `}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                                    ${done
                    ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-400'
                    : current
                      ? `bg-${accentColor}-500/20 border border-${accentColor}-400/30 text-${accentColor}-400`
                      : 'bg-white/5 border border-white/10 text-slate-600'
                  }`}>
                  {done
                    ? <CheckCircle2 className="w-4 h-4" />
                    : current
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : step.icon
                  }
                </div>
                <span className={`text-sm font-medium ${done ? 'text-emerald-300' : current ? 'text-white' : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Safety badge */}
        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-400/20">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">
              EIL Safety Validation Active · LLM Never Touches Code
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

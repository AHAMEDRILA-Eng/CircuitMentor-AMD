'use client';

import React from 'react';
import { Zap, BookOpen, ChevronRight, Trophy, Shield, Clock, GraduationCap } from 'lucide-react';

interface ModeSelectorProps {
    onSelectMode: (mode: 'QUICK_BUILD' | 'LEARNING_MODE') => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">

            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[100px] animate-float" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 circuit-bg opacity-40" />
            </div>

            <div className="relative z-10 w-full max-w-4xl animate-scale-in">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-strong border border-indigo-400/20 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        Choose your experience
                    </div>
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tight">
                        How do you want to <span className="text-gradient-primary">build today?</span>
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Same deterministic engine. Different learning depth.
                    </p>
                </div>

                {/* Mode cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* ── QUICK BUILD ── */}
                    <button
                        onClick={() => onSelectMode('QUICK_BUILD')}
                        className="group text-left glass-strong border border-white/8 hover:border-indigo-400/40
                            rounded-3xl p-8 transition-all duration-300
                            hover:scale-[1.015] hover:shadow-[0_0_50px_rgba(99,102,241,0.15)]
                            active:scale-[0.99]"
                    >
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/20
                            flex items-center justify-center mb-6
                            group-hover:bg-indigo-500/25 group-hover:border-indigo-400/40
                            group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]
                            transition-all duration-300">
                            <Zap className="w-7 h-7 text-indigo-400" />
                        </div>

                        {/* Badge */}
                        <div className="flex items-center gap-2 mb-5">
                            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1
                                bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 rounded-full">
                                Free · Always
                            </span>
                        </div>

                        <h3 className="text-2xl font-black text-white mb-3">Quick Build</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            Describe your idea. Get instant working Arduino code and circuit visualization. Zero friction.
                        </p>

                        <ul className="space-y-2.5 mb-8">
                            {[
                                'Full deterministic Arduino sketch',
                                'Auto component selection',
                                'Circuit visualization',
                                'Download-ready .ino file',
                            ].map(item => (
                                <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm
                            group-hover:gap-3 transition-all duration-200">
                            Build instantly <ChevronRight className="w-4 h-4" />
                        </div>

                        {/* Bottom glow line */}
                        <div className="absolute bottom-0 left-0 right-0 h-px rounded-b-3xl
                            bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {/* ── LEARNING MODE ── */}
                    <button
                        onClick={() => onSelectMode('LEARNING_MODE')}
                        className="group relative text-left glass-strong border border-white/8 hover:border-amber-400/40
                            rounded-3xl p-8 transition-all duration-300
                            hover:scale-[1.015] hover:shadow-[0_0_50px_rgba(245,158,11,0.12)]
                            active:scale-[0.99] overflow-hidden"
                    >
                        {/* Subtle recommended glow */}
                        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
                            bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5" />

                        {/* Icon */}
                        <div className="relative w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/20
                            flex items-center justify-center mb-6
                            group-hover:bg-amber-500/25 group-hover:border-amber-400/40
                            group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]
                            transition-all duration-300">
                            <BookOpen className="w-7 h-7 text-amber-400" />
                        </div>

                        {/* Badges */}
                        <div className="relative flex items-center gap-2 mb-5 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1
                                bg-amber-500/10 border border-amber-400/20 text-amber-300 rounded-full">
                                1 Free Project
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1
                                bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 rounded-full flex items-center gap-1.5">
                                <Trophy className="w-3 h-3" /> Recommended
                            </span>
                        </div>

                        <h3 className="relative text-2xl font-black text-white mb-3">Learn Through Building</h3>
                        <p className="relative text-slate-400 text-sm leading-relaxed mb-6">
                            8-phase guided journey. Understand every component, validate with quiz, and build with real confidence.
                        </p>

                        <ul className="relative space-y-2.5 mb-8">
                            {[
                                { text: 'Mentor chat on every phase', icon: <GraduationCap className="w-3 h-3 text-amber-400" /> },
                                { text: 'Registry-driven component selection', icon: <Shield className="w-3 h-3 text-cyan-400" /> },
                                { text: 'System logic deep view', icon: <Zap className="w-3 h-3 text-violet-400" /> },
                                { text: 'Quiz before code unlock', icon: <Trophy className="w-3 h-3 text-emerald-400" /> },
                                { text: 'Structured 8-phase learning path', icon: <Clock className="w-3 h-3 text-indigo-400" /> },
                            ].map(({ text, icon }) => (
                                <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                                    <div className="shrink-0">{icon}</div>
                                    {text}
                                </li>
                            ))}
                        </ul>

                        <div className="relative flex items-center gap-2 text-amber-400 font-bold text-sm
                            group-hover:gap-3 transition-all duration-200">
                            Start learning <ChevronRight className="w-4 h-4" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-px rounded-b-3xl
                            bg-gradient-to-r from-transparent via-amber-500/40 to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                </div>

                {/* Footer note */}
                <p className="text-center text-slate-600 text-sm mt-8 flex items-center justify-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Learning Mode saves progress — continue any time from where you left off
                </p>
            </div>
        </div>
    );
}

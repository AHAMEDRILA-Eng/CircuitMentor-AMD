'use client';

import React from 'react';
import { Wifi, Smartphone, Cloud, ArrowRight, Lightbulb } from 'lucide-react';

interface IoTRevealProps {
    projectIdea: string;
    onContinue: () => void;
}

export function IoTReveal({ projectIdea, onContinue }: IoTRevealProps) {
    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan-600/8 blur-[120px] animate-float" />
                <div className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full bg-indigo-500/8 blur-[80px] animate-float" style={{ animationDelay: '4s' }} />
                <div className="absolute inset-0 circuit-bg opacity-25" />
            </div>

            <div className="relative z-10 w-full max-w-2xl animate-scale-in">

                {/* IoT icon */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center animate-pulse-cyan">
                            <Wifi className="w-10 h-10 text-cyan-400" />
                        </div>
                        {/* Orbiting dots */}
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500/80 border border-indigo-400 flex items-center justify-center">
                            <Smartphone className="w-3 h-3 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500/80 border border-emerald-400 flex items-center justify-center">
                            <Cloud className="w-3 h-3 text-white" />
                        </div>
                    </div>
                </div>

                {/* Headline */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-strong border border-cyan-400/20 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        IoT Connectivity Detected
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
                        Your project needs the <span className="text-gradient-primary">Internet of Things</span>
                    </h2>
                    <p className="text-slate-400 leading-relaxed max-w-lg mx-auto">
                        For <span className="text-white font-semibold">&ldquo;{projectIdea}&rdquo;</span>, your device
                        needs to communicate beyond just blinking an LED.
                    </p>
                </div>

                {/* Explainer card */}
                <div className="glass-strong border border-white/8 rounded-3xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300 font-bold text-sm uppercase tracking-wider">What is IoT?</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-6 text-sm">
                        IoT stands for <span className="text-white font-semibold">Internet of Things</span> — it means
                        your physical device (like an Arduino) can <span className="text-cyan-300">send data to the internet</span>,
                        receive commands from your phone, or trigger alerts in real time.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: <Smartphone className="w-5 h-5 text-indigo-400" />, label: 'Phone Alerts', desc: 'Get notified on your phone when something happens', color: 'border-indigo-400/20 bg-indigo-500/8' },
                            { icon: <Cloud className="w-5 h-5 text-cyan-400" />, label: 'Cloud Data', desc: 'Store sensor readings online and view history', color: 'border-cyan-400/20 bg-cyan-500/8' },
                            { icon: <Wifi className="w-5 h-5 text-emerald-400" />, label: 'Remote Control', desc: 'Control your device from anywhere', color: 'border-emerald-400/20 bg-emerald-500/8' },
                        ].map(({ icon, label, desc, color }) => (
                            <div key={label} className={`p-3 rounded-xl border ${color}`}>
                                <div className="mb-2">{icon}</div>
                                <p className="text-white text-xs font-bold mb-1">{label}</p>
                                <p className="text-slate-500 text-xs leading-snug">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Why this project needs it */}
                <div className="glass border border-amber-400/15 rounded-2xl p-4 mb-8">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Your idea likely needs to <span className="text-amber-300 font-semibold">send alerts or be monitored remotely</span>.
                            In the next step, we&apos;ll pick an easy platform that handles all the internet parts for you —
                            you just write the logic.
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex justify-center">
                    <button
                        onClick={onContinue}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white
                            bg-gradient-to-r from-cyan-600 to-indigo-600
                            hover:from-cyan-500 hover:to-indigo-500
                            shadow-[0_0_30px_rgba(6,182,212,0.3)]
                            hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]
                            transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        Got it — choose my platform
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

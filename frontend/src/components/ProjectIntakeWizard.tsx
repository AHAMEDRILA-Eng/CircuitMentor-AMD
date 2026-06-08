'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Zap, Cpu } from 'lucide-react';

export interface IntakeAnswers {
    experience: 'beginner' | 'some' | 'comfortable';
    remoteControl: 'yes' | 'no' | 'unsure';
    location: 'lab' | 'home' | 'outdoor';
    recommendedMCU: 'MCU_ESP32' | 'MCU_Arduino_Uno';
}

interface ProjectIntakeWizardProps {
    projectIdea: string;
    onComplete: (answers: IntakeAnswers) => void;
}

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
    {
        id: 'experience',
        question: 'How comfortable are you with electronics?',
        hint: 'We use this to calibrate explanations for your level.',
        options: [
            {
                value: 'beginner',
                label: 'Complete Beginner',
                emoji: '🌱',
                desc: "I've never built a circuit before",
            },
            {
                value: 'some',
                label: 'Some Experience',
                emoji: '⚡',
                desc: 'I know LEDs, resistors, and basic Arduino',
            },
            {
                value: 'comfortable',
                label: 'Comfortable',
                emoji: '🔧',
                desc: 'I build projects regularly',
            },
        ],
    },
    {
        id: 'remoteControl',
        question: 'Should your project work from your phone or internet?',
        hint: 'This helps us decide if your project needs internet connectivity.',
        options: [
            {
                value: 'no',
                label: 'No — standalone is fine',
                emoji: '🔌',
                desc: 'Just plug in and it works on its own',
            },
            {
                value: 'yes',
                label: 'Yes — I want phone alerts or control',
                emoji: '📱',
                desc: 'Send notifications or control it remotely',
            },
            {
                value: 'unsure',
                label: "Not sure — you decide",
                emoji: '🤔',
                desc: "I'll follow whatever works best",
            },
        ],
    },
    {
        id: 'location',
        question: 'Where will you use this project?',
        hint: "Location affects component choices like power supply and casing.",
        options: [
            {
                value: 'lab',
                label: 'School / College Lab',
                emoji: '🏫',
                desc: 'For a lab experiment or project submission',
            },
            {
                value: 'home',
                label: 'Home Project',
                emoji: '🏠',
                desc: 'Personal project at home',
            },
            {
                value: 'outdoor',
                label: 'Outdoor / Field',
                emoji: '🌿',
                desc: 'Used outside or in a real environment',
            },
        ],
    },
] as const;

type StepId = typeof STEPS[number]['id'];
type OptionValue<T extends StepId> = Extract<typeof STEPS[number], { id: T }>['options'][number]['value'];

// ── Component ────────────────────────────────────────────────────────────────

export function ProjectIntakeWizard({ projectIdea, onComplete }: ProjectIntakeWizardProps) {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Partial<IntakeAnswers>>({});
    const [showMCUReveal, setShowMCUReveal] = useState(false);

    const currentStep = STEPS[step];
    const totalSteps = STEPS.length;

    // Guard: step briefly goes out of bounds during the 300ms MCU reveal transition
    if (!currentStep && !showMCUReveal) return null;

    // Determine recommended MCU:
    // Priority 1 — user explicitly mentioned ESP32/IoT keywords in the idea text
    // Priority 2 — wizard answer says "yes" or "unsure" to phone/remote control
    const IOT_KEYWORDS = ['esp32', 'esp 32', 'wifi', 'wi-fi', 'bluetooth', 'iot', 'blynk',
        'internet', 'cloud', 'remote', 'nodemcu', 'telegram', 'mqtt', 'esp8266'];
    const ideaLower = projectIdea.toLowerCase();
    const ideaIsIoT = IOT_KEYWORDS.some(kw => ideaLower.includes(kw));
    const answerIsIoT = answers.remoteControl === 'yes' || answers.remoteControl === 'unsure';
    const needsIoT = ideaIsIoT || answerIsIoT;
    const recommendedMCU: IntakeAnswers['recommendedMCU'] = needsIoT ? 'MCU_ESP32' : 'MCU_Arduino_Uno';


    const handleSelect = (value: string) => {
        const updated = { ...answers, [currentStep.id]: value } as Partial<IntakeAnswers>;
        setAnswers(updated);

        if (step < totalSteps - 1) {
            setTimeout(() => setStep(s => s + 1), 0);
        } else {
            // Last wizard step done — show MCU reveal before completing
            setTimeout(() => setShowMCUReveal(true), 0);
        }
    };

    const handleMCUConfirm = () => {
        const final: IntakeAnswers = { ...answers as IntakeAnswers, recommendedMCU };
        onComplete(final);
    };

    const handleBack = () => {
        if (step > 0) setStep(s => s - 1);
    };

    // MCU Reveal Screen
    if (showMCUReveal) {
        const isESP = recommendedMCU === 'MCU_ESP32';
        return (
            <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full ${isESP ? 'bg-cyan-500/10' : 'bg-indigo-600/8'} blur-[120px] animate-float`} />
                    <div className="absolute inset-0 circuit-bg opacity-25" />
                </div>
                <div className="relative z-10 w-full max-w-2xl animate-fade-up text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${isESP ? 'bg-cyan-500/15 border border-cyan-500/30' : 'bg-indigo-500/15 border border-indigo-500/30'}`}>
                            <Cpu className={`w-12 h-12 ${isESP ? 'text-cyan-400' : 'text-indigo-400'}`} />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 tracking-tight">
                        {isESP ? '🚀 ESP32 Recommended!' : '🔧 Arduino Uno Recommended!'}
                    </h2>
                    <p className={`text-lg font-semibold mb-2 ${isESP ? 'text-cyan-400' : 'text-indigo-400'}`}>
                        {isESP ? 'ESP32 DevKit V1' : 'Arduino Uno R3'}
                    </p>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                        {isESP
                            ? 'Since you want phone alerts or remote control, you need a board with built-in Wi-Fi. The ESP32 has Wi-Fi AND Bluetooth with a dual-core processor — perfect for IoT.'
                            : 'Since your project is standalone (no internet needed), the Arduino Uno is the perfect beginner-friendly choice. Simple, reliable, and widely supported.'}
                    </p>
                    <div className="glass-strong border border-white/8 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
                        <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-widest">Key Specs</h3>
                        {isESP ? (
                            <ul className="space-y-1.5 text-sm text-slate-400">
                                <li>✅ Built-in Wi-Fi (802.11 b/g/n)</li>
                                <li>✅ Built-in Bluetooth 4.2</li>
                                <li>✅ 520KB RAM, Dual Core 240MHz</li>
                                <li>⚠️ 3.3V GPIO — do NOT connect 5V sensors directly</li>
                                <li>🛒 Search: "ESP32 DevKit V1" on Amazon</li>
                            </ul>
                        ) : (
                            <ul className="space-y-1.5 text-sm text-slate-400">
                                <li>✅ Beginner friendly — huge community</li>
                                <li>✅ 5V GPIO — works with most sensors directly</li>
                                <li>✅ 14 digital pins, 6 analog pins</li>
                                <li>⚠️ No Wi-Fi — standalone projects only</li>
                                <li>🛒 Search: "Arduino Uno R3" on Amazon</li>
                            </ul>
                        )}
                    </div>
                    <button
                        onClick={handleMCUConfirm}
                        className={`px-12 py-4 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3 mx-auto ${isESP ? 'bg-cyan-500 text-black shadow-cyan-500/30' : 'bg-indigo-500 text-white shadow-indigo-500/30'}`}
                    >
                        Got it — Let&apos;s Build!
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#07070F] overflow-hidden">

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/8 blur-[120px] animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-cyan-500/6 blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
                <div className="absolute inset-0 circuit-bg opacity-25" />
            </div>

            <div className="relative z-10 w-full max-w-2xl animate-fade-up">

                {/* Project idea recap */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 glass-strong border border-indigo-400/20 rounded-full">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest truncate max-w-xs">
                            {projectIdea}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs text-slate-600 mb-2">
                        <span>Step {step + 1} of {totalSteps}</span>
                        <span>{Math.round(((step + 1) / totalSteps) * 100)}% done</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full phase-line rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question card */}
                <div className="glass-strong border border-white/8 rounded-3xl p-8 animate-scale-in" key={step}>

                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                        {currentStep.question}
                    </h2>
                    <p className="text-slate-500 text-sm mb-5">{currentStep.hint}</p>

                    {/* Smart IoT detection hint */}
                    {ideaIsIoT && currentStep.id === 'remoteControl' && (
                        <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl bg-cyan-500/8 border border-cyan-400/20">
                            <span className="text-cyan-400 text-lg shrink-0">🔍</span>
                            <p className="text-cyan-300 text-sm">
                                We detected <strong>ESP32 / IoT</strong> keywords in your idea.
                                We'll recommend the ESP32 for Wi-Fi connectivity — but you can still choose below.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {currentStep.options.map((option) => {
                            const isSelected = answers[currentStep.id as StepId] === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`
                                        w-full text-left flex items-center gap-4 p-4 rounded-2xl border
                                        transition-all duration-200 group
                                        ${isSelected
                                            ? 'border-indigo-400/50 bg-indigo-500/10 scale-[1.01]'
                                            : 'border-white/8 hover:border-white/20 hover:bg-white/5 hover:scale-[1.005]'
                                        }
                                    `}
                                >
                                    {/* Emoji */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0
                                        transition-all duration-200
                                        ${isSelected ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/8'}`}>
                                        {option.emoji}
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-base transition-colors duration-200 ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
                                            {option.label}
                                        </p>
                                        <p className="text-slate-500 text-sm mt-0.5">{option.desc}</p>
                                    </div>

                                    {/* Arrow  */}
                                    <ChevronRight className={`w-5 h-5 shrink-0 transition-all duration-200
                                        ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-700 group-hover:text-slate-500'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Back button */}
                {step > 0 && (
                    <div className="flex justify-start mt-5">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300
                                transition-colors duration-200 px-3 py-2 rounded-xl hover:bg-white/5"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

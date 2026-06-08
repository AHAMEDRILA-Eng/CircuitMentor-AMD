'use client';

import React, { useState } from 'react';
import {
    ChevronRight, ChevronLeft, CheckCircle2,
    Smartphone, MessageCircle, Code2, Send, Copy, Check
} from 'lucide-react';
import { buildTelegramCode } from '@/lib/telegramCodeBuilder';

interface TelegramSetupGuideProps {
    projectIdea: string;
    components: string[];   // e.g. ["Sensor_DHT11", "Actuator_Relay_5V"]
    onComplete: () => void;
    onBack: () => void;
}

// ── Step definitions ───────────────────────────────────────────
function buildSteps(projectIdea: string, components: string[]) {
    return [
        {
            id: 'botfather',
            icon: <MessageCircle className="w-7 h-7 text-sky-400" />,
            title: 'Step 1 — Create Your Bot with BotFather',
            subtitle: 'Talk to the official Telegram BotFather to create a new bot.',
            color: 'sky',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Telegram has a built-in master bot called <strong className="text-white">BotFather</strong> that lets you spawn and manage your own bots for free.
                    </p>
                    <div className="space-y-2">
                        {[
                            'Open the Telegram app on your phone or computer',
                            'Search for "@BotFather" (look for the verified blue checkmark)',
                            'Click "Start" or type "/start" to begin',
                            'Send the command "/newbot" to BotFather',
                            'Give your bot a Display Name (e.g. "My Home Setup")',
                            'Give it a unique username that ends in "_bot" (e.g. "MyHome123_bot")',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-sky-400 text-xs font-black">{i + 1}</span>
                                </div>
                                <p className="text-slate-300 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-amber-500/8 border border-amber-400/20 rounded-xl">
                        <p className="text-amber-300 text-xs text-center">⚠️ Make sure you are talking to the real BotFather with the blue verified checkmark!</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'token',
            icon: <Code2 className="w-7 h-7 text-emerald-400" />,
            title: 'Step 2 — Save Your API Token',
            subtitle: 'The secret key that allows your ESP32 to send messages.',
            color: 'emerald',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Once you successfully create the bot, BotFather will send you a long string called an <strong className="text-white">HTTP API Token</strong>.
                    </p>
                    <div className="space-y-2">
                        {[
                            'Look for the message starting with "Use this token to access the HTTP API:"',
                            'Click on the token to copy it (it looks like 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)',
                            'Save this token somewhere safe — you will paste it into your Arduino code!',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-emerald-400 text-xs font-black">{i + 1}</span>
                                </div>
                                <p className="text-slate-300 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-red-500/8 border border-red-400/20 rounded-xl">
                        <p className="text-red-300 text-xs text-center">🔒 <strong>Keep this secret!</strong> Anyone with this token can control your bot.</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'chatid',
            icon: <Smartphone className="w-7 h-7 text-indigo-400" />,
            title: 'Step 3 — Find Your Personal Chat ID',
            subtitle: 'So your ESP32 knows exactly who to send messages to.',
            color: 'indigo',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Telegram bots need your <strong className="text-white">Chat ID</strong> so they don't send alerts to random people.
                    </p>
                    <div className="space-y-2">
                        {[
                            'In Telegram, search for a bot named "@RawDataBot" or "@userinfobot"',
                            'Start a chat with it',
                            'It will instantly reply with a bunch of text. Look for the line that says "id": 123456789',
                            'Copy that number (your Chat ID) and save it with your API Token.',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-indigo-400 text-xs font-black">{i + 1}</span>
                                </div>
                                <p className="text-slate-300 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="p-3 bg-emerald-500/8 border border-emerald-400/20 rounded-xl text-center">
                            <p className="text-emerald-300 text-xs font-bold mb-1">BOT_TOKEN</p>
                            <p className="text-slate-400 text-[10px]">Identifies the hardware</p>
                        </div>
                        <div className="p-3 bg-indigo-500/8 border border-indigo-400/20 rounded-xl text-center">
                            <p className="text-indigo-300 text-xs font-bold mb-1">CHAT_ID</p>
                            <p className="text-slate-400 text-[10px]">Identifies your phone</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'code',
            icon: <Code2 className="w-7 h-7 text-pink-400" />,
            title: 'Step 4 — Upload Your Personalized Code',
            subtitle: 'Generated specifically for your components — not a generic template.',
            color: 'pink',
            content: <TelegramCodeStep projectIdea={projectIdea} components={components} />,
        },
        {
            id: 'test',
            icon: <Send className="w-7 h-7 text-cyan-400" />,
            title: 'Step 5 — Start Chatting With Your Hardware!',
            subtitle: 'Send commands to your bot to control the ESP32.',
            color: 'cyan',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Now that your code is uploaded, you can control your hardware securely via chat!
                    </p>
                    <div className="space-y-2">
                        {[
                            'Open Telegram and search for the @username you gave your bot in Step 1',
                            'Click "Start"',
                            'Wait for the ESP32 to connect to WiFi — it will send you a "System Ready!" message',
                            'Type /start to see all available commands for your project',
                            'Type /status to get live readings from your sensors',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-cyan-400 text-xs font-black">{i + 1}</span>
                                </div>
                                <p className="text-slate-300 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-cyan-500/10 border border-cyan-400/25 rounded-xl">
                        <p className="text-cyan-300 font-bold text-sm mb-2">💡 Why Telegram?</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Telegram bots bypass firewall rules safely, deliver instant push notifications,
                            and give you a mobile app interface with zero frontend design work!
                        </p>
                    </div>
                </div>
            ),
        },
    ];
}

// ── TelegramCodeStep — DYNAMIC ────────────────────────────────
interface TelegramCodeStepProps {
    projectIdea: string;
    components: string[];
}

function TelegramCodeStep({ projectIdea, components }: TelegramCodeStepProps) {
    const [copied, setCopied] = useState(false);
    const code = buildTelegramCode(components, projectIdea);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <p className="text-slate-300 text-sm">
                This code was generated <strong className="text-white">specifically for your project</strong> and components.
                Replace the 4 placeholders marked with <span className="text-amber-400 font-mono">←</span>.
            </p>
            <div className="relative">
                <pre className="bg-black/50 border border-white/8 rounded-xl p-4 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-64 leading-relaxed">
                    {code}
                </pre>
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs text-white font-bold transition-all"
                >
                    {copied
                        ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
                </button>
            </div>
            <div className="p-3 bg-blue-500/8 border border-blue-400/20 rounded-xl">
                <p className="text-blue-300 text-xs font-bold mb-1">📦 Required Libraries</p>
                <p className="text-slate-400 text-xs">
                    Arduino IDE → Sketch → Include Library → Manage Libraries →
                    Search and install each library listed at the top of the code above.
                </p>
            </div>
        </div>
    );
}

// ── Color map ─────────────────────────────────────────────────
const colorMap: Record<string, string> = {
    sky:     'bg-sky-500/15 border-sky-400/30 text-sky-400',
    emerald: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400',
    indigo:  'bg-indigo-500/15 border-indigo-400/30 text-indigo-400',
    pink:    'bg-pink-500/15 border-pink-400/30 text-pink-400',
    cyan:    'bg-cyan-500/15 border-cyan-400/30 text-cyan-400',
};

// ── Main Component ────────────────────────────────────────────
export function TelegramSetupGuide({ projectIdea, components, onComplete, onBack }: TelegramSetupGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const TELEGRAM_STEPS = buildSteps(projectIdea, components);

    const step = TELEGRAM_STEPS[currentStep];
    const isLast = currentStep === TELEGRAM_STEPS.length - 1;
    const isFirst = currentStep === 0;

    const markComplete = () => setCompletedSteps(prev => new Set([...prev, currentStep]));

    const goNext = () => {
        markComplete();
        if (isLast) onComplete();
        else setCurrentStep(s => s + 1);
    };

    const goPrev = () => {
        if (isFirst) onBack();
        else setCurrentStep(s => s - 1);
    };

    return (
        <div className="relative min-h-screen flex items-start justify-center p-6 bg-transparent overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-sky-600/6 blur-[120px] animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/6 blur-[80px] animate-float" style={{ animationDelay: '4s' }} />
                <div className="absolute inset-0 circuit-bg opacity-20" />
            </div>

            <div className="relative z-10 w-full max-w-2xl animate-fade-up pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-400/20 rounded-full mb-2">
                            <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-sky-300 text-xs font-bold uppercase tracking-widest">Telegram Bot Setup Guide</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight truncate max-w-sm">
                            {projectIdea || 'Telegram Bot Setup'}
                        </h1>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs">Step</p>
                        <p className="text-white font-black text-2xl">
                            {currentStep + 1}<span className="text-slate-600 text-base">/{TELEGRAM_STEPS.length}</span>
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / TELEGRAM_STEPS.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        {TELEGRAM_STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => i <= currentStep && setCurrentStep(i)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all
                                    ${completedSteps.has(i)
                                        ? 'bg-emerald-500 border-emerald-400 text-white'
                                        : i === currentStep
                                            ? 'bg-sky-500 border-sky-400 text-white scale-110'
                                            : 'bg-white/5 border-white/10 text-slate-600'
                                    }`}
                            >
                                {completedSteps.has(i) ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step card */}
                <div className="glass-strong border border-white/8 rounded-3xl p-7 mb-6 animate-scale-in" key={currentStep}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${colorMap[step.color]}`}>
                            {step.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">{step.title}</h2>
                            <p className="text-slate-400 text-sm mt-0.5">{step.subtitle}</p>
                        </div>
                    </div>
                    <div>{step.content}</div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pb-12">
                    <button
                        onClick={goPrev}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white font-bold text-sm transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {isFirst ? 'Back to Platforms' : 'Previous'}
                    </button>
                    <button
                        onClick={goNext}
                        className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95
                            bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-900/30"
                    >
                        {isLast ? '🎉 All Done — View My Circuit!' : 'Got it — Next Step!'}
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

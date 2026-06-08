'use client';

import React, { useState } from 'react';
import {
    ChevronRight, ChevronLeft, CheckCircle2, ExternalLink,
    Smartphone, Wifi, Code2, Upload, Play, Copy, Check
} from 'lucide-react';
import { buildBlynkCode } from '@/lib/blynkCodeBuilder';

interface BlynkSetupGuideProps {
    projectIdea: string;
    components: string[];
    onComplete: () => void;
    onBack: () => void;
}

// ── Blynk setup steps ───────────────────────────────────────
function buildSteps(projectIdea: string, components: string[]) {
  return [
    {
        id: 'account',
        icon: <Smartphone className="w-7 h-7 text-cyan-400" />,
        title: 'Step 1 — Create Your Blynk Account',
        subtitle: 'Free account, takes 30 seconds.',
        color: 'cyan',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    Blynk is a free platform that lets your ESP32 send data to your phone and receive commands — no complicated server setup.
                </p>
                <div className="space-y-2">
                    {[
                        { num: '1', text: 'Open your browser and go to', link: 'https://blynk.cloud', linkText: 'blynk.cloud' },
                        { num: '2', text: 'Click "Sign Up" (top right corner)' },
                        { num: '3', text: 'Enter your email address and create a password' },
                        { num: '4', text: 'Check your email — click the verification link' },
                        { num: '5', text: 'You are now logged into the Blynk Console' },
                    ].map(step => (
                        <div key={step.num} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-cyan-400 text-xs font-black">{step.num}</span>
                            </div>
                            <p className="text-slate-300 text-sm">
                                {step.text}{' '}
                                {step.link && (
                                    <a href={step.link} target="_blank" rel="noopener noreferrer"
                                        className="text-cyan-400 underline underline-offset-2 inline-flex items-center gap-1">
                                        {step.linkText} <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-amber-500/8 border border-amber-400/20 rounded-xl">
                    <p className="text-amber-300 text-xs">⚠️ Use the same email for the <strong>Blynk IoT app</strong> on your phone — not the legacy Blynk app.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'template',
        icon: <Play className="w-7 h-7 text-violet-400" />,
        title: 'Step 2 — Create a New Template',
        subtitle: 'Templates define how your device communicates.',
        color: 'violet',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    A <strong className="text-white">Template</strong> in Blynk describes what your ESP32 does — what data it sends and what it can receive.
                </p>
                <div className="space-y-2">
                    {[
                        'In the Blynk Console, click "Templates" in the left sidebar',
                        'Click the blue "+ New Template" button',
                        'Give it a name — e.g. "My IoT Project"',
                        'Hardware: Select "ESP32"',
                        'Connection Type: Select "WiFi"',
                        'Click "Done" — your template is created!',
                    ].map((text, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-violet-400 text-xs font-black">{i + 1}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="p-3 bg-violet-500/8 border border-violet-400/20 rounded-xl text-center">
                        <p className="text-violet-300 text-xs font-bold mb-1">Hardware</p>
                        <p className="text-white font-black text-sm">ESP32</p>
                    </div>
                    <div className="p-3 bg-cyan-500/8 border border-cyan-400/20 rounded-xl text-center">
                        <p className="text-cyan-300 text-xs font-bold mb-1">Connection</p>
                        <p className="text-white font-black text-sm">WiFi</p>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'datastream',
        icon: <Wifi className="w-7 h-7 text-emerald-400" />,
        title: 'Step 3 — Add Datastreams (Virtual Pins)',
        subtitle: 'Datastreams are the channels that carry your sensor data.',
        color: 'emerald',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    A <strong className="text-white">Datastream</strong> is a named channel (like V0, V1, V2...) that carries a value between your ESP32 and the Blynk app. Each sensor reading needs its own datastream.
                </p>
                <div className="space-y-2">
                    {[
                        'Inside your Template, click the "Datastreams" tab',
                        'Click "+ New Datastream" → choose "Virtual Pin"',
                        'Name it (e.g. "Soil Moisture" or "Temperature")',
                        'Virtual Pin: V0 (first one)',
                        'Data Type: Integer (or Double for decimal values)',
                        'Min: 0, Max: 1023 (for analog sensors)',
                        'Click "Create" → repeat for each sensor you have',
                    ].map((text, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-emerald-400 text-xs font-black">{i + 1}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-emerald-500/8 border border-emerald-400/20 rounded-xl">
                    <p className="text-emerald-300 text-xs font-bold mb-1">💡 Virtual Pin Cheatsheet</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                        <span>V0 → Sensor Reading 1</span>
                        <span>V1 → Sensor Reading 2</span>
                        <span>V2 → Button/Switch State</span>
                        <span>V3 → Alert Flag</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'dashboard',
        icon: <Smartphone className="w-7 h-7 text-indigo-400" />,
        title: 'Step 4 — Build Your Dashboard (Phone UI)',
        subtitle: 'Drag and drop widgets onto your phone screen.',
        color: 'indigo',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    The <strong className="text-white">Dashboard</strong> is the screen you see on your phone. You drag widgets (gauges, buttons, charts) and connect them to your datastreams.
                </p>
                <div className="space-y-2">
                    {[
                        'In your Template, click the "Web Dashboard" tab',
                        'Click "+ Add Widget" on the left panel',
                        'For sensor data: drag a "Gauge" widget onto the canvas',
                        'Click the widget → "Settings" → connect it to V0 (your datastream)',
                        'For buttons/switches: use a "Button" widget connected to V2',
                        'For graphs: use a "SuperChart" widget to show history',
                        'Click "Save & Apply" at the top right',
                    ].map((text, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-indigo-400 text-xs font-black">{i + 1}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                        { icon: '📊', name: 'Gauge', use: 'Sensor values' },
                        { icon: '📈', name: 'SuperChart', use: 'History graph' },
                        { icon: '🔘', name: 'Button', use: 'Control relay/LED' },
                    ].map(w => (
                        <div key={w.name} className="p-2 bg-indigo-500/8 border border-indigo-400/20 rounded-xl text-center">
                            <p className="text-lg mb-1">{w.icon}</p>
                            <p className="text-white text-xs font-bold">{w.name}</p>
                            <p className="text-slate-500 text-[10px]">{w.use}</p>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'token',
        icon: <Code2 className="w-7 h-7 text-amber-400" />,
        title: 'Step 5 — Get Your Auth Token & Credentials',
        subtitle: 'These 3 values go into your ESP32 code.',
        color: 'amber',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    Blynk uses 3 credentials to identify your device. You need all 3 in your code.
                </p>
                <div className="space-y-3">
                    {[
                        {
                            label: 'BLYNK_AUTH_TOKEN',
                            where: 'Template → Device → Auth Tokens → "+" → Copy',
                            color: 'amber',
                            desc: 'A unique secret key for YOUR device'
                        },
                        {
                            label: 'BLYNK_TEMPLATE_ID',
                            where: 'Template → Settings → Template ID (top of the page)',
                            color: 'cyan',
                            desc: 'Identifies which template your device uses'
                        },
                        {
                            label: 'BLYNK_TEMPLATE_NAME',
                            where: 'Template → Settings → Template Name',
                            color: 'violet',
                            desc: 'The name you gave your template (e.g. "My IoT Project")'
                        },
                    ].map(item => (
                        <div key={item.label} className={`p-3 bg-${item.color}-500/8 border border-${item.color}-400/20 rounded-xl`}>
                            <p className={`text-${item.color}-300 font-mono text-xs font-bold mb-1`}>{item.label}</p>
                            <p className="text-slate-400 text-xs mb-1">{item.desc}</p>
                            <p className="text-slate-500 text-[11px]">📍 Found at: {item.where}</p>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-red-500/8 border border-red-400/20 rounded-xl">
                    <p className="text-red-300 text-xs">🔒 <strong>Never share</strong> your Auth Token. Anyone with it can control your device!</p>
                </div>
            </div>
        ),
    },
    {
        id: 'code',
        icon: <Code2 className="w-7 h-7 text-pink-400" />,
        title: 'Step 6 — Upload Your Personalized Code',
        subtitle: 'Generated specifically for your components — not a generic template.',
        color: 'pink',
        content: <BlynkCodeStep projectIdea={projectIdea} components={components} />,
    },
    {
        id: 'test',
        icon: <Upload className="w-7 h-7 text-emerald-400" />,
        title: 'Step 7 — Test Your Connection',
        subtitle: 'See your device go online in real time.',
        color: 'emerald',
        content: (
            <div className="space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                    After uploading the code, follow these steps to verify everything is working:
                </p>
                <div className="space-y-2">
                    {[
                        'Open Arduino IDE → Tools → Serial Monitor → Set baud to 115200',
                        'Press the RESET button on your ESP32',
                        'Watch the serial monitor — you should see "Connecting to WiFi..."',
                        'Then "Connected! IP: 192.168.x.x" and "Blynk connected!"',
                        'Open your Blynk app or blynk.cloud — your device shows ● ONLINE in green',
                        'Your sensor data should now appear on the dashboard widgets!',
                    ].map((text, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-emerald-400 text-xs font-black">{i + 1}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-400/25 rounded-xl">
                    <p className="text-emerald-300 font-bold text-sm mb-2">🔧 Troubleshooting</p>
                    <div className="space-y-1 text-xs text-slate-400">
                        <p><span className="text-red-400">❌ WiFi not connecting</span> → Double-check SSID and password (case-sensitive!)</p>
                        <p><span className="text-red-400">❌ Blynk not connecting</span> → Check your Auth Token — even one wrong character fails</p>
                        <p><span className="text-red-400">❌ No data on dashboard</span> → Verify virtual pin (V0) matches datastream assignment</p>
                        <p><span className="text-amber-400">⚠️ Device shows offline</span> → Make sure your WiFi router is 2.4GHz, not 5GHz only</p>
                    </div>
                </div>
            </div>
        ),
    },
  ];
}

// ── Blynk Code Step Subcomponent ────────────────────────────
interface BlynkCodeStepProps {
    projectIdea: string;
    components: string[];
}
function BlynkCodeStep({ projectIdea, components }: BlynkCodeStepProps) {
    const [copied, setCopied] = useState(false);

    const code = buildBlynkCode(components, projectIdea);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <p className="text-slate-300 text-sm">
                This code was generated <strong className="text-white">specifically for your project</strong> and components.
                Replace the 5 placeholders marked with <span className="text-amber-400 font-mono">←</span>.
            </p>
            <div className="relative">
                <pre className="bg-black/50 border border-white/8 rounded-xl p-4 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-64 leading-relaxed">
                    {code}
                </pre>
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs text-white font-bold transition-all"
                >
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
                </button>
            </div>
            <div className="p-3 bg-blue-500/8 border border-blue-400/20 rounded-xl">
                <p className="text-blue-300 text-xs font-bold mb-1">📦 Required Library</p>
                <p className="text-slate-400 text-xs">Arduino IDE → Sketch → Include Library → Manage Libraries → Search <span className="text-white font-mono">"Blynk"</span> → Install by Volodymyr Shymanskyy</p>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────
export function BlynkSetupGuide({ projectIdea, components, onComplete, onBack }: BlynkSetupGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const BLYNK_STEPS = buildSteps(projectIdea, components);

    const step = BLYNK_STEPS[currentStep];
    const isLast = currentStep === BLYNK_STEPS.length - 1;
    const isFirst = currentStep === 0;

    const markComplete = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
    };

    const goNext = () => {
        markComplete();
        if (isLast) {
            onComplete();
        } else {
            setCurrentStep(s => s + 1);
        }
    };

    const goPrev = () => {
        if (isFirst) {
            onBack();
        } else {
            setCurrentStep(s => s - 1);
        }
    };

    const colorMap: Record<string, string> = {
        cyan: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-400',
        violet: 'bg-violet-500/15 border-violet-400/30 text-violet-400',
        emerald: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400',
        indigo: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-400',
        amber: 'bg-amber-500/15 border-amber-400/30 text-amber-400',
        pink: 'bg-pink-500/15 border-pink-400/30 text-pink-400',
    };

    return (
        <div className="relative min-h-screen flex items-start justify-center p-6 bg-transparent overflow-hidden">

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-600/6 blur-[120px] animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-violet-500/6 blur-[80px] animate-float" style={{ animationDelay: '4s' }} />
                <div className="absolute inset-0 circuit-bg opacity-20" />
            </div>

            <div className="relative z-10 w-full max-w-2xl animate-fade-up pt-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-400/20 rounded-full mb-2">
                            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-300 text-xs font-bold uppercase tracking-widest">Blynk IoT Setup Guide</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight truncate max-w-sm">{projectIdea}</h1>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs">Step</p>
                        <p className="text-white font-black text-2xl">{currentStep + 1}<span className="text-slate-600 text-base">/{BLYNK_STEPS.length}</span></p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / BLYNK_STEPS.length) * 100}%` }}
                        />
                    </div>
                    {/* Step dots */}
                    <div className="flex justify-between mt-2">
                        {BLYNK_STEPS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => i <= currentStep && setCurrentStep(i)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all
                                    ${completedSteps.has(i)
                                        ? 'bg-emerald-500 border-emerald-400 text-white'
                                        : i === currentStep
                                            ? 'bg-cyan-500 border-cyan-400 text-white scale-110'
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

                    {/* Step icon + title */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${colorMap[step.color]}`}>
                            {step.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">{step.title}</h2>
                            <p className="text-slate-400 text-sm mt-0.5">{step.subtitle}</p>
                        </div>
                    </div>

                    {/* Step content */}
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
                            bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-900/30"
                    >
                        {isLast ? '🎉 All Done — View My Circuit!' : 'Got it — Next Step!'}
                        {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

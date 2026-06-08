'use client';

import React, { useState } from 'react';
import { Code2, Copy, Check, Download, ChevronRight, Terminal, Lightbulb, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeReviewPanelProps {
    arduinoCode: string;
    systemLogic?: any;
    onContinue: () => void;
}

export function CodeReviewPanel({ arduinoCode, systemLogic, onContinue }: CodeReviewPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!arduinoCode) return;
        try {
            await navigator.clipboard.writeText(arduinoCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard error:', err);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([arduinoCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sketch.ino';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Count lines for status bar
    const lineCount = arduinoCode.split('\n').length;
    const charCount = arduinoCode.length;

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 overflow-y-auto pb-32">
            <div className="max-w-[1400px] mx-auto animate-in fade-in zoom-in-95 duration-500">

                {/* Header */}
                <div className="flex justify-between items-end mb-8 mt-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/20 rounded-full mb-3">
                            <Code2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Phase 7 · Code Review</span>
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Software & Logic Review</h1>
                        <p className="text-slate-400 text-lg max-w-2xl">
                            Understand how the code translates your project logic into actual hardware commands.
                        </p>
                    </div>
                    <Button
                        onClick={onContinue}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl px-8 py-6 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2"
                    >
                        Complete Project <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
                    {/* Left: Code panel */}
                    <div className="backdrop-blur-xl bg-slate-950 border border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/5 flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                <div className="flex items-center gap-1.5 ml-3">
                                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-xs font-mono text-slate-500">sketch.ino</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
                                >
                                    {copied
                                        ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                                        : <><Copy className="w-3.5 h-3.5" /> Copy</>
                                    }
                                </button>
                                <div className="w-px h-4 bg-white/10" />
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-[#0d1117] relative">
                            <pre className="font-mono text-[13px] text-amber-100/85 p-6 whitespace-pre pb-10 leading-relaxed">
                                {arduinoCode || '// No code generated yet.'}
                            </pre>
                        </div>

                        <div className="flex items-center justify-between px-5 py-2 bg-slate-900 border-t border-white/5 text-xs font-mono text-slate-600 shrink-0">
                            <span>{lineCount} lines · {charCount} chars</span>
                            <span className="flex items-center gap-1.5 text-emerald-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Auto-Generated
                            </span>
                        </div>
                    </div>

                    {/* Right: Code Walkthrough */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col overflow-y-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">How The Code Works</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Main Loop Breakdown */}
                            <div className="bg-slate-950/40 border border-white/10 p-5 rounded-xl">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 block">Step 1: The Main Logic / Conditions</span>
                                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                                    Inside the <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">void loop()</code> function, the microcontroller continuously checks conditions and fires actions.
                                </p>

                                {systemLogic?.displayConditions?.map((cond: string, idx: number) => (
                                    <div key={idx} className="mb-4 last:mb-0 relative pl-4 border-l-2 border-slate-700">
                                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 font-mono text-[9px] flex items-center justify-center text-slate-400">{idx + 1}</div>
                                        <p className="text-sm font-semibold text-white mb-2">{cond}</p>
                                        <div className="flex items-start gap-2 text-sm text-slate-400">
                                            <GitMerge className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                                            <p className="text-emerald-300">
                                                {systemLogic?.actions?.[idx] || "Performs designated safety / target action"}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {(!systemLogic || !systemLogic.displayConditions || systemLogic.displayConditions.length === 0) && (
                                    <div className="text-sm text-slate-400 italic">No specific conditions found for this circuit logic. It runs continuously.</div>
                                )}
                            </div>

                            {/* Important Functions */}
                            <div className="bg-slate-950/40 border border-white/10 p-5 rounded-xl">
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 block">Step 2: Key Arduino Functions Used</span>
                                <ul className="space-y-3">
                                    <li className="text-sm border-b border-white/5 pb-3">
                                        <code className="text-purple-300">pinMode(pin, MODE)</code>
                                        <p className="text-slate-400 mt-1">Configures specific pins as INPUT (reading sensors) or OUTPUT (triggering buzzers, relays, LEDs). Done in <code className="text-amber-200">void setup()</code>.</p>
                                    </li>
                                    <li className="text-sm border-b border-white/5 pb-3">
                                        <code className="text-purple-300">digitalWrite(pin, HIGH/LOW)</code>
                                        <p className="text-slate-400 mt-1">Turns a digital pin ON (5V) or OFF (0V). This is exactly how the code signals a buzzer, turns on an LED, or clicks a relay.</p>
                                    </li>
                                    <li className="text-sm border-b border-white/5 pb-3">
                                        <code className="text-purple-300">digitalRead / analogRead</code>
                                        <p className="text-slate-400 mt-1">Gathers data from the physical world by checking if a pin sees 5V (digital) or measuring voltage level (analog).</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

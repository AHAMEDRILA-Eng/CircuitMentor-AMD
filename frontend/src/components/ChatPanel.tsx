'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X } from 'lucide-react';
import { UIPhase, useProjectStore } from '@/store/useProjectStore';
import { api } from '@/api/client';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    phase: UIPhase;
    selectedComponents?: string[];
    systemLogicSummary?: string;   // read-only plain text summary
    arduinoCodeSnapshot?: string;  // read-only, never editable
}

const PHASE_CONTEXT: Partial<Record<UIPhase, { greeting: string; hint: string }>> = {
    IDEA_EXPLANATION: {
        greeting: "I'm your circuit mentor! I just explained your project. Ask me anything about why these components make sense, or how the system works conceptually.",
        hint: "Try: \"Why do I need a PIR sensor?\" or \"What is the working principle?\"",
    },
    COMPONENT_SELECTION: {
        greeting: "Feel free to ask about any component. I can explain what it does, whether you need it, and what happens if you remove it.",
        hint: "Try: \"What does the relay do?\" or \"Can I use LDR instead of PIR?\"",
    },
    COMPONENT_TEACHING: {
        greeting: "Let's learn about your components! Ask me how any of them work, their pinout, or how they connect in your circuit.",
        hint: "Try: \"How does the DHT11 read temperature?\" or \"What voltage does a PIR need?\"",
    },
    SYSTEM_LOGIC_VIEW: {
        greeting: "The system logic has been generated deterministically from your components. I can explain why specific conditions or actions were chosen.",
        hint: "Try: \"Why is this condition used?\" or \"What happens if pirState is LOW?\"",
    },
    CODE_REVIEW: {
        greeting: "Your sketch is ready. I can explain any line of code — the pin constants, the setup() function, or the loop() conditions.",
        hint: "Try: \"What does pinMode() do?\" or \"Explain the if condition in loop()\"",
    },
    COMPLETED: {
        greeting: "Congratulations on completing your project! Ask me anything for revision or ask how to extend your circuit.",
        hint: "Try: \"How do I add a second sensor?\" or \"How do I deploy this on ESP32?\"",
    },
};

export function ChatPanel({ phase, selectedComponents = [], systemLogicSummary = '', arduinoCodeSnapshot = '' }: ChatPanelProps) {
    const { idea, selectedPlatform, experienceLevel } = useProjectStore();

    const [messages, setMessages] = useState<Message[]>(() => {
        const ctx = PHASE_CONTEXT[phase];
        return ctx ? [{ role: 'assistant', content: ctx.greeting }] : [];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reset greeting when phase changes
    useEffect(() => {
        const ctx = PHASE_CONTEXT[phase];
        if (ctx) {
            setMessages([{ role: 'assistant', content: ctx.greeting }]);
        }
    }, [phase]);

    const buildSystemPrompt = () => `
You are Circuit Mentor — a friendly, structured electronics tutor.
Current phase: ${phase}
Selected components: ${selectedComponents.join(', ') || 'none yet'}
${systemLogicSummary ? `System logic summary: ${systemLogicSummary}` : ''}
${arduinoCodeSnapshot ? `Arduino code is available (read-only). Do not regenerate it.` : ''}

Rules you MUST follow:
1. You are an EXPLAINER only. Never generate Arduino code.
2. Never suggest skipping a phase or unlocking premium features.
3. Never modify any component selection directly — explain the consequence and ask confirmation.
4. If asked to generate code, say: "Code is generated deterministically by the engine — I can only explain it."
5. Keep answers focused, educational, and concise (2–4 sentences max per point).
6. Use simple language appropriate for electronics students.
`.trim();

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMsg: Message = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            
            const result = await api.chat(
                phase,
                {
                    idea,
                    selectedComponents,
                    selectedPlatform: selectedPlatform ?? '',
                    experienceLevel: experienceLevel ?? 'beginner',
                    systemLogicSummary,
                    arduinoCodeSnapshot,
                },
                trimmed,
                history  // pass conversation history
            );

            const reply = result.ok
                ? (result.data?.response ?? 'I had trouble understanding that. Please try rephrasing.')
                : 'Sorry, I could not reach the mentor service right now.';

            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const ctx = PHASE_CONTEXT[phase];

    return (
        <div className="flex flex-col h-full bg-slate-950 border-l border-white/8">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Circuit Mentor</p>
                    <p className="text-xs text-slate-500">Explanation only · Never generates code</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/8 scrollbar-track-transparent">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                            ${msg.role === 'assistant'
                                ? 'bg-indigo-500/20 border border-indigo-400/30'
                                : 'bg-slate-700 border border-white/10'
                            }`}>
                            {msg.role === 'assistant'
                                ? <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                : <User className="w-3.5 h-3.5 text-slate-300" />
                            }
                        </div>
                        <div className={`
                            max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'assistant'
                                ? 'bg-white/5 border border-white/8 text-slate-200 rounded-tl-sm'
                                : 'bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-sm'
                            }
                        `}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Hint */}
            {ctx?.hint && messages.length <= 1 && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-600 italic">{ctx.hint}</p>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/8 shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about your circuit…"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/40 transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, ArrowRight } from 'lucide-react';
import { api } from '@/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface ConversationalEntryProps {
  onIdeaConfirmed: (idea: string) => void;
}

// Mentor's opening line — student talks first after this
const OPENING_MESSAGE = `Hey! I'm your Circuit Mentor 👋

Tell me what's on your mind — it could be a project idea, something you saw online, a problem you want to solve, or even just "I have no idea what to build."

I'll help you figure it out.`;

// Friendly suggestion chips shown below the input
const STARTER_CHIPS = [
  "I have a college expo next week",
  "I want to build something cool with Arduino",
  "I'm completely new to electronics",
  "I saw a PIR motion sensor project online",
];

export function ConversationalEntry({ onIdeaConfirmed }: ConversationalEntryProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedIdea, setLockedIdea] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history for Groq
    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: trimmed },
    ];

    try {
      const result = await api.chat(
        'DISCOVERY_CHAT',
        { idea: '', selectedComponents: [], selectedPlatform: '', experienceLevel: 'beginner' },
        trimmed,
        historyRef.current.slice(0, -1) // pass history before this message
      );

      const reply: string = result.ok
        ? (result.data?.response ?? "Hmm, I didn't catch that. Could you tell me more?")
        : "Sorry, I'm having a moment. Could you say that again?";

      const extracted: string | null = result.ok
        ? (result.data?.extracted_idea ?? null)
        : null;

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];

      if (extracted) {
        setLockedIdea(extracted);
        setShowConfirm(true);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Something went wrong on my end. Try again?",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleChip = (text: string) => {
    setInput(text);
    sendMessage(text);
  };

  const handleConfirm = () => {
    if (lockedIdea) onIdeaConfirmed(lockedIdea);
  };

  const handleEditIdea = () => {
    setShowConfirm(false);
    setLockedIdea(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const showChips = messages.length <= 1;

  return (
    <div className="relative min-h-screen bg-transparent text-white font-sans flex flex-col">

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%)' }}
      />

      {/* Header badge */}
      <div className="relative z-10 flex justify-center pt-7 pb-2">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.06] text-[11px] font-bold tracking-[0.1em] text-indigo-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          Circuit Mentor · Let&apos;s Talk
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center pt-3 pb-5">
        <h1 className="text-[clamp(36px,5vw,58px)] font-black tracking-tight leading-none mb-2">
          <span className="text-slate-100">Circuit</span>
          <span className="bg-gradient-to-br from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Mentor</span>
        </h1>
        <p className="text-slate-500 text-[14px]">Start the conversation. We&apos;ll figure out the rest together.</p>
      </div>

      {/* Chat area */}
      <div className="relative z-10 flex-1 max-w-[720px] w-full mx-auto px-4 flex flex-col">

        {/* Messages */}
        <div className="flex-1 space-y-4 pb-4 overflow-y-auto" style={{ minHeight: 300, maxHeight: 'calc(100vh - 340px)' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5
                ${msg.role === 'assistant'
                  ? 'bg-indigo-500/20 border border-indigo-400/30'
                  : 'bg-slate-700/60 border border-white/10'
                }`}>
                {msg.role === 'assistant'
                  ? <Bot className="w-4 h-4 text-indigo-400" />
                  : <User className="w-4 h-4 text-slate-300" />
                }
              </div>

              {/* Bubble */}
              <div className={`
                max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === 'assistant'
                  ? 'bg-white/[0.05] border border-white/8 text-slate-200 rounded-tl-sm'
                  : 'bg-indigo-600/25 border border-indigo-500/25 text-white rounded-tr-sm'
                }
              `}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-white/[0.05] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}

          {/* Idea confirmed banner */}
          {showConfirm && lockedIdea && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 bg-indigo-500/[0.08] border border-indigo-500/25 rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-sm text-slate-300 mb-2">Here&apos;s the project idea I&apos;ve captured:</p>
                <p className="text-indigo-300 font-semibold text-sm mb-3 leading-relaxed">
                  &ldquo;{lockedIdea}&rdquo;
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Yes, let&apos;s build this
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleEditIdea}
                    className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:border-white/20 transition-colors"
                  >
                    Change it
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Starter chips — only on first message */}
        {showChips && (
          <div className="flex flex-wrap gap-2 mb-3 justify-center">
            {STARTER_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleChip(chip)}
                disabled={loading}
                className="px-3.5 py-1.5 rounded-full border border-white/8 bg-white/[0.03] text-[12px] text-slate-500 transition-all duration-200 hover:border-indigo-400/35 hover:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="pb-8">
          <div className="flex gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-2 focus-within:border-indigo-400/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Tell me what you're thinking..."
              disabled={loading}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-[1.05] shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-700 mt-2">
            Press Enter to send · Circuit Mentor will guide you to the right project
          </p>
        </div>

      </div>
    </div>
  );
}

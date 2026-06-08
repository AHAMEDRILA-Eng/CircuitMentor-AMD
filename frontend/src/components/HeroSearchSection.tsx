'use client';

import React, { useState, useEffect } from 'react';

interface HeroSearchSectionProps {
  onSearch?: (query: string) => void;
  exampleSuggestions?: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
}

const EXAMPLES = [
  { text: "Smart soil moisture monitor", icon: "💧" },
  { text: "Motion-activated alarm", icon: "🚨" },
  { text: "Temperature-controlled fan", icon: "🌡️" },
  { text: "Auto street light with LDR", icon: "💡" },
];

export function HeroSearchSection({
  onSearch,
  value = "",
  onChange,
  isLoading = false,
}: HeroSearchSectionProps) {
  const [localValue, setLocalValue] = useState(value);
  const [exIdx, setExIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Sync external value
  useEffect(() => { setLocalValue(value); }, [value]);

  // Typewriter effect
  useEffect(() => {
    if (localValue) return; 
    const example = EXAMPLES[exIdx].text;
    let timeout: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (typed.length < example.length) {
        timeout = setTimeout(() => setTyped(example.slice(0, typed.length + 1)), 60);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 2500);
      }
    } else {
      if (typed.length > 0) {
        timeout = setTimeout(() => setTyped(typed.slice(0, -1)), 25);
      } else {
        setExIdx(i => (i + 1) % EXAMPLES.length);
        setIsTyping(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [typed, isTyping, exIdx, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange?.(e);
  };

  const handleSearch = () => {
    const q = localValue.trim();
    if (q) onSearch?.(q);
  };

  const displayPlaceholder = localValue ? '' : `e.g. ${typed}`;

  return (
    <div className="relative min-h-screen bg-transparent text-white font-sans selection:bg-indigo-500/30">
      
      {/* Background Elements */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px'
        }} 
      />
      <div 
        className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none" 
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 65%)' }} 
      />
      <div 
        className="absolute top-[300px] -right-[80px] w-[350px] h-[350px] pointer-events-none" 
        style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)' }} 
      />

      <div className="relative z-10 max-w-[880px] mx-auto px-6">
        
        {/* Nav / Badge */}
        <div className="flex justify-center pt-7 pb-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.06] text-[11px] font-bold tracking-[0.1em] text-indigo-400 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            Electronics Education · AI Mentor
          </div>
        </div>

        {/* Hero Content */}
        <div className="text-center pt-4 pb-10">
          <h1 className="text-[clamp(52px,8vw,86px)] font-black tracking-tight leading-none mb-5">
            <span className="text-slate-100">Circuit</span>
            <span className="bg-gradient-to-br from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Mentor</span>
          </h1>
          <p className="text-[17px] text-slate-500 leading-relaxed mb-9">
            Type your project idea.<br/>
            <em className="not-italic text-slate-400 font-medium">We teach you to build it — and actually understand it.</em>
          </p>

          <div className="relative max-w-[580px] mx-auto mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 text-[15px]">⚡</span>
            <input
              type="text"
              value={localValue}
              onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              disabled={isLoading}
              placeholder={displayPlaceholder}
              className="w-full py-[15px] pr-[148px] pl-12 bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 text-sm outline-none transition-colors duration-200 focus:border-indigo-400/45 placeholder:text-slate-700"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !localValue.trim()}
              className="absolute right-[7px] top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 border-none rounded-lg text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
            >
              {isLoading ? 'Loading...' : 'Start Building →'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-14">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setLocalValue(ex.text);
                  onChange?.({ target: { value: ex.text } } as any);
                }}
                className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.025] text-[12px] text-slate-500 transition-all duration-200 hover:border-indigo-400/35 hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
              >
                {ex.icon} {ex.text}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline / Flow */}
        <div className="mb-14">
          <p className="text-center text-[10px] font-bold tracking-[0.14em] uppercase text-slate-700 mb-7">Your 8-phase learning journey</p>
          <div className="flex items-start justify-center">
            
            {[
              { id: 'idea', icon: '💡', name: 'Idea', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', hi: false },
              { id: 'components', icon: '🔩', name: 'Components', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hi: false },
              { id: 'teaching', icon: '📖', name: 'Teaching', bg: 'bg-purple-500/10', border: 'border-purple-500/20', hi: true },
              { id: 'circuit', icon: '🔌', name: 'Circuit', bg: 'bg-green-500/10', border: 'border-green-500/20', hi: false },
              { id: 'code', icon: '⚙️', name: 'Code', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hi: false },
              { id: 'understanding', icon: '🧠', name: 'Understanding', bg: 'bg-red-500/10', border: 'border-red-500/20', hi: true },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 w-[90px] shrink-0">
                  <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center text-[20px] border ${step.bg} ${step.border} backdrop-blur-sm shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg cursor-default`}>
                    {step.icon}
                  </div>
                  <span className={`text-[11px] font-medium text-center ${step.hi ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {step.name}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center shrink-0 mt-[26px]">
                    <div className="w-[22px] h-[1px] bg-indigo-500/25" />
                    <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-indigo-500/30" />
                  </div>
                )}
              </React.Fragment>
            ))}

          </div>
        </div>

        {/* Comparison Cards */}
        <div className="text-center text-[10px] font-bold tracking-[0.14em] uppercase text-slate-700 mb-7">What actually changes</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mb-[52px]">
          
          <div className="rounded-xl p-[18px] border border-white/5 bg-white/[0.018]">
            <div className="flex gap-[9px] items-start mb-3">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[9px] text-red-400 mt-[1px]">✕</span>
              <span className="text-[11px] text-slate-500 leading-relaxed">"Copied code from YouTube — no idea how it works"</span>
            </div>
            <div className="w-7 h-[1px] bg-white/[0.06] my-2.5" />
            <div className="flex gap-[9px] items-start">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400 mt-[1px]">✓</span>
              <span className="text-[11px] text-slate-400 leading-relaxed">"Can explain every line — examiner was impressed"</span>
            </div>
          </div>

          <div className="rounded-xl p-[18px] border border-white/5 bg-white/[0.018]">
            <div className="flex gap-[9px] items-start mb-3">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[9px] text-red-400 mt-[1px]">✕</span>
              <span className="text-[11px] text-slate-500 leading-relaxed">"ChatGPT gave generic code that didn't match my parts"</span>
            </div>
            <div className="w-7 h-[1px] bg-white/[0.06] my-2.5" />
            <div className="flex gap-[9px] items-start">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400 mt-[1px]">✓</span>
              <span className="text-[11px] text-slate-400 leading-relaxed">"Code built for my exact components and GPIO pins"</span>
            </div>
          </div>

          <div className="rounded-xl p-[18px] border border-white/5 bg-white/[0.018]">
            <div className="flex gap-[9px] items-start mb-3">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[9px] text-red-400 mt-[1px]">✕</span>
              <span className="text-[11px] text-slate-500 leading-relaxed">"Failed viva — couldn't answer basic questions"</span>
            </div>
            <div className="w-7 h-[1px] bg-white/[0.06] my-2.5" />
            <div className="flex gap-[9px] items-start">
              <span className="w-[17px] h-[17px] shrink-0 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400 mt-[1px]">✓</span>
              <span className="text-[11px] text-slate-400 leading-relaxed">"Passed confidently — knew why every component was chosen"</span>
            </div>
          </div>

        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center items-center py-9 border-t border-white/5 pb-16">
          <div className="text-center px-4 md:px-8">
            <div className="text-[32px] font-black text-slate-200 leading-none mb-1.5">8</div>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-700">Learning Phases</div>
          </div>
          <div className="hidden md:block w-[1px] h-9 bg-white/5" />
          <div className="text-center px-4 md:px-8 mt-6 md:mt-0">
            <div className="text-[32px] font-black text-slate-200 leading-none mb-1.5">0</div>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-700">Code Hallucinations</div>
          </div>
          <div className="hidden md:block w-[1px] h-9 bg-white/5" />
          <div className="text-center px-4 md:px-8 mt-6 md:mt-0">
            <div className="text-[32px] font-black text-slate-200 leading-none mb-1.5">25+</div>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-700">Components Supported</div>
          </div>
          <div className="hidden md:block w-[1px] h-9 bg-white/5" />
          <div className="text-center px-4 md:px-8 mt-6 md:mt-0">
            <div className="text-[32px] font-black text-slate-200 leading-none mb-1.5">3</div>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-700">IoT Platforms</div>
          </div>
        </div>

      </div>
    </div>
  );
}

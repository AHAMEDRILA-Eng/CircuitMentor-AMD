'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, AlertTriangle, HelpCircle, Zap, CheckCircle2 } from 'lucide-react';
import { TEACHING_DATA } from '@/lib/componentTeachingData'; // adjust path if needed

// ── Types (kept compatible with existing page.tsx sections prop) ──
interface Component {
  id: string;   // raw registry key e.g. "Sensor_DHT11"
  name: string;
  description: string;
  icon: string;
}

interface ComponentSection {
  category: string;
  components: Component[];
}

interface ComponentTeachingPanelProps {
  sections?: ComponentSection[];
  onContinue?: () => void;
}

// ── Teaching Card ─────────────────────────────────────────────
function TeachingCard({ componentId, index, total }: { componentId: string; index: number; total: number }) {
  const data = TEACHING_DATA[componentId];

  // Fallback for unknown components
  if (!data) {
    return (
      <div className="glass-strong border border-white/8 rounded-3xl p-8">
        <p className="text-slate-400 text-sm">No teaching data available for <code className="text-white">{componentId}</code>.</p>
      </div>
    );
  }

  return (
    <div className="glass-strong border border-white/8 rounded-3xl overflow-hidden animate-fade-up">

      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Component {index + 1} of {total}
          </span>
          <span className="text-2xl">{data.emoji}</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">{data.humanName}</h2>
      </div>

      {/* Content blocks */}
      <div className="p-8 space-y-5">

        {/* What it is */}
        <div className="p-5 bg-blue-500/8 border border-blue-400/20 rounded-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">What it is</p>
          <p className="text-slate-200 text-sm leading-relaxed">{data.whatItIs}</p>
        </div>

        {/* Examiner question */}
        <div className="p-5 bg-amber-500/8 border border-amber-400/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">Examiner Will Ask</p>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed italic">"{data.examinerQuestion}"</p>
        </div>

        {/* How it works */}
        <div className="p-5 bg-violet-500/8 border border-violet-400/20 rounded-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-2">How it works</p>
          <p className="text-slate-200 text-sm leading-relaxed">{data.howItWorks}</p>
        </div>

        {/* Wiring essentials */}
        <div className="p-5 bg-emerald-500/8 border border-emerald-400/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Wiring Essentials</p>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed font-mono">{data.wiringEssentials}</p>
        </div>

        {/* Common mistake */}
        <div className="p-5 bg-red-500/8 border border-red-400/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <p className="text-xs font-black uppercase tracking-widest text-red-400">Common Mistake</p>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{data.commonMistake}</p>
        </div>

      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function ComponentTeachingPanel({
  sections = [],
  onContinue,
}: ComponentTeachingPanelProps) {

  // Flatten all components from all sections into a single ordered list
  const allComponents = sections.flatMap(s => s.components);
  const total = allComponents.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [understood, setUnderstood] = useState<Set<number>>(new Set());

  const current = allComponents[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === total - 1;
  const allUnderstood = understood.size === total;

  const markUnderstood = () => {
    setUnderstood(prev => new Set([...prev, currentIdx]));
  };

  const goNext = () => {
    markUnderstood();
    if (!isLast) setCurrentIdx(i => i + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentIdx(i => i - 1);
  };

  if (total === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#07070F]">
        <p className="text-slate-500">No components to teach.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-start justify-center p-6 bg-[#07070F] overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/6 blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-500/6 blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 circuit-bg opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-2xl pt-8 pb-16">

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-400/20 rounded-full mb-3">
            <span className="text-violet-300 text-xs font-bold uppercase tracking-widest">Component Deep Dive</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Learn Your Components
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Understand each part before building — this is what examiners will ask about.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {allComponents.map((comp, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                i === currentIdx
                  ? 'bg-violet-500/20 border-violet-400/40 text-violet-300 scale-105'
                  : understood.has(i)
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {understood.has(i) && <CheckCircle2 className="w-3 h-3" />}
              {TEACHING_DATA[comp.id]?.emoji ?? '🔌'} {TEACHING_DATA[comp.id]?.humanName ?? comp.name}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>

        {/* Teaching card */}
        <div key={currentIdx}>
          <TeachingCard
            componentId={current.id}
            index={currentIdx}
            total={total}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {isLast ? (
            <button
              onClick={() => { markUnderstood(); onContinue?.(); }}
              className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95
                bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/30"
            >
              ✅ All done — Continue to Quiz
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95
                bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/30"
            >
              Got it — Next Component
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

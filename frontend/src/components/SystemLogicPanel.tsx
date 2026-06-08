'use client';

import React, { useState } from 'react';
import { ArrowRight, GitBranch, Cpu, CheckCircle2, Terminal, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SystemLogicData } from '@/logic/index';

interface SystemLogicPanelProps {
  data: SystemLogicData | null;
  onContinue: () => void;
}

// ── Inline Logic Challenge ─────────────────────────────────────
// Generates a question from the actual conditions + actions
// No Groq needed — fully deterministic from SystemLogicData

interface ChallengeQuestion {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

function buildChallenge(data: SystemLogicData): ChallengeQuestion {
  const condition = data.displayConditions[0] ?? 'the input condition is met';
  const action    = data.actions[0] ?? 'the output activates';

  // Extract key terms
  const conditionLower = condition.toLowerCase();
  const actionLower    = action.toLowerCase();

  // Build wrong options that sound plausible but are wrong
  const wrongOptions: string[] = [];

  if (conditionLower.includes('motion') || conditionLower.includes('pir')) {
    wrongOptions.push('When the push button is pressed');
    wrongOptions.push('When voltage drops below 3.3V');
    wrongOptions.push('When the relay coil is de-energised');
  } else if (conditionLower.includes('moisture') || conditionLower.includes('soil')) {
    wrongOptions.push('When soil moisture is above 80%');
    wrongOptions.push('When the button is held for 3 seconds');
    wrongOptions.push('When the ADC reads exactly 4095');
  } else if (conditionLower.includes('temperature') || conditionLower.includes('temp')) {
    wrongOptions.push('When humidity exceeds 90%');
    wrongOptions.push('When the LED is turned on');
    wrongOptions.push('When the relay switches to NC position');
  } else if (conditionLower.includes('light') || conditionLower.includes('ldr')) {
    wrongOptions.push('When motion is detected nearby');
    wrongOptions.push('When the buzzer beeps');
    wrongOptions.push('When power is first applied');
  } else if (conditionLower.includes('gas') || conditionLower.includes('smoke')) {
    wrongOptions.push('When the temperature drops below 0°C');
    wrongOptions.push('When WiFi disconnects');
    wrongOptions.push('When the button is pressed twice');
  } else if (conditionLower.includes('distance') || conditionLower.includes('ultrasonic')) {
    wrongOptions.push('When the LDR detects darkness');
    wrongOptions.push('When the relay is energised');
    wrongOptions.push('When the ADC reads 0');
  } else {
    wrongOptions.push('When the microcontroller resets');
    wrongOptions.push('When power is first applied');
    wrongOptions.push('When WiFi disconnects');
  }

  // Correct answer
  const correctAnswer = condition.charAt(0).toUpperCase() + condition.slice(1);

  // Shuffle options with correct answer at a random position
  const correctIdx = Math.floor(Math.random() * 4);
  const options = [...wrongOptions.slice(0, 3)];
  options.splice(correctIdx, 0, correctAnswer);

  return {
    question: `In this project, what condition triggers "${actionLower}"?`,
    options,
    correctIdx,
    explanation: `Correct! The logic is: when ${condition.toLowerCase()}, the system responds by activating ${actionLower}. This is the core decision your microcontroller makes in every loop cycle.`,
  };
}

function InlineChallenge({
  data,
  onPass,
}: {
  data: SystemLogicData;
  onPass: () => void;
}) {
  const challenge = React.useMemo(() => buildChallenge(data), [data]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setAttempts(a => a + 1);

    if (idx === challenge.correctIdx) {
      setTimeout(() => setRevealed(true), 500);
    } else {
      // Wrong — shake and reset after 1.5s
      setTimeout(() => setSelected(null), 1500);
    }
  };

  const passed = revealed;

  return (
    <div className={`mt-6 backdrop-blur-xl border rounded-2xl p-6 shadow-2xl transition-all duration-300
      ${passed ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 bg-white/5'}`}
    >
      {!passed ? (
        <div className="space-y-4">
          {/* Question */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
                Prove You Understand
              </p>
              <p className="text-white font-bold text-base leading-snug">
                {challenge.question}
              </p>
              {attempts > 1 && (
                <p className="text-slate-500 text-xs mt-1">
                  Hint: look at the "When these happen" section above ↑
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 pl-11">
            {challenge.options.map((opt, i) => {
              const isSelected = selected === i;
              const isWrong    = isSelected && i !== challenge.correctIdx;

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl border text-sm font-medium
                    transition-all duration-200 flex items-center justify-between gap-3
                    ${isWrong
                      ? 'border-red-400/40 bg-red-500/10 text-red-300 animate-shake'
                      : isSelected
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                        : 'border-white/8 bg-white/3 text-slate-300 hover:border-white/20 hover:bg-white/8'
                    }
                  `}
                >
                  <span>{opt}</span>
                  {isWrong && <XCircle className="w-4 h-4 shrink-0 text-red-400" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Passed state */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-black text-sm">Logic Confirmed!</p>
              <p className="text-slate-400 text-xs">You understand how the sensors and decisions link together.</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed pl-13">
            {challenge.explanation}
          </p>
          <Button
            size="lg"
            onClick={onPass}
            className="bg-green-500 hover:bg-green-600 text-white w-full rounded-xl font-bold
              shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02]
              flex items-center justify-center gap-2"
          >
            Proceed to Components
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function SystemLogicPanel({ data, onContinue }: SystemLogicPanelProps) {
  if (!data) return null;

  const conditionString = data.displayConditions.length > 0
    ? data.displayConditions.join(' && ')
    : 'true';

  const pseudoCode = `void loop() {\n  // Your circuit's core decision logic\n  if ( ${conditionString} ) {\n${data.actions.map(a => `    // → ${a}`).join('\n')}\n  }\n}`;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex justify-center">
      <div className="max-w-4xl w-full animate-in fade-in zoom-in-95 duration-500 pb-20">

        {/* Header */}
        <div className="text-center mb-10 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-400/20 rounded-full mb-6">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
              Phase 2: System Logic View
            </span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">How the System Thinks</h1>
          <p className="text-indigo-200/80 text-lg max-w-2xl mx-auto">
            Before looking at components, understand the decision logic that drives your circuit.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

          {/* Left: Logic Blocks */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Hardware Decisions
            </h2>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500 opacity-80" />

              <p className="text-slate-300 mb-6 font-medium leading-relaxed">
                Architecture Strategy:{' '}
                <span className="font-bold text-emerald-400">{data.logicType.replace('_', ' ')}</span>
              </p>

              {/* Conditions */}
              <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  When these happen:
                </h4>
                <div className="space-y-2">
                  {data.displayConditions.length > 0
                    ? data.displayConditions.map((cond, i) => (
                        <div key={i} className="font-mono text-sm text-emerald-200 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20">
                          {cond}
                        </div>
                      ))
                    : <div className="text-slate-500 text-sm">No specific input conditions.</div>
                  }
                </div>
              </div>

              {/* Actions */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Then do this:
                </h4>
                <ul className="space-y-2 list-none p-0">
                  {data.actions.length > 0
                    ? data.actions.map((action, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                          {action}
                        </li>
                      ))
                    : <li className="text-slate-500 text-sm">No actions mapped yet.</li>
                  }
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Pseudo Code */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Terminal className="w-5 h-5 text-blue-400" />
              Pseudo Code Translation
            </h2>

            <div className="backdrop-blur-xl bg-slate-950 border border-blue-500/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-xs font-mono text-slate-500 ml-2">logic.ino</span>
              </div>
              <pre className="font-mono text-sm text-blue-300 whitespace-pre-wrap leading-relaxed">
                {pseudoCode}
              </pre>
            </div>

            {/* Explanation of pseudo code */}
            <div className="backdrop-blur-xl bg-white/3 border border-white/8 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                What this means
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your microcontroller runs this logic thousands of times per second.
                Every time through the loop, it checks the conditions above.
                If they are true, it fires the actions. This is the heartbeat of your circuit.
              </p>
            </div>
          </div>
        </div>

        {/* Inline Challenge — replaces the old "Yes, logic is clear" button */}
        <InlineChallenge data={data} onPass={onContinue} />

      </div>
    </div>
  );
}

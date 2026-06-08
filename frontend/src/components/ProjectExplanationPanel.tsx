'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Zap, Globe, Cpu, Radio, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export interface ProjectExplanationData {
  problem_statement: string;
  real_world_use_case: string;
  working_principle: string;
  power_flow_summary: string;
  signal_flow_summary: string;
}

interface ProjectExplanationPanelProps {
  data: ProjectExplanationData | null;
  mcuName: string;
  inputName?: string;
  outputName?: string;
  onContinue: () => void;
}

// ── Utility: extract signal flow nodes from signal_flow_summary ──
function extractSignalNodes(signalFlow: string, mcuName: string, inputName?: string, outputName?: string): string[] {
  // Try to find GPIO mentions in the text
  const gpioMatches = signalFlow.match(/GPIO\s*(?:Pin\s*)?\d+/gi) ?? [];
  
  const mcuLabel = mcuName.includes('Arduino') ? 'Arduino' : (mcuName.includes('ESP32') ? 'ESP32' : 'MCU');
  const gpioLabel = mcuLabel === 'Arduino' ? 'Pin' : 'GPIO';

  const inLabel = inputName ? inputName.replace('Sensor_', '').replace('Input_', '').replace(/_/g, ' ') : 'Sensor';
  const outLabel = outputName ? outputName.replace('Actuator_', '').replace('Display_', '').replace(/_/g, ' ') : 'Actuator';

  const gpio1 = gpioMatches[0] ?? gpioLabel;
  const gpio2 = gpioMatches[1] ?? gpioLabel;

  return [inLabel, gpio1, mcuLabel, gpio2, outLabel];
}

// ── Stage type ──────────────────────────────────────────────────
type Stage = 'problem' | 'realworld' | 'working' | 'signal' | 'challenge' | 'ready';

// ── Working principle sentence-by-sentence reveal ───────────────
function WorkingPrincipleReveal({ text }: { text: string }) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= sentences.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 900);
    return () => clearTimeout(t);
  }, [visible, sentences.length]);

  return (
    <div className="space-y-3">
      {sentences.map((s, i) => (
        <p
          key={i}
          className="text-slate-200 text-base leading-relaxed transition-all duration-700"
          style={{
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <span className="text-amber-400 font-bold mr-2">{i + 1}.</span>
          {s.trim()}
        </p>
      ))}
      {visible < sentences.length && (
        <div className="flex items-center gap-2 text-slate-500 text-sm animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Revealing...
        </div>
      )}
    </div>
  );
}

// ── Signal flow animation ────────────────────────────────────────
function SignalFlowAnimation({ nodes }: { nodes: string[] }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [pulseIdx, setPulseIdx] = useState(-1);

  useEffect(() => {
    // Animate nodes appearing one by one
    nodes.forEach((_, i) => {
      setTimeout(() => setActiveIdx(i), i * 500 + 300);
    });
    // Then pulse the signal
    const pulseStart = nodes.length * 500 + 800;
    nodes.forEach((_, i) => {
      setTimeout(() => setPulseIdx(i), pulseStart + i * 300);
    });
  }, [nodes.length]);

  const nodeColors = [
    'from-blue-500 to-cyan-500',
    'from-cyan-500 to-emerald-500',
    'from-emerald-500 to-amber-500',
    'from-amber-500 to-orange-500',
    'from-orange-500 to-red-500',
  ];

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-center justify-center gap-0 min-w-max mx-auto px-4">
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            {/* Node */}
            <div
              className="flex flex-col items-center transition-all duration-500"
              style={{
                opacity: activeIdx >= i ? 1 : 0,
                transform: activeIdx >= i ? 'scale(1)' : 'scale(0.5)',
              }}
            >
              <div
                className={`
                  relative w-16 h-16 rounded-2xl flex items-center justify-center
                  bg-gradient-to-br ${nodeColors[i % nodeColors.length]}
                  shadow-lg transition-all duration-300
                  ${pulseIdx >= i ? 'ring-2 ring-white/40 shadow-2xl scale-110' : ''}
                `}
              >
                {/* Pulse ring */}
                {pulseIdx === i && (
                  <div className="absolute inset-0 rounded-2xl animate-ping bg-white/20" />
                )}
                <span className="text-white text-xs font-black text-center leading-tight px-1">{node}</span>
              </div>
              <span className="text-slate-400 text-[10px] mt-2 font-mono">
                {i === 0 ? 'INPUT' : i === nodes.length - 1 ? 'OUTPUT' : i === Math.floor(nodes.length / 2) ? 'PROCESS' : 'SIGNAL'}
              </span>
            </div>

            {/* Arrow between nodes */}
            {i < nodes.length - 1 && (
              <div
                className="flex items-center transition-all duration-500 mx-1"
                style={{ opacity: activeIdx > i ? 1 : 0.1 }}
              >
                <div
                  className="h-0.5 w-8 bg-gradient-to-r from-white/20 to-white/60 relative overflow-hidden"
                >
                  {pulseIdx > i && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-white/60 -ml-1" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Signal description */}
      <p className="text-center text-slate-400 text-xs mt-6 max-w-md mx-auto leading-relaxed">
        Data flows left to right through your circuit — each node processes and passes the signal to the next
      </p>
    </div>
  );
}

// ── Dynamic challenge builder ────────────────────────────────────
interface ChallengeCard {
  question: string;
  options: string[];
  correctIdx: number;
}

function buildSocraticChallenge(powerSummary: string, mcuName: string): ChallengeCard {
  const p = powerSummary.toLowerCase();
  const mcuLabel = mcuName.includes('Arduino') ? 'Arduino' : (mcuName.includes('ESP32') ? 'ESP32' : 'MCU');
  const logicVoltage = mcuLabel === 'Arduino' ? '5V' : '3.3V';
  const pinName = mcuLabel === 'Arduino' ? 'Digital pin' : 'GPIO pin';

  // Relay project
  if (p.includes('relay') || p.includes('coil') || p.includes('70ma')) {
    return {
      question: `Why can't the ${mcuLabel} ${pinName} directly power the relay coil?`,
      options: [
        `${pinName}s only output 1V — not enough voltage for the relay`,
        `${pinName}s are limited to 12-40mA but relay coils draw 70mA+`,
        `Relays only work with AC power, not DC`,
        `${mcuLabel} doesn't support OUTPUT mode on pins`,
      ],
      correctIdx: 1,
    };
  }

  // Gas / MQ2 sensor
  if (p.includes('gas') || p.includes('mq') || p.includes('heater') || p.includes('150ma')) {
    return {
      question: `Why must the MQ-2 gas sensor be powered from the 5V rail and NOT from an ${mcuLabel} ${pinName}?`,
      options: [
        "The MQ-2 only works with AC power",
        `The MQ-2 heater draws 150mA — far more than a ${pinName}'s 12-40mA limit`,
        `${pinName}s output ${logicVoltage} but MQ-2 needs exactly 5.5V`,
        "The MQ-2 uses I2C which conflicts with output mode",
      ],
      correctIdx: 1,
    };
  }

  // Water pump
  if (p.includes('pump') || p.includes('motor') || p.includes('300ma') || p.includes('200ma')) {
    return {
      question: `Why does the water pump need to be controlled through a relay instead of directly from a ${pinName}?`,
      options: [
        `The pump runs on AC power which ${pinName}s cannot handle`,
        `The pump draws 200-300mA which would instantly destroy a ${pinName} limited to 12-40mA`,
        `${pinName}s cannot output HIGH and LOW fast enough for the pump`,
        "The pump requires a PWM signal that the pin doesn't support",
      ],
      correctIdx: 1,
    };
  }

  // Servo motor
  if (p.includes('servo') || p.includes('650ma') || p.includes('stall')) {
    return {
      question: `Why should the SG90 servo motor be powered from a separate 5V supply instead of the ${mcuLabel}'s ${logicVoltage} pin?`,
      options: [
        "Servos only work at exactly 6V — 5V is too low",
        `The servo can draw up to 650mA under stall load — more than the ${mcuLabel} power pin can supply`,
        `The ${mcuLabel} ${logicVoltage} pin is only for analog sensors, not motors`,
        "Servos need AC power to operate",
      ],
      correctIdx: 1,
    };
  }

  // DHT11 / temperature sensor
  if (p.includes('dht') || p.includes('humidity') || p.includes('temperature') || p.includes('pull-up') || p.includes('pullup')) {
    return {
      question: "Why does the DHT11 sensor need a 10kΩ pull-up resistor on its DATA pin?",
      options: [
        "To limit current and prevent the sensor from burning out",
        "The DATA line uses open-drain signalling — the resistor keeps it HIGH when idle so the sensor can pull it LOW to send data",
        `To convert 5V signals to ${logicVoltage} for the ${mcuLabel}`,
        "To filter noise from the analog reading",
      ],
      correctIdx: 1,
    };
  }

  // Soil moisture / irrigation
  if (p.includes('soil') || p.includes('moisture') || p.includes('irrigation') || p.includes('electrolysis')) {
    return {
      question: "Why should you power the soil moisture sensor only during readings instead of leaving it on continuously?",
      options: [
        "The sensor overheats if powered for more than 5 seconds",
        "Constant DC current causes electrolysis which corrodes the metal probes within days",
        `The ${mcuLabel} doesn't have enough power to run sensors continuously`,
        "The sensor interferes with WiFi when powered continuously",
      ],
      correctIdx: 1,
    };
  }

  // Ultrasonic / HC-SR04
  if (p.includes('ultrasonic') || p.includes('echo') || p.includes('trig') || p.includes('5v signal')) {
    return {
      question: `The HC-SR04 ECHO pin outputs 5V. Why is this dangerous for a ${logicVoltage} ${mcuLabel}?`,
      options: [
        `5V causes the ${mcuLabel} to enter bootloader mode`,
        `${mcuLabel} ${pinName}s are only ${logicVoltage} tolerant — a 5V signal can permanently destroy the pin`,
        `5V signals are too fast for the ${mcuLabel} to read accurately`,
        `The ECHO pin conflicts with the ${mcuLabel}'s internal pull-up resistors`,
      ],
      correctIdx: 1,
    };
  }

  // LDR / light sensor
  if (p.includes('ldr') || p.includes('photoresistor') || p.includes('voltage divider') || p.includes('light')) {
    return {
      question: `Why does an LDR need a fixed 10kΩ resistor to produce a readable output on the ${mcuLabel}?`,
      options: [
        "The resistor protects the LDR from overcurrent",
        "An LDR only changes resistance — paired with a fixed resistor in a voltage divider, it produces a variable voltage the ADC can read",
        "The resistor converts the analog signal to digital",
        `Without the resistor the LDR outputs 12V which would damage the ${mcuLabel}`,
      ],
      correctIdx: 1,
    };
  }

  // Buzzer
  if (p.includes('buzzer') || p.includes('oscillator') || p.includes('beep')) {
    return {
      question: "What is the key difference between an active and passive buzzer, and which one is in your project?",
      options: [
        "Active buzzers are louder; passive buzzers are quieter — both need PWM",
        "Active buzzers have a built-in oscillator and beep with just DC power; passive buzzers need a tone() PWM signal",
        `Passive buzzers work on 5V; active buzzers work on ${logicVoltage} only`,
        "There is no difference — both work identically with digitalWrite()",
      ],
      correctIdx: 1,
    };
  }

  // LED
  if (p.includes('led') || p.includes('forward voltage') || p.includes('220') || p.includes('resistor')) {
    return {
      question: `What happens if you connect an LED directly to an ${mcuLabel} ${pinName} without a series resistor?`,
      options: [
        "The LED glows at half brightness to protect itself",
        `Excessive current flows (50mA+) which instantly destroys the LED and/or the ${pinName}`,
        "The LED blinks automatically without any code",
        "Nothing — LEDs have built-in current limiting",
      ],
      correctIdx: 1,
    };
  }

  // Default fallback
  return {
    question: `The ${mcuLabel} operates at ${logicVoltage} logic. What happens if you connect a higher voltage sensor signal directly to its ${pinName}?`,
    options: [
      `The ${mcuLabel} automatically converts the signal to ${logicVoltage}`,
      `The higher voltage exceeds the ${pinName}'s absolute maximum rating and can permanently damage or destroy the pin`,
      "The reading will be twice the expected value",
      `Nothing — ${mcuLabel} ${pinName}s are tolerant of higher voltages`,
    ],
    correctIdx: 1,
  };
}

// ── Socratic Challenge ───────────────────────────────────────────
function SocraticChallenge({
  powerSummary,
  mcuName,
  onAnswered,
}: {
  powerSummary: string;
  mcuName: string;
  onAnswered: () => void;
}) {
  const challenge = React.useMemo(() => buildSocraticChallenge(powerSummary, mcuName), [powerSummary, mcuName]);

  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setTimeout(() => setRevealed(true), 600);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Before You Build</p>
          <p className="text-white font-bold text-lg leading-snug">{challenge.question}</p>
        </div>
      </div>

      <div className="space-y-2">
        {challenge.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === challenge.correctIdx;
          const showResult = revealed;

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={`
                w-full text-left px-4 py-3 rounded-xl border text-sm font-medium
                transition-all duration-300 flex items-center justify-between gap-3
                ${showResult && isCorrect
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                  : showResult && isSelected && !isCorrect
                    ? 'border-red-400/40 bg-red-500/10 text-red-300'
                    : isSelected
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                      : 'border-white/8 bg-white/3 text-slate-300 hover:border-white/20 hover:bg-white/8'
                }
              `}
            >
              <span>{opt}</span>
              {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Explanation reveal */}
      {revealed && (
        <div className={`p-4 border rounded-xl animate-fade-up space-y-3 
          ${selected === challenge.correctIdx ? 'bg-emerald-500/8 border-emerald-400/20' : 'bg-red-500/8 border-red-400/20'}
        `}>
          {selected === challenge.correctIdx ? (
            <p className="text-emerald-300 font-bold text-sm">✅ Exactly right!</p>
          ) : (
            <p className="text-red-300 font-bold text-sm">❌ Not quite! The correct answer was: {challenge.options[challenge.correctIdx]}</p>
          )}
          <p className="text-slate-300 text-sm leading-relaxed">{powerSummary}</p>
          <button
            onClick={onAnswered}
            className={`w-full mt-2 py-3 rounded-xl flex items-center justify-center gap-2 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 ${
              selected === challenge.correctIdx
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:ring-4 focus:ring-emerald-500/30'
                : 'bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 focus:ring-4 focus:ring-slate-500/30'
            }`}
          >
            I understand — Continue to Components
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stage config ─────────────────────────────────────────────────
const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; color: string }> = {
  problem: { label: 'The Problem', icon: <Zap className="w-4 h-4" />, color: 'text-blue-400 border-blue-400/30 bg-blue-500/10' },
  realworld: { label: 'Real World', icon: <Globe className="w-4 h-4" />, color: 'text-violet-400 border-violet-400/30 bg-violet-500/10' },
  working: { label: 'How It Works', icon: <Cpu className="w-4 h-4" />, color: 'text-amber-400 border-amber-400/30 bg-amber-500/10' },
  signal: { label: 'Signal Journey', icon: <Radio className="w-4 h-4" />, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' },
  challenge: { label: 'Challenge', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-400 border-orange-400/30 bg-orange-500/10' },
  ready: { label: 'Ready', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' },
};

const STAGE_ORDER: Stage[] = ['problem', 'realworld', 'working', 'signal', 'challenge'];

// ── Main Component ───────────────────────────────────────────────
export function ProjectExplanationPanel({ data, mcuName, inputName, outputName, onContinue }: ProjectExplanationPanelProps) {
  const [stage, setStage] = useState<Stage>('problem');
  const [workingDone, setWorkingDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  // Sanitize LLM hallucinations (sometimes Groq forces 'ESP32' even for Arduino projects)
  const mcuLabel = mcuName.includes('Arduino') ? 'Arduino Uno' : (mcuName.includes('ESP32') ? 'ESP32' : mcuName.replace('MCU_', ''));
  const isArduino = mcuName.includes('Arduino');
  
  const sanitizedData = {
    problem_statement: isArduino ? data.problem_statement.replace(/ESP32/g, mcuLabel) : data.problem_statement,
    real_world_use_case: isArduino ? data.real_world_use_case.replace(/ESP32/g, mcuLabel) : data.real_world_use_case,
    working_principle: isArduino ? data.working_principle.replace(/ESP32/g, mcuLabel) : data.working_principle,
    power_flow_summary: isArduino ? data.power_flow_summary.replace(/ESP32/g, mcuLabel) : data.power_flow_summary,
    signal_flow_summary: isArduino ? data.signal_flow_summary.replace(/ESP32/g, mcuLabel) : data.signal_flow_summary,
  };

  const signalNodes = extractSignalNodes(sanitizedData.signal_flow_summary, mcuName, inputName, outputName);
  const currentMeta = STAGE_META[stage];
  const stageIdx = STAGE_ORDER.indexOf(stage);

  const goNext = () => {
    const nextIdx = STAGE_ORDER.indexOf(stage) + 1;
    if (nextIdx < STAGE_ORDER.length) {
      setStage(STAGE_ORDER[nextIdx]);
    }
  };

  // Auto-advance working stage after sentences are done
  useEffect(() => {
    if (stage === 'working' && workingDone) {
      // Don't auto-advance — let student click
    }
  }, [stage, workingDone]);

  return (
    <div className="relative min-h-screen flex items-start justify-center p-6 bg-[#07070F] overflow-hidden">

      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/5 blur-[140px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-amber-500/4 blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 circuit-bg opacity-15" />
      </div>

      <div className="relative z-10 w-full max-w-2xl pt-8 pb-20">

        {/* Mission header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mission Briefing</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Project Blueprint</h1>
          <p className="text-slate-500 text-sm mt-1">Complete each stage to unlock the build phase.</p>
        </div>

        {/* Stage progress */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {STAGE_ORDER.map((s, i) => {
            const meta = STAGE_META[s];
            const isActive = s === stage;
            const isDone = STAGE_ORDER.indexOf(stage) > i;
            return (
              <div
                key={s}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
                  transition-all duration-300
                  ${isActive ? meta.color + ' scale-105' : isDone ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400' : 'border-white/8 bg-white/3 text-slate-600'}
                `}
              >
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : meta.icon}
                {meta.label}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/5 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${((stageIdx + 1) / STAGE_ORDER.length) * 100}%` }}
          />
        </div>

        {/* Stage card */}
        <div ref={cardRef} key={stage} className="glass-strong border border-white/8 rounded-3xl overflow-hidden animate-fade-up">

          {/* Card header */}
          <div className={`px-8 pt-7 pb-5 border-b border-white/5 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${currentMeta.color}`}>
              {currentMeta.icon}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Stage {stageIdx + 1} of {STAGE_ORDER.length}
              </p>
              <h2 className="text-lg font-black text-white">{currentMeta.label}</h2>
            </div>
          </div>

          {/* Card content */}
          <div className="p-8">

            {/* ── STAGE 1: Problem ── */}
            {stage === 'problem' && (
              <div className="space-y-6">
                <p className="text-white text-xl font-bold leading-relaxed">
                  {sanitizedData.problem_statement}
                </p>
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500
                    text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                >
                  Got it — What's the real use? <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STAGE 2: Real World ── */}
            {stage === 'realworld' && (
              <div className="space-y-6">
                <div className="p-5 bg-violet-500/8 border border-violet-400/20 rounded-2xl">
                  <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-3">Live Deployment Example</p>
                  <p className="text-slate-200 text-base leading-relaxed">{sanitizedData.real_world_use_case}</p>
                </div>
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500
                    text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                >
                  Interesting — How does it work? <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STAGE 3: Working Principle ── */}
            {stage === 'working' && (
              <div className="space-y-6">
                <WorkingPrincipleReveal
                  text={sanitizedData.working_principle}
                />
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500
                    text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 mt-4"
                >
                  Clear — Show me the signal path <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STAGE 4: Signal Journey ── */}
            {stage === 'signal' && (
              <div className="space-y-6">
                <p className="text-slate-400 text-sm">
                  Watch how data travels through your circuit — from sensor to actuator.
                </p>
                <SignalFlowAnimation nodes={signalNodes} />
                <div className="p-4 bg-white/3 border border-white/8 rounded-xl">
                  <p className="text-slate-300 text-sm leading-relaxed">{sanitizedData.signal_flow_summary}</p>
                </div>
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
                    text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                >
                  I see it — Test my understanding <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STAGE 5: Socratic Challenge ── */}
            {stage === 'challenge' && (
              <SocraticChallenge
                powerSummary={sanitizedData.power_flow_summary}
                mcuName={mcuName}
                onAnswered={onContinue}
              />
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
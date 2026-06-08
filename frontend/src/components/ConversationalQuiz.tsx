'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Loader2, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { api } from '@/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

type MsgRole = 'assistant' | 'user' | 'option-row' | 'doubt-gate';

interface ChatMessage {
  role: MsgRole;
  content: string;
  // for option-row messages:
  options?: string[];
  questionIdx?: number;
  answered?: boolean;
  selectedOption?: string;
  isCorrect?: boolean;
}

// ── PIN defaults (mirrors QuizPanel) ─────────────────────────────────────────

const PIN_DEFAULTS: Record<string, number> = {
  // Long-prefix keys (from concept store / backend)
  Sensor_PIR: 27, Sensor_DHT11: 26, Sensor_HC_SR04: 25,
  Sensor_LDR: 34, Sensor_MQ2_Gas: 35, Sensor_Soil_Moisture: 34,
  Sensor_Rain: 34, Sensor_Flame: 27, Sensor_Sound: 27,
  Sensor_IR_Obstacle: 27, Sensor_Heartbeat: 34, Sensor_Temperature_LM35: 34,
  Actuator_LED: 2, Actuator_Relay_5V: 13, Actuator_Buzzer: 14,
  Actuator_Servo_SG90: 15, Actuator_Water_Pump: 13,
  // Short registry keys (from component picker)
  PIR: 27, DHT11: 26, HC_SR04: 25,
  LDR: 34, MQ2_GAS: 35, SOIL_MOISTURE: 34,
  RAIN: 34, FLAME: 27, SOUND: 27,
  IR: 27, NTC_TEMP: 34,
  LED: 2, RELAY: 13, BUZZER: 14,
  SERVO: 15, WATER_PUMP: 13, WATERPUMP: 13,
};

// Maps short registry keys → long-prefix keys that the backend expects.
// groq_llm.py detects components with: "Sensor" in c, "Actuator" in c, "MCU" in c
// so short keys like 'HC_SR04' or 'LCD' produce empty lists → generic questions.
const REGISTRY_TO_LONG_KEY: Record<string, string> = {
  ESP32:        'MCU_ESP32',
  ARDUINO:      'MCU_Arduino_Uno',
  PIR:          'Sensor_PIR',
  DHT11:        'Sensor_DHT11',
  DHT22:        'Sensor_DHT11',
  HC_SR04:      'Sensor_HC_SR04',
  HCSR04:       'Sensor_HC_SR04',
  LDR:          'Sensor_LDR',
  SOIL_MOISTURE:'Sensor_Soil_Moisture',
  SOILMOISTURE: 'Sensor_Soil_Moisture',
  MQ2_GAS:      'Sensor_MQ2_Gas',
  MQ2:          'Sensor_MQ2_Gas',
  FLAME:        'Sensor_Flame',
  SOUND:        'Sensor_Sound',
  RAIN:         'Sensor_Rain',
  NTC_TEMP:     'Sensor_Temperature_LM35',
  IR:           'Sensor_IR_Obstacle',
  BUTTON:       'Input_Button',
  LED:          'Actuator_LED',
  BUZZER:       'Actuator_Buzzer',
  RELAY:        'Actuator_Relay_5V',
  SERVO:        'Actuator_Servo_SG90',
  DC_MOTOR:     'Actuator_DC_Motor',
  WATER_PUMP:   'Actuator_Water_Pump',
  WATERPUMP:    'Actuator_Water_Pump',
  FAN:          'Actuator_Fan',
  LCD:          'Display_LCD_16x2',
  OLED:         'Display_OLED_SSD1306',
};

/** Convert a component key (either format) to the long-prefix form the backend needs. */
function normalizeForQuiz(key: string): string {
  // Already long-prefix — pass through as-is
  if (key.startsWith('Sensor_') || key.startsWith('Actuator_') ||
      key.startsWith('Display_') || key.startsWith('Input_') ||
      key.startsWith('MCU_')) return key;
  // Short registry key → map to long form
  const mapped = REGISTRY_TO_LONG_KEY[key.toUpperCase().replace(/-/g, '_')];
  return mapped ?? key; // unknown keys pass through unchanged
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typingDelay(ms = 700) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversationalQuiz() {
  const {
    concept, idea, selectedPlatform, experienceLevel,
    systemLogic, selectedComponents, dispatchPhase, setError,
  } = useProjectStore();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [mentorTyping, setMentorTyping] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [showCircuitBtn, setShowCircuitBtn] = useState(false);
  const [doubtHistory, setDoubtHistory] = useState<{ role: string; content: string }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const doubtInputRef = useRef<HTMLInputElement>(null);
  const hasBootstrapped = useRef(false);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mentorTyping]);

  // ── Load quiz + start conversation ─────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      if (!concept) return;
      if (hasBootstrapped.current) return;
      hasBootstrapped.current = true;

      setMentorTyping(true);
      await typingDelay(600);

      // Opening line from mentor
      pushMsg({
        role: 'assistant',
        content: `Alright — before I show you the circuit, let's make sure you actually understand what you built 🎯\n\nI'll ask you a few quick questions about your project. Don't worry — these aren't tricks, they're exactly what an examiner would ask you.`,
      });

      await typingDelay(800);

      // Normalize all component keys to the long-prefix format the backend
      // expects (e.g. 'HC_SR04' → 'Sensor_HC_SR04', 'LCD' → 'Display_LCD_16x2').
      // Without this, groq_llm.py's substring filters ("Sensor" in c, "MCU" in c)
      // produce empty lists and Groq generates the same generic questions every time.
      const rawComponents = [...concept.inputs, ...concept.logic, ...concept.outputs];
      const components = rawComponents.map(normalizeForQuiz);
      const pinAssignments: Record<string, number> = {};
      components.forEach(k => { if (PIN_DEFAULTS[k]) pinAssignments[k] = PIN_DEFAULTS[k]; });

      const result = await api.generateQuiz(
        components,
        idea,
        selectedPlatform ?? undefined,
        experienceLevel ?? 'beginner',
        pinAssignments,
        systemLogic   // the actual IF/THEN logic from the student's circuit
      );

      setMentorTyping(false);

      if (!result.ok) {
        pushMsg({ role: 'assistant', content: "Hmm, I couldn't load the questions. Let me skip ahead — click below to continue." });
        setQuizComplete(true);
        setShowCircuitBtn(true);
        return;
      }

      const data = result.data;
      const normalized: QuizQuestion[] = Array.isArray(data)
        ? data
        : data.question
          ? [{ question: data.question, options: data.options, correct_answer: data.options[data.correct_index], explanation: data.explanation }]
          : data.quiz || [];

      if (!normalized.length) {
        setQuizComplete(true);
        setShowCircuitBtn(true);
        return;
      }

      setQuestions(normalized);
      await askQuestion(normalized, 0);
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function pushMsg(msg: ChatMessage) {
    setMessages(prev => [...prev, msg]);
  }

  async function askQuestion(qs: QuizQuestion[], idx: number) {
    if (idx >= qs.length) return;
    const q = qs[idx];

    setMentorTyping(true);
    await typingDelay(500);
    setMentorTyping(false);

    pushMsg({ role: 'assistant', content: `**Q${idx + 1} of ${qs.length}:** ${q.question}` });

    await typingDelay(200);

    pushMsg({
      role: 'option-row',
      content: '',
      options: q.options,
      questionIdx: idx,
      answered: false,
    });
  }

  // ── Handle option pick ───────────────────────────────────────────────────────

  const handleOptionClick = async (qIdx: number, option: string) => {
    const q = questions[qIdx];
    const isCorrect = option === q.correct_answer;

    // Mark the option row as answered
    setMessages(prev =>
      prev.map(m =>
        m.role === 'option-row' && m.questionIdx === qIdx
          ? { ...m, answered: true, selectedOption: option, isCorrect }
          : m
      )
    );

    // Show student's choice as a user bubble
    pushMsg({ role: 'user', content: option });

    setMentorTyping(true);
    await typingDelay(700);
    setMentorTyping(false);

    if (isCorrect) {
      // Correct — short affirmation
      const affirmations = [
        `✅ Exactly right! ${q.explanation}`,
        `✅ Correct! ${q.explanation}`,
        `✅ Spot on. ${q.explanation}`,
      ];
      pushMsg({
        role: 'assistant',
        content: affirmations[qIdx % affirmations.length],
      });
    } else {
      // Wrong — fetch contextual explanation from Groq
      const systemLogicSummary = systemLogic
        ? `Logic type: ${systemLogic.logicType}. Conditions: ${systemLogic.displayConditions?.join(', ')}.`
        : '';

      let wrongExplanation = `❌ Not quite. The correct answer is "${q.correct_answer}". ${q.explanation}`;

      try {
        const chatRes = await api.chat(
          'QUIZ_WRONG_ANSWER',
          {
            idea,
            selectedComponents,
            selectedPlatform: selectedPlatform ?? '',
            experienceLevel: experienceLevel ?? 'beginner',
            systemLogicSummary,
          },
          `The student answered "${option}" but the correct answer is "${q.correct_answer}". Question: "${q.question}". Explanation from quiz: "${q.explanation}". Explain this specifically to them using their actual project context.`,
          []
        );
        if (chatRes.ok && chatRes.data?.response) {
          wrongExplanation = `❌ Not quite — let me explain.\n\n${chatRes.data.response}`;
        }
      } catch { /* use fallback */ }

      pushMsg({ role: 'assistant', content: wrongExplanation });

      // Re-ask the same question
      setMentorTyping(true);
      await typingDelay(600);
      setMentorTyping(false);

      pushMsg({ role: 'assistant', content: `Let's try that again 👇` });
      pushMsg({
        role: 'option-row',
        content: '',
        options: q.options,
        questionIdx: qIdx,
        answered: false,
      });
      return; // don't advance
    }

    // Advance to next question or finish
    const nextIdx = qIdx + 1;
    setCurrentQIdx(nextIdx);

    if (nextIdx < questions.length) {
      await typingDelay(400);
      await askQuestion(questions, nextIdx);
    } else {
      // All questions done → Step 3: doubt gate
      await typingDelay(600);
      setMentorTyping(true);
      await typingDelay(800);
      setMentorTyping(false);

      pushMsg({
        role: 'assistant',
        content: `🎉 You passed all the questions — you clearly understand this project.\n\nBefore I show you the circuit diagram, is there anything you're still unsure about? Ask me anything right now — this is your last chance to clear doubts before we move on.`,
      });

      pushMsg({ role: 'doubt-gate', content: '' });
      setQuizComplete(true);
      setTimeout(() => doubtInputRef.current?.focus(), 300);
    }
  };

  // ── Handle doubt chat ────────────────────────────────────────────────────────

  const handleDoubtSend = async () => {
    const trimmed = doubtInput.trim();
    if (!trimmed || doubtLoading) return;

    setDoubtInput('');

    // Detect "ready" signals
    const readySignals = ['no', 'ready', 'done', "i'm ready", 'no doubts', 'show circuit', 'continue', 'proceed', 'ok', 'okay', 'nope', 'all good'];
    const isReady = readySignals.some(s => trimmed.toLowerCase().includes(s));

    pushMsg({ role: 'user', content: trimmed });
    setDoubtHistory(prev => [...prev, { role: 'user', content: trimmed }]);

    if (isReady) {
      setMentorTyping(true);
      await typingDelay(500);
      setMentorTyping(false);
      pushMsg({ role: 'assistant', content: `Perfect. Let's look at your circuit! 🔌` });
      await typingDelay(600);
      dispatchPhase('QUIZ_PASS');
      return;
    }

    setDoubtLoading(true);
    const systemLogicSummary = systemLogic
      ? `Logic type: ${systemLogic.logicType}. Conditions: ${systemLogic.displayConditions?.join(', ')}.`
      : '';

    try {
      const res = await api.chat(
        'DOUBT_GATE',
        {
          idea,
          selectedComponents,
          selectedPlatform: selectedPlatform ?? '',
          experienceLevel: experienceLevel ?? 'beginner',
          systemLogicSummary,
        },
        trimmed,
        doubtHistory
      );
      const reply = res.ok
        ? (res.data?.response ?? 'Let me think about that...')
        : 'Sorry, having trouble reaching the mentor right now.';

      // Backend signalled student is ready
      if (reply === 'READY_FOR_CIRCUIT') {
        pushMsg({ role: 'assistant', content: `Perfect. Let's look at your circuit! 🔌` });
        await typingDelay(500);
        dispatchPhase('QUIZ_PASS');
        return;
      }

      pushMsg({ role: 'assistant', content: reply });
      setDoubtHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      // Always show circuit button after mentor responds
      setShowCircuitBtn(true);
    } catch {
      pushMsg({ role: 'assistant', content: 'Something went wrong. Try again.' });
    } finally {
      setDoubtLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex justify-center pt-7 pb-2">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.06] text-[11px] font-bold tracking-[0.1em] text-indigo-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          Knowledge Check · Conversational
        </div>
      </div>

      {/* Chat stream */}
      <div className="relative z-10 flex-1 max-w-[700px] w-full mx-auto px-4 pt-4 pb-6 flex flex-col">
        <div
          className="flex-1 space-y-4 overflow-y-auto"
          style={{ minHeight: 300, maxHeight: 'calc(100vh - 260px)' }}
        >
          {messages.map((msg, i) => {

            // ── Option row ────────────────────────────────────────────────────
            if (msg.role === 'option-row') {
              return (
                <div key={i} className="pl-11 space-y-2">
                  {msg.options!.map((opt, oi) => {
                    const isSelected = msg.answered && msg.selectedOption === opt;
                    const isCorrect = opt === questions[msg.questionIdx!]?.correct_answer;
                    const showGreen = msg.answered && isCorrect;
                    const showRed = msg.answered && isSelected && !isCorrect;

                    return (
                      <button
                        key={oi}
                        disabled={msg.answered}
                        onClick={() => handleOptionClick(msg.questionIdx!, opt)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all duration-200
                          ${showGreen ? 'border-green-500/50 bg-green-500/10 text-green-300' :
                            showRed ? 'border-red-500/50 bg-red-500/10 text-red-300' :
                            isSelected ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-300' :
                            msg.answered ? 'border-white/5 bg-transparent text-slate-600 cursor-default' :
                            'border-white/10 bg-white/[0.03] text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/8 hover:text-white cursor-pointer'}
                        `}
                      >
                        <span className="text-slate-600 text-xs mr-2">{String.fromCharCode(65 + oi)}.</span>
                        {opt}
                        {showGreen && <CheckCircle2 className="inline ml-2 w-3.5 h-3.5 text-green-400" />}
                      </button>
                    );
                  })}
                </div>
              );
            }

            // ── Doubt gate input area ─────────────────────────────────────────
            if (msg.role === 'doubt-gate') {
              return (
                <div key={i} className="pl-11 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      ref={doubtInputRef}
                      type="text"
                      value={doubtInput}
                      onChange={e => setDoubtInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleDoubtSend()}
                      placeholder="Ask anything, or type 'ready' to see the circuit..."
                      disabled={doubtLoading}
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/40 transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleDoubtSend}
                      disabled={!doubtInput.trim() || doubtLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-xl text-white text-sm font-medium transition-all"
                    >
                      {doubtLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : 'Ask'
                      }
                    </button>
                  </div>

                  {/* Show circuit shortcut button */}
                  {showCircuitBtn && (
                    <button
                      onClick={() => dispatchPhase('QUIZ_PASS')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-bold transition-all duration-200 hover:scale-[1.02] mt-2"
                    >
                      <Zap className="w-4 h-4" />
                      Show me the circuit
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            }

            // ── Regular chat bubbles ──────────────────────────────────────────
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5
                  ${isUser
                    ? 'bg-slate-700/60 border border-white/10'
                    : 'bg-indigo-500/20 border border-indigo-400/30'
                  }`}>
                  {isUser
                    ? <User className="w-4 h-4 text-slate-300" />
                    : <Bot className="w-4 h-4 text-indigo-400" />
                  }
                </div>
                <div className={`
                  max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${isUser
                    ? 'bg-indigo-600/25 border border-indigo-500/25 text-white rounded-tr-sm'
                    : 'bg-white/[0.05] border border-white/8 text-slate-200 rounded-tl-sm'
                  }
                `}>
                  {/* Render bold markdown-style **text** */}
                  {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={pi} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                      : <span key={pi}>{part}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Mentor typing indicator */}
          {mentorTyping && (
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

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Zap, ArrowRight, Camera, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** optional base64 thumbnail to show in the bubble */
  imageThumb?: string;
  isTyping?: boolean;
}

interface DetectedComponent {
  label: string;
  confidence: number;
}

/** Which step of the image-detection conversation we're in */
type ImageFlow =
  | 'idle'
  | 'detecting'          // calling Roboflow
  | 'confirming'         // showing detected list, waiting for feedback
  | 'mode_select';       // asking: start from scratch or build on these?

interface ConversationalEntryProps {
  onIdeaConfirmed: (idea: string, skipWizard?: boolean) => void;
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

// Simple keyword-based intent detection — if the user says these things
// we won't treat it as a "confirmed idea" redirect, just chat normally.
const IMAGE_INTENT_KEYWORDS = ['photo', 'picture', 'image', 'scan', 'camera', 'upload', 'detect', 'identify'];

export function ConversationalEntry({ onIdeaConfirmed }: ConversationalEntryProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedIdea, setLockedIdea] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Image upload state
  const [imageFlow, setImageFlow] = useState<ImageFlow>('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [detectedComponents, setDetectedComponents] = useState<DetectedComponent[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  // ─── Clipboard paste ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Convert file → base64, start detection ──────────────────────────────
  const handleImageFile = useCallback((file: File) => {
    if (imageFlow !== 'idle') return; // don't interrupt ongoing flow
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewDataUrl(dataUrl);
      startDetection(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  }, [imageFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDetection = async (dataUrl: string, mimeType: string) => {
    // Strip the "data:image/jpeg;base64," prefix → raw base64
    // Guard handles both cases: dataUrl with prefix AND already-raw base64
    const rawBase64 = dataUrl.includes(',')
      ? dataUrl.split(',')[1]
      : dataUrl;

    // ── IMAGE DEBUG ────────────────────────────────────────────────────────
    console.log("IMAGE DEBUG:", {
      imageSize: rawBase64.length,
      imageType: mimeType,
      first50chars: rawBase64.substring(0, 50),
      hasBase64Prefix: dataUrl.startsWith('data:'),
    });
    console.log("STRIPPED BASE64 starts with:", rawBase64.substring(0, 20));
    // Should show "iVBORw0KGgo..." (PNG) or "/9j/4AAQ..." (JPEG), NOT "data:image..."
    // ──────────────────────────────────────────────────────────────────────

    // Show user "uploading" message
    const uploading: Message = {
      role: 'user',
      content: '📷 Scanning my circuit image…',
      imageThumb: dataUrl,
    };
    setMessages(prev => [...prev, uploading]);
    setImageFlow('detecting');
    setLoading(true);

    // Mentor "thinking" response
    addMentorMessage('Let me scan that for you — one moment! 🔍');

    try {
      // ── RAW FETCH for full debug visibility ──────────────────────────────
      const response = await fetch('http://localhost:8000/api/detect-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: rawBase64, mime_type: mimeType }),
      });
      const data = await response.json();

      // ── RESPONSE LOGS ─────────────────────────────────────────────────────
      console.log("GEMINI STATUS:", response.status);
      console.log("GEMINI FULL RESPONSE:", JSON.stringify(data, null, 2));
      console.log("GEMINI ERROR:", data.error ?? data.detail ?? "(none)");
      console.log("GEMINI CANDIDATES (detected):", data.detected);
      // ─────────────────────────────────────────────────────────────────────

      const result = response.ok ? { ok: true, data } : { ok: false, error: data };

      if (result.ok && result.data?.status === 'SUCCESS') {
        const detected: DetectedComponent[] = result.data.detected ?? [];
        const fallbackUsed: boolean = result.data.fallback_used ?? false;
        const source: string = result.data.source ?? 'roboflow';
        setDetectedComponents(detected);
        setImageFlow('confirming');

        if (detected.length === 0) {
          // Both Gemini AND Roboflow returned nothing
          addMentorMessage(
            "Hmm, I couldn't identify any electronics components in that image. " +
            "Try a clearer or better-lit photo, or just tell me what components you have!"
          );
          resetImageFlow();
        } else {
          // Show confidence % only when Roboflow contributed scores; Gemini-only = 1.0 which is misleading
          const hasRoboflow = source === 'roboflow' || source === 'gemini+roboflow';
          const list = detected.map(d => {
            const pct = (hasRoboflow && d.confidence < 1.0) ? ` (${Math.round(d.confidence * 100)}%)` : '';
            return `• **${d.label}**${pct}`;
          }).join('\n');

          const sourceNote = source === 'gemini+roboflow'
            ? '\n\n_Identified by Gemini Vision · confidence scores from YOLO-World._'
            : source === 'roboflow'
            ? '\n\n_Identified by YOLO-World object detection._'
            : '';   // pure gemini — no note needed, it's the primary

          addMentorMessage(
            `Nice! Here's what I spotted in your image:\n\n${list}${sourceNote}\n\nDoes this look right? Feel free to correct me below, or click **"Looks good!"** to continue.`
          );
        }
      } else {
        addMentorMessage("I had trouble reading that image. Could you try a different angle or better lighting?");
        resetImageFlow();
      }
    } catch (err) {
      console.error("DETECT EXCEPTION:", err);
      addMentorMessage("Something went wrong scanning the image. Try again?");
      resetImageFlow();
    } finally {
      setLoading(false);
    }
  };


  const addMentorMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  };

  const resetImageFlow = () => {
    setImageFlow('idle');
    setPreviewDataUrl(null);
    setDetectedComponents([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // User confirms detected components → ask how to proceed
  const handleDetectionConfirmed = () => {
    setImageFlow('mode_select');
    const labels = detectedComponents.map(d => d.label).join(', ');
    const userConfirm: Message = { role: 'user', content: 'Looks good!' };
    setMessages(prev => [...prev, userConfirm]);
    addMentorMessage(
      `Great! I've noted: **${labels}**.\n\nHow would you like to proceed?\n\n` +
      "Click \"Build a project with these\" to jump right into building, " +
      "or \"I need help planning\" if you want to talk through ideas first."
    );
  };

  // User wants to build with detected components
  const handleBuildWithDetected = () => {
    // Passive / infrastructure components — not real circuit logic, skip them
    const PASSIVE = [
      'resistor', 'breadboard', 'bread board', 'jumper wires',
      'jumper wire', 'wire', 'wires', 'battery', '9v battery', 'capacitor',
      'potentiometer',
    ];

    // Map Groq label (lowercased) → exact words that match backend COMPONENT_KEYWORDS / IOT_KEYWORDS
    // NOTE: labels are .toLowerCase().trim()'d before lookup
    const LABEL_TO_KEYWORD: Record<string, string> = {
      // MCU
      'esp32':              'esp32 wifi',
      'arduino':            'arduino',
      'arduino uno':        'arduino',
      // LED
      'led':                'led',
      // PIR / Motion
      'pir':                'pir motion sensor',
      'pir sensor':         'pir motion sensor',
      'motion sensor':      'pir motion sensor',
      'ir sensor':          'obstacle infrared',
      // DHT
      'dht11':              'dht11 temperature humidity',
      'dht22':              'dht22 temperature humidity',
      'temperature sensor': 'dht11 temperature humidity',
      'humidity sensor':    'dht11 temperature humidity',
      // Ultrasonic
      'ultrasonic':         'hc-sr04 ultrasonic distance',
      'ultrasonic sensor':  'hc-sr04 ultrasonic distance',
      'hc-sr04':            'hc-sr04 ultrasonic distance',
      // Displays
      'lcd':                'lcd 16x2 display',
      'oled':               'oled display',
      // Actuators
      'buzzer':             'buzzer alarm',
      'servo':              'servo motor sg90',
      'relay':              'relay switch',
      'motor':              'dc motor fan',
      'dc motor':           'dc motor',
      'pump':               'water pump',
      'fan':                'fan',
      // Sensors
      'ldr':                'ldr light sensor',
      'light sensor':       'ldr light sensor',
      'soil moisture':      'soil moisture',
      'soil sensor':        'soil moisture',
      'flame':              'flame fire sensor',
      'flame sensor':       'flame fire sensor',
      'gas':                'mq2 gas smoke',
      'gas sensor':         'mq2 gas smoke',
      'mq2':                'mq2 gas smoke',
      'sound sensor':       'sound clap microphone',
      'microphone':         'sound clap microphone',
    };

    const keywords = (detectedComponents as any[])
      .map(c => (typeof c === 'string' ? c : c.label).toLowerCase().trim())
      .filter(c => !PASSIVE.includes(c))
      .map(c => LABEL_TO_KEYWORD[c] || c)
      .filter(c => c.length > 0);

    const ideaString = keywords.join(' with ');
    console.log("FINAL IDEA STRING:", ideaString);

    // Set MCU in store if ESP32 detected
    const hasESP32 = (detectedComponents as any[]).some(c =>
      (typeof c === 'string' ? c : c.label).toLowerCase().includes('esp32')
    );
    if (hasESP32) {
      useProjectStore.getState().setRecommendedMCU('MCU_ESP32');
      useProjectStore.getState().setExperienceLevel('beginner');
    }

    console.log("MCU SET:", hasESP32 ? 'ESP32' : 'Arduino');

    const userMsg: Message = { role: 'user', content: 'Build a project with these' };
    setMessages(prev => [...prev, userMsg]);
    addMentorMessage("Awesome! Let's build something with those components. Preparing your workspace…");
    resetImageFlow();
    setTimeout(() => onIdeaConfirmed(ideaString, true), 800);
  };

  // User wants to chat first
  const handlePlanFirst = () => {
    const labels = detectedComponents.map(d => d.label);
    const contextMessage = `I have these components: ${labels.join(', ')}. What can I build?`;
    const userMsg: Message = { role: 'user', content: 'I need help planning' };
    setMessages(prev => [...prev, userMsg]);
    resetImageFlow();
    // Fire off a chat with that context
    sendMessage(contextMessage, true /* skipDisplay */);
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleImageFile(file);
  };

  // ─── Main chat send ───────────────────────────────────────────────────────
  const sendMessage = async (text: string, skipDisplay = false) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!skipDisplay) {
      const userMsg: Message = { role: 'user', content: trimmed };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    setLoading(true);

    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: trimmed },
    ];

    try {
      const result = await api.chat(
        'DISCOVERY_CHAT',
        { idea: '', selectedComponents: [], selectedPlatform: '', experienceLevel: 'beginner' },
        trimmed,
        historyRef.current.slice(0, -1)
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
  const handleChip = (text: string) => { setInput(text); sendMessage(text); };
  const handleConfirm = () => { if (lockedIdea) onIdeaConfirmed(lockedIdea, false); };
  const handleEditIdea = () => {
    setShowConfirm(false);
    setLockedIdea(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const showChips = messages.length <= 1;
  const isImageFlowActive = imageFlow !== 'idle';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen bg-transparent text-white font-sans flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-900/30 backdrop-blur-sm border-2 border-dashed border-indigo-400/60 rounded-2xl pointer-events-none">
          <Camera className="w-12 h-12 text-indigo-400 mb-3 animate-bounce" />
          <p className="text-indigo-300 font-semibold text-lg">Drop your circuit image here</p>
        </div>
      )}

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
                {/* Image thumbnail if present */}
                {msg.imageThumb && (
                  <img
                    src={msg.imageThumb}
                    alt="Uploaded circuit"
                    className="mb-2 rounded-xl max-h-40 object-contain border border-white/10"
                  />
                )}
                {/* Render **bold** inline by simple split */}
                <BoldText text={msg.content} />
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

          {/* Image detection confirmation buttons */}
          {imageFlow === 'confirming' && !loading && detectedComponents.length > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 bg-indigo-500/[0.08] border border-indigo-500/25 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-2 flex-wrap">
                <button
                  onClick={handleDetectionConfirmed}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 rounded-xl text-white text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Looks good!
                </button>
                <button
                  onClick={() => {
                    resetImageFlow();
                    addMentorMessage("No worries! Tell me what components you have and I'll take it from there.");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:border-white/20 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Not quite, let me correct it
                </button>
              </div>
            </div>
          )}

          {/* Mode selection buttons (after user confirmed components) */}
          {imageFlow === 'mode_select' && !loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 bg-indigo-500/[0.08] border border-indigo-500/25 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-2 flex-wrap">
                <button
                  onClick={handleBuildWithDetected}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold transition-all duration-200 hover:scale-[1.02]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Build a project with these
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handlePlanFirst}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:border-white/20 transition-colors"
                >
                  I need help planning
                </button>
              </div>
            </div>
          )}

          {/* Idea confirmed banner (normal text flow) */}
          {showConfirm && lockedIdea && !isImageFlowActive && (
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

        {/* Image thumbnail preview strip */}
        {previewDataUrl && imageFlow !== 'idle' && (
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="relative group">
              <img
                src={previewDataUrl}
                alt="Preview"
                className="h-14 w-auto rounded-xl border border-white/10 object-cover"
              />
              <button
                onClick={resetImageFlow}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {imageFlow === 'detecting' ? 'Scanning…' : `${detectedComponents.length} component${detectedComponents.length !== 1 ? 's' : ''} detected`}
            </p>
          </div>
        )}

        {/* Input bar */}
        <div className="pb-8">
          <div className="flex gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-2 focus-within:border-indigo-400/40 transition-colors">

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />

            {/* Camera / upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isImageFlowActive}
              title="Upload or capture a circuit image"
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isImageFlowActive ? 'Correct the list or answer the question above…' : "Tell me what you're thinking…"}
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
            Press Enter to send · Paste or drag an image to scan components · Circuit Mentor guides you step by step
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── Tiny helper: renders **bold** markers inline ─────────────────────────────
function BoldText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-white font-semibold">{part}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}

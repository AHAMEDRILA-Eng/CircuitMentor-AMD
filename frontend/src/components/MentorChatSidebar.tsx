'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';
import { 
  Send, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Bot
} from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface MentorChatSidebarProps {
  phase: string;
  project: string;
  components: string[];
  currentComponent: string | null;
  onToggle?: (open: boolean) => void;
}

const getGreeting = (phase: string) => {
  switch (phase) {
    case 'COMPONENT_TEACHING':
      return "Ask me anything about the components!";
    case 'QUIZ':
      return "Stuck? I can give hints without spoiling the answer.";
    case 'CIRCUIT_VISUALIZATION':
      return "Ask me why any wire is connected the way it is.";
    default:
      return "Ask me anything about your project!";
  }
};

const formatPhaseName = (phase: string) => {
  return phase.replace(/_/g, ' ');
};

export function MentorChatSidebar({
  phase,
  project,
  components,
  currentComponent,
  onToggle,
}: MentorChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const storeRecommendedMCU = useProjectStore(state => state.recommendedMCU);
  const storeSelectedComponents = useProjectStore(state => state.selectedComponents);
  const storeIdea = useProjectStore(state => state.idea);

  const prevPhaseRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Setup responsiveness and default state
  useEffect(() => {
    const checkWidth = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsOpen(!mobile); // expanded on desktop, collapsed on mobile
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Sync open state changes back to parent
  useEffect(() => {
    onToggle?.(isOpen);
  }, [isOpen, onToggle]);

  // Phase-aware greeting addition
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      const greeting = getGreeting(phase);
      // Append the new phase greeting
      setMessages(prev => [...prev, { role: 'assistant', content: greeting }]);
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const formatMCUName = (mcu: string) => {
      if (!mcu) return 'Arduino Uno';
      return mcu.replace('MCU_', '').replace(/_/g, ' ');
    };

    // Prepare context object to pass to the API
    const context = {
      phase,
      project: storeIdea || project,
      mcu: formatMCUName(storeRecommendedMCU || ''),
      components: storeSelectedComponents.length > 0 ? storeSelectedComponents : components,
      currentComponent
    };

    // Extract raw message history for the LLM API (excluding greetings or extra state info)
    const historyPayload = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const result = await api.chat(phase, context, userMessage, historyPayload);

    if (result.ok && result.data && result.data.response) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.data.response }]);
    } else {
      const errorMessage = result.error?.message || "I'm having trouble connecting right now. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}` }]);
    }
    setLoading(false);
  };

  // Helper to format/parse message styling
  const formatMessageText = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        let lang = 'code';
        if (lines[0] && !lines[0].includes(' ') && lines[0].length < 15) {
          lang = lines[0].toLowerCase();
          lines.shift();
        }
        const code = lines.join('\n');
        return (
          <pre key={i} className="my-2 p-3 bg-black/50 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 border border-white/5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{lang}</div>
            <code>{code}</code>
          </pre>
        );
      }

      // Inline code and bold parsing
      const inlineParts = part.split(/(`[^`\n]+`)/g);
      return (
        <span key={i} className="whitespace-pre-wrap">
          {inlineParts.map((subPart, j) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return (
                <code key={j} className="px-1.5 py-0.5 bg-black/30 text-rose-400 rounded text-xs font-mono border border-white/5">
                  {subPart.slice(1, -1)}
                </code>
              );
            }

            const boldParts = subPart.split(/(\*\*[^*\n]+\*\*)/g);
            return boldParts.map((boldPart, k) => {
              if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                return (
                  <strong key={k} className="font-extrabold text-white">
                    {boldPart.slice(2, -2)}
                  </strong>
                );
              }
              return boldPart;
            });
          })}
        </span>
      );
    });
  };

  return (
    <>
      {/* Sidebar - Desktop Layout */}
      {!isMobile && (
        <div 
          className={`fixed right-0 top-0 bottom-0 h-full w-[320px] z-40 bg-slate-950/85 backdrop-blur-md border-l border-white/10 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Toggle Button Left Edge */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute top-1/2 -translate-y-1/2 -left-8 w-8 h-16 bg-slate-950/90 border border-r-0 border-white/10 rounded-l-xl flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors text-slate-400 hover:text-white z-50 shadow-md"
            title={isOpen ? "Collapse Mentor Chat" : "Expand Mentor Chat"}
          >
            {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Bot size={16} className="animate-pulse" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
              </div>
              <div>
                <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  AI Mentor <Sparkles size={11} className="text-violet-400 animate-pulse" />
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-white/5 mt-0.5 inline-block">
                  {formatPhaseName(phase)}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 text-[10px] font-bold">
                    M
                  </div>
                )}
                <div 
                  className={`p-3 text-xs leading-relaxed rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {formatMessageText(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 text-[10px] font-bold">
                  M
                </div>
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask a question..."
              className="flex-1 px-3.5 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Drawer - Mobile Layout */}
      {isMobile && (
        <div 
          className={`fixed bottom-0 left-0 right-0 h-[45vh] z-40 bg-slate-950/95 border-t border-white/10 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Toggle Button Top Edge */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-8 bg-slate-950/95 border border-b-0 border-white/10 rounded-t-xl flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors text-slate-400 hover:text-white z-50 shadow-md"
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-violet-400" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">AI Mentor</h3>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">
                {formatPhaseName(phase)}
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-2 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div 
                  className={`p-2.5 text-xs leading-relaxed rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {formatMessageText(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 max-w-[85%]">
                <div className="p-2.5 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

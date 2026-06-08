'use client';

import React from 'react';
import { UIPhase } from '@/store/useProjectStore';
import { ChatPanel } from './ChatPanel';

interface PhaseLayoutProps {
    phase: UIPhase;
    children: React.ReactNode;
    selectedComponents?: string[];
    systemLogicSummary?: string;
    arduinoCodeSnapshot?: string;
    showChat?: boolean;   // explicit override; defaults based on phase
}

// Phases where chat is a fixed right panel
const CHAT_PANEL_PHASES: UIPhase[] = [
    'IDEA_EXPLANATION',
    'COMPONENT_SELECTION',
    'COMPONENT_TEACHING',
    'SYSTEM_LOGIC_VIEW',
    'CODE_REVIEW',
    'COMPLETED',
];

export function PhaseLayout({
    phase,
    children,
    selectedComponents = [],
    systemLogicSummary = '',
    arduinoCodeSnapshot = '',
    showChat,
}: PhaseLayoutProps) {
    const shouldShowChat = showChat ?? CHAT_PANEL_PHASES.includes(phase);

    if (!shouldShowChat) {
        // Full-width — QUIZ, CIRCUIT_VISUALIZATION (has its own bubble), DISCOVERY, etc.
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-transparent">
            {/* Left — phase content 70% */}
            <div className="flex-1 overflow-y-auto min-w-0">
                {children}
            </div>

            {/* Right — chat 30%, min 320px, max 420px */}
            <div className="w-[30%] min-w-[320px] max-w-[420px] shrink-0 h-screen">
                <ChatPanel
                    phase={phase}
                    selectedComponents={selectedComponents}
                    systemLogicSummary={systemLogicSummary}
                    arduinoCodeSnapshot={arduinoCodeSnapshot}
                />
            </div>
        </div>
    );
}

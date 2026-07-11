import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemLogicData } from '@/logic/index';

// ── Phase types ───────────────────────────────────────────────────────────────

export type UIPhase =
    | 'DISCOVERY'
    | 'IDEA_EXPLANATION'
    | 'COMPONENT_SELECTION'      // NEW — registry-driven picker
    | 'COMPONENT_TEACHING'
    | 'SYSTEM_LOGIC_VIEW'
    | 'QUIZ'
    | 'CIRCUIT_VISUALIZATION'
    | 'CODE_REVIEW'              // NEW — dedicated sketch phase
    | 'COMPLETED'
    | 'PLATFORM_SELECTED'        // IoT intermediary
    | 'GENERATING_CIRCUIT';      // Quick Build loading

export type AppMode = 'QUICK_BUILD' | 'LEARNING_MODE' | null;

export type PhaseEvent =
    | 'DISCOVER_IOT_SUCCESS'
    | 'DISCOVER_NON_IOT_SUCCESS'
    | 'IOT_LEARNING_START'
    | 'IDEA_EXPLAINED'           // IDEA_EXPLANATION → COMPONENT_SELECTION
    | 'COMPONENTS_CONFIRMED'     // COMPONENT_SELECTION → COMPONENT_TEACHING
    | 'TEACHING_COMPLETE'        // COMPONENT_TEACHING → SYSTEM_LOGIC_VIEW
    | 'LOGIC_UNDERSTOOD'         // SYSTEM_LOGIC_VIEW → QUIZ
    | 'QUIZ_PASS'                // QUIZ → CIRCUIT_VISUALIZATION
    | 'CIRCUIT_READY'            // CIRCUIT_VISUALIZATION → CODE_REVIEW
    | 'CODE_REVIEWED'            // CODE_REVIEW → COMPLETED
    | 'QUICK_BUILD_START'        // DISCOVERY → GENERATING_CIRCUIT
    | 'GENERATION_SUCCESS'       // GENERATING_CIRCUIT → CIRCUIT_VISUALIZATION
    | 'GENERATION_ERROR'
    | 'IDEA_EXPLANATION_READY'   // IoT platform path
    | 'RESET';

// ── Data interfaces ───────────────────────────────────────────────────────────

interface VisualNode {
    id: string;
    type: string;
    data: { label: string; image?: string };
    position: { x: number; y: number };
}

interface VisualEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
}

interface ProjectState {
    // App mode
    appMode: AppMode;

    // Core data
    idea: string;
    isIoT: boolean;
    platforms: any[];
    selectedPlatform: string | null;
    systemArchitecture: string;
    status: string;
    uiPhase: UIPhase;

    // Learning mode data
    concept: { inputs: string[]; logic: string[]; outputs: string[] } | null;
    selectedComponents: string[];       // Registry keys chosen during COMPONENT_SELECTION
    nodes: VisualNode[];
    edges: VisualEdge[];
    arduinoCode: string;
    eilWarnings: any[];
    error: any | null;
    projectExplanation: {
        problem_statement: string;
        real_world_use_case: string;
        working_principle: string;
        power_flow_summary: string;
        signal_flow_summary: string;
    } | null;
    systemLogic: SystemLogicData | null;
    validatedCircuit: any | null;   // raw circuit with connections[] for wiring checklist
    experienceLevel: string;
    recommendedMCU: string;
    quizQuestions: any[] | null;
    currentComponent: string | null;

    // ── Bi-directional sync state ─────────────────────────────────────────────
    hoveredPin: string | null;        // pin ID hovered in code (e.g. "D5", "GPIO5")
    hoveredComponent: string | null;  // registry key clicked on canvas (e.g. "SENSOR_DHT11")

    // ── Explain Mode state ────────────────────────────────────────────────────
    explainModeActive: boolean;       // true = animate wires one-by-one with bubbles
    explainStep: number;              // index of currently active wire in explain mode

    // ── Sandbox Mode state ────────────────────────────────────────────────────
    sandboxModeActive: boolean;
    sandboxEdges: any[];
    sandboxValidationResult: any | null;
    faultyEdges: string[];
    hoveredFaultyPin: string | null;
    breadboardView: boolean;

    // Setters
    setAppMode: (mode: AppMode) => void;
    setIdea: (idea: string) => void;
    setPhase: (phase: UIPhase) => void;
    setQuizQuestions: (questions: any[]) => void;
    dispatchPhase: (event: PhaseEvent) => void;
    setDiscoveryResult: (isIoT: boolean, platforms: any[], architecture: string) => void;
    setConceptData: (concept: any) => void;
    setSelectedPlatform: (platformId: string) => void;
    setSelectedComponents: (components: string[]) => void;
    setGenerationResult: (data: any) => void;
    setError: (error: any) => void;
    setProjectExplanation: (data: any) => void;
    setSystemLogic: (data: any) => void;
    setArduinoCode: (code: string) => void;
    setExperienceLevel: (level: string) => void;
    setRecommendedMCU: (mcu: string) => void;
    setCurrentComponent: (comp: string | null) => void;
    setHoveredPin: (pin: string | null) => void;
    setHoveredComponent: (comp: string | null) => void;
    setExplainMode: (active: boolean) => void;
    setExplainStep: (step: number) => void;
    setSandboxModeActive: (active: boolean) => void;
    setSandboxEdges: (edges: any[]) => void;
    setSandboxValidationResult: (res: any) => void;
    setFaultyEdges: (edges: string[]) => void;
    setHoveredFaultyPin: (pin: string | null) => void;
    setBreadboardView: (v: boolean) => void;
    clearError: () => void;
    reset: () => void;
}

// ── Phase transition machine ──────────────────────────────────────────────────

function processTransitions(current: UIPhase, event: PhaseEvent): UIPhase {
    switch (current) {
        case 'DISCOVERY':
            if (event === 'DISCOVER_IOT_SUCCESS') return 'PLATFORM_SELECTED';
            if (event === 'DISCOVER_NON_IOT_SUCCESS') return 'IDEA_EXPLANATION';
            if (event === 'QUICK_BUILD_START') return 'GENERATING_CIRCUIT';
            break;

        case 'PLATFORM_SELECTED':
            if (event === 'IDEA_EXPLANATION_READY') return 'IDEA_EXPLANATION';
            if (event === 'QUICK_BUILD_START') return 'GENERATING_CIRCUIT'; // IoT → Quick Build
            if (event === 'IOT_LEARNING_START') return 'IDEA_EXPLANATION';   // IoT → Learning Mode
            if (event === 'DISCOVER_NON_IOT_SUCCESS') return 'IDEA_EXPLANATION';   // IoT → Learning Mode
            break;

        // ── Learning Mode strict sequence ────────────────────────────────────
        case 'IDEA_EXPLANATION':
            if (event === 'IDEA_EXPLAINED') return 'COMPONENT_SELECTION';
            break;

        case 'COMPONENT_SELECTION':
            if (event === 'COMPONENTS_CONFIRMED') return 'COMPONENT_TEACHING';
            break;

        case 'COMPONENT_TEACHING':
            if (event === 'TEACHING_COMPLETE') return 'SYSTEM_LOGIC_VIEW';
            break;

        case 'SYSTEM_LOGIC_VIEW':
            if (event === 'LOGIC_UNDERSTOOD') return 'QUIZ';
            break;

        case 'QUIZ':
            if (event === 'QUIZ_PASS') return 'CIRCUIT_VISUALIZATION';
            break;

        case 'CIRCUIT_VISUALIZATION':
            if (event === 'CIRCUIT_READY') return 'CODE_REVIEW';
            break;

        case 'CODE_REVIEW':
            if (event === 'CODE_REVIEWED') return 'COMPLETED';
            break;

        // ── Quick Build sequence ─────────────────────────────────────────────
        case 'GENERATING_CIRCUIT':
            if (event === 'GENERATION_SUCCESS') return 'CIRCUIT_VISUALIZATION';
            if (event === 'GENERATION_ERROR') return 'DISCOVERY';
            break;

        case 'COMPLETED':
            break;

        default:
            break;
    }

    if (event === 'RESET') return 'DISCOVERY';
    return current; // No valid transition — stay put
}

// ── Store ─────────────────────────────────────────────────────────────────────

const initialState = {
    appMode: null as AppMode,
    idea: '',
    isIoT: false,
    platforms: [],
    selectedPlatform: null,
    systemArchitecture: '',
    status: 'IDLE',
    uiPhase: 'DISCOVERY' as UIPhase,
    concept: null,
    selectedComponents: [] as string[],
    nodes: [],
    edges: [],
    arduinoCode: '',
    eilWarnings: [],
    error: null,
    projectExplanation: null,
    systemLogic: null,
    validatedCircuit: null,
    experienceLevel: 'beginner',
    recommendedMCU: 'MCU_Arduino_Uno',
    quizQuestions: null,
    currentComponent: null,
    hoveredPin: null,
    hoveredComponent: null,
    explainModeActive: false,
    explainStep: 0,
    sandboxModeActive: false,
    sandboxEdges: [] as any[],
    sandboxValidationResult: null as any | null,
    faultyEdges: [] as string[],
    hoveredFaultyPin: null as string | null,
    breadboardView: false,
};

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            ...initialState,

            setAppMode: (mode) => set({ appMode: mode }),

            setIdea: (idea) => set({ idea }),

            setPhase: (phase) => set({ uiPhase: phase }),

            setQuizQuestions: (questions) => set({
                quizQuestions: questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correct_answer ?? q.options[q.correct_index],
                    explanation: q.explanation
                }))
            }),

            dispatchPhase: (event) =>
                set((state) => ({ uiPhase: processTransitions(state.uiPhase, event) })),

            setDiscoveryResult: (isIoT, platforms, architecture) =>
                set({ isIoT, platforms, systemArchitecture: architecture, status: 'SUCCESS' }),

            setConceptData: (concept) => set({ concept }),

            setSelectedPlatform: (platformId) => set({ selectedPlatform: platformId }),

            setSelectedComponents: (components) => set({ selectedComponents: components }),

            setGenerationResult: (data) => set({
                status: data.status ?? 'SUCCESS',
                concept: data.concept ?? null,
                nodes: data.visual_graph?.nodes ?? [],
                edges: data.visual_graph?.edges ?? [],
                arduinoCode: data.arduino_code ?? '',
                eilWarnings: data.eil_warnings ?? [],
                validatedCircuit: data.validated_circuit ?? null,
                error: (['EIL_HARD_BLOCK', 'AI_ERROR', 'LLM_ERROR', 'AI_REPAIR_ERROR'].includes(data.status)) ? {
                    message: data.message || 'The AI encountered an unexpected technical issue.',
                    phase: data.phase,
                    details: data.details,
                    original_errors: data.original_errors,
                    final_errors: data.final_errors
                } : null
            }),

            setError: (error) => set({ error, status: 'ERROR' }),

            setProjectExplanation: (data) => set({ projectExplanation: data }),

            setSystemLogic: (data) => set({ systemLogic: data }),

            setArduinoCode: (code) => set({ arduinoCode: code }),

            setExperienceLevel: (level) => set({ experienceLevel: level }),

            setRecommendedMCU: (mcu) => set({ recommendedMCU: mcu }),

            setCurrentComponent: (comp) => set({ currentComponent: comp }),

            setHoveredPin: (pin) => set({ hoveredPin: pin }),

            setHoveredComponent: (comp) => set({ hoveredComponent: comp }),

            setExplainMode: (active) => set({ explainModeActive: active, explainStep: 0 }),

            setExplainStep: (step) => set({ explainStep: step }),

            setSandboxModeActive: (active) => set({ sandboxModeActive: active, sandboxEdges: [], sandboxValidationResult: null }),

            setSandboxEdges: (edges) => set({ sandboxEdges: edges }),

            setSandboxValidationResult: (res) => set({ sandboxValidationResult: res }),

            setFaultyEdges: (edges) => set({ faultyEdges: edges }),

            setHoveredFaultyPin: (pin) => set({ hoveredFaultyPin: pin }),

            setBreadboardView: (v) => set({ breadboardView: v }),

            clearError: () => set({ error: null }),

            reset: () => set({ ...initialState }),
        }),
        {
            name: 'circuit-mentor-storage',
            partialize: (state) => ({
                experienceLevel: state.experienceLevel,
                recommendedMCU: state.recommendedMCU,
            }),
        }
    )
);

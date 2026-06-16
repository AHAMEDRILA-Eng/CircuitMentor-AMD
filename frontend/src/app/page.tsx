'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';
import { generateSystemLogic } from '@/logic/index';
import { COMPONENT_REGISTRY } from '@/logic/componentRegistry';
import { extractConceptFromPrompt } from '@/logic/conceptExtractor';
import { buildStandaloneCode } from '@/lib/standaloneCodeBuilder';
import { buildBlynkCode } from '@/lib/blynkCodeBuilder';
import { buildTelegramCode } from '@/lib/telegramCodeBuilder';

// Phase components
import { HeroSearchSection } from '@/components/HeroSearchSection';
import { ConversationalEntry } from '@/components/ConversationalEntry';
import { ModeSelector } from '@/components/ModeSelector';
import { ProjectIntakeWizard, type IntakeAnswers } from '@/components/ProjectIntakeWizard';
import { IoTReveal } from '@/components/IoTReveal';
import { IoTPlatformSelection } from '@/components/IoTPlatformSelection';
import { ProjectExplanationPanel } from '@/components/ProjectExplanationPanel';
import { ComponentSelectionPanel } from '@/components/ComponentSelectionPanel';
import { ComponentTeachingPanel } from '@/components/ComponentTeachingPanel';
import { SystemLogicPanel } from '@/components/SystemLogicPanel';
import { CodeReviewPanel } from '@/components/CodeReviewPanel';
import { GeneratingScreen } from '@/components/GeneratingScreen';
import { ResultWorkspaceLayout } from '@/components/ResultWorkspaceLayout';
import { CompletedWorkspaceLayout } from '@/components/CompletedWorkspaceLayout';
import { PhaseLayout } from '@/components/PhaseLayout';
import QuizPanel from '@/components/QuizPanel';
import ConversationalQuiz from '@/components/ConversationalQuiz';
import { BlynkSetupGuide } from '@/components/BlynkSetupGuide';
import { TelegramSetupGuide } from '@/components/TelegramSetupGuide';

import { Loader2, AlertTriangle, ChevronLeft } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

type IconName = 'cpu' | 'thermometer' | 'radio' | 'lightbulb' | 'speaker' | 'zap';

const mapIcon = (name: string): IconName => {
  const n = name.toLowerCase();
  if (n.includes('arduino') || n.includes('esp')) return 'cpu';
  if (n.includes('temp') || n.includes('dht')) return 'thermometer';
  if (n.includes('pir') || n.includes('motion') || n.includes('ultrasonic')) return 'radio';
  if (n.includes('led') || n.includes('lcd')) return 'lightbulb';
  if (n.includes('buzzer')) return 'speaker';
  return 'zap';
};

const getExplanation = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('arduino')) return 'Main controller that runs code and coordinates components.';
  if (n.includes('esp32')) return 'Powerful controller with Wi-Fi and Bluetooth capabilities.';
  if (n.includes('led')) return 'Visual output component that lights up.';
  if (n.includes('soil')) return 'Measures moisture level of soil.';
  if (n.includes('button')) return 'Input component that detects a press.';
  if (n.includes('pir') || n.includes('motion')) return 'Detects movement by sensing infrared heat changes.';
  if (n.includes('dht')) return 'Sensor tracking temperature and humidity.';
  if (n.includes('servo')) return 'Motor that moves to precise angles.';
  if (n.includes('buzzer')) return 'Audio component for sound alerts.';
  return 'A critical component enabling interaction.';
};

// Resolve concept strings → registry keys (for recommended components)
function conceptToRegistryKeys(concept: { inputs: string[]; logic: string[]; outputs: string[] }): string[] {
  const all = [...concept.inputs, ...concept.logic, ...concept.outputs];
  const keys = new Set<string>();
  for (const raw of all) {
    const match = Object.keys(COMPONENT_REGISTRY).find(k => raw.toUpperCase().includes(k));
    if (match) keys.add(match);
  }
  return [...keys];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiscoveryChat, setShowDiscoveryChat] = useState(true);

  // ── New flow states ──────────────────────────────────────────────────────
  // Step 1: intake wizard shown after idea is submitted
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  // Step 2: IoT explanation shown before platform picker
  const [showIoTReveal, setShowIoTReveal] = useState(false);
  // Step 3: mode selector shown after iot/non-iot path
  const [showModeSelector, setShowModeSelector] = useState(false);
  // Collected intake answers
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers | null>(null);
  const [showBlynkGuide, setShowBlynkGuide] = useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);

  const {
    appMode, setAppMode,
    dispatchPhase, uiPhase,
    concept, selectedComponents, setSelectedComponents,
    error, isIoT, platforms, selectedPlatform,
    projectExplanation, systemLogic, arduinoCode,
    setDiscoveryResult, setConceptData, setSelectedPlatform,
    setGenerationResult, setError,
    setProjectExplanation, setSystemLogic,
    clearError, reset,
    setArduinoCode,
    setExperienceLevel, setRecommendedMCU,
  } = useProjectStore();

  // Reset discovery chat when store resets
  const handleReset = () => {
    reset();
    setShowDiscoveryChat(true);
    setShowIntakeWizard(false);
    setShowIoTReveal(false);
    setShowModeSelector(false);
    setShowBlynkGuide(false);
    setShowTelegramGuide(false);
    setLoading(false);
  };

  // ── Code is NEVER pre-loaded from a static file.
  // ── It is always generated dynamically from the user's actual components.
  // ── See handleGenerate() and handleCircuitReady() below.


  const handleGenerate = useCallback(async (query: string) => {
    setLoading(true);
    const platform = selectedPlatform ?? undefined;

    // Always build a local concept immediately from the prompt so the
    // circuit canvas can render deterministically, even if Groq fails.
    const localConcept = extractConceptFromPrompt(query);
    if (intakeAnswers?.recommendedMCU) {
      localConcept.logic = [intakeAnswers.recommendedMCU];
    }
    console.log('[MCU_TRACE] page.tsx - handleGenerate: localConcept initial logic =', localConcept.logic);

    // Helper: build component-specific code from a concept
    const buildCodeFromConcept = (c: typeof localConcept) => {
      const comps = [...c.inputs, ...c.outputs, ...c.logic];
      const p = (platform ?? '').toLowerCase();
      if (p.includes('telegram')) return buildTelegramCode(comps, query);
      if (p.includes('blynk'))    return buildBlynkCode(comps, query);
      if (p.includes('mqtt')) {
        // MQTT platform selected — using standalone template with MQTT comment
        const code = buildStandaloneCode(comps, query);
        return `// MQTT platform selected — using standalone template\n// Add PubSubClient library for MQTT support:\n// #include <PubSubClient.h>\n\n${code}`;
      }
      return buildStandaloneCode(comps, query);
    };

    try {
      const mcuOverride = intakeAnswers?.recommendedMCU === 'MCU_ESP32' ? 'esp32' : undefined;
      const result = await api.generateCircuit(query, platform, mcuOverride);
      if (result.ok) {
        const data = result.data;
        const errorStatuses = ['AI_ERROR', 'LLM_ERROR', 'AI_REPAIR_ERROR', 'EIL_HARD_BLOCK'];
        if (errorStatuses.includes(data.status) || !data.concept) {
          // Groq circuit generation failed — use local keyword extractor for concept
          console.warn('[CircuitMentor] Backend returned error status. Using local concept extractor fallback.');
          const ino = buildCodeFromConcept(localConcept);
          setConceptData(localConcept);
          setGenerationResult({
            status: 'SUCCESS',
            concept: localConcept,
            arduino_code: ino,
            eil_warnings: ['Circuit from keyword extraction (Groq rate-limited). Falling back to component-specific code.'],
            visual_graph: { nodes: [], edges: [] },
          });
          dispatchPhase('GENERATION_SUCCESS');
        } else {
          // Groq succeeded — concept is good, but override the generic backend code
          // with our component-specific builder (always cleaner than the static template).
          const finalConcept = data.concept;
          const ino = buildCodeFromConcept(finalConcept);
          setGenerationResult({ ...data, arduino_code: ino });
          dispatchPhase('GENERATION_SUCCESS');
        }
      } else {
        // Network error — fall back to local concept + component-specific code
        console.warn('[CircuitMentor] Network error reaching backend. Using local concept extractor.');
        const ino = buildCodeFromConcept(localConcept);
        setConceptData(localConcept);
        setGenerationResult({
          status: 'SUCCESS',
          concept: localConcept,
          arduino_code: ino,
          eil_warnings: ['Backend offline — showing local keyword-extraction result and component-specific code.'],
          visual_graph: { nodes: [], edges: [] },
        });
        dispatchPhase('GENERATION_SUCCESS');
      }
    } catch (err) {
      // Timeout or unexpected JS error — still show something useful
      const ino = buildCodeFromConcept(localConcept);
      setConceptData(localConcept);
      setGenerationResult({
        status: 'SUCCESS',
        concept: localConcept,
        arduino_code: ino,
        eil_warnings: ['Unexpected error — showing local fallback circuit.'],
        visual_graph: { nodes: [], edges: [] },
      });
      dispatchPhase('GENERATION_SUCCESS');
    }

    setLoading(false);
  }, [selectedPlatform, dispatchPhase, setGenerationResult, setConceptData, setError, intakeAnswers]);

  const isGenerating = useRef(false);

  // ── On mount: sync local state with store phase ──────────────────────────
  // If the store is past DISCOVERY (e.g. hot-reload, back-navigation),
  // reset everything so the UI starts from a clean DISCOVERY state.
  useEffect(() => {
    if (uiPhase !== 'DISCOVERY') {
      reset();
    }
    setShowDiscoveryChat(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uiPhase === 'GENERATING_CIRCUIT' && !isGenerating.current) {
      isGenerating.current = true;
      void handleGenerate(input).finally(() => { isGenerating.current = false; });
    }
  }, [uiPhase, handleGenerate, input]);

  // ── Step 1: User submits idea → show intake wizard ───────────────────────
  const handleIdeaSubmit = (query: string) => {
    if (!query.trim()) return;
    setInput(query);
    setShowIntakeWizard(true);
  };

  // ── Step 2: Intake complete → run discovery with full context ────────────
  const handleIntakeComplete = async (answers: IntakeAnswers) => {
    setIntakeAnswers(answers);
    setExperienceLevel(answers.experience ?? 'beginner');
    setRecommendedMCU(answers.recommendedMCU);
    setShowIntakeWizard(false);
    clearError();
    setLoading(true);

    // Student explicitly said no IoT → respect their answer, skip Groq discovery entirely
    if (answers.remoteControl === 'no') {
      setDiscoveryResult(false, [], '');
      setShowModeSelector(true);
      setLoading(false);
      return;
    }

    // Build enriched query so backend has full context
    const enrichedQuery = [
      input,
      answers.remoteControl === 'yes' ? '(needs phone alerts or remote monitoring)' : '',
      answers.location === 'outdoor' ? '(outdoor use)' : '',
    ].filter(Boolean).join(' ');

    const result = await api.discoverIoT(enrichedQuery);
    if (result.ok) {
      setDiscoveryResult(result.data.is_iot, result.data.platforms, result.data.system_architecture);
      if (result.data.is_iot) {
        // IoT → show reveal screen first, then platform picker
        dispatchPhase('DISCOVER_IOT_SUCCESS');
        setShowIoTReveal(true);
      } else {
        // Non-IoT → straight to mode selector
        setShowModeSelector(true);
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // ── Legacy direct handler (kept for chips in hero) ─────────────────────
  const handleDiscovery = handleIdeaSubmit;

  // ── Mode selection (both IoT and non-IoT reach here) ────────────────────
  const handleModeSelect = async (mode: 'QUICK_BUILD' | 'LEARNING_MODE') => {
    setAppMode(mode);
    setShowModeSelector(false);
    setLoading(true);

    if (mode === 'QUICK_BUILD') {
      dispatchPhase('QUICK_BUILD_START');
      setLoading(false);
      return;
    }

    // Learning Mode — fetch concept + explanation with current platform if IoT
    const platform = selectedPlatform ?? undefined;
    const conceptRes = await api.generateConcept(input);
    if (!conceptRes.ok) { setError(conceptRes.error); setLoading(false); return; }
    // Override concept MCU with the one recommended during Intake Wizard
    const finalConcept = {
      ...conceptRes.data.concept,
      logic: intakeAnswers?.recommendedMCU ? [intakeAnswers.recommendedMCU] : conceptRes.data.concept.logic
    };
    setConceptData(finalConcept);

    const explRes = await api.generateProjectExplanation(
      input,
      selectedPlatform ?? undefined,
      finalConcept ? [...finalConcept.inputs, ...finalConcept.outputs, ...finalConcept.logic] : [],
      intakeAnswers?.experience ?? 'beginner'
    );
    if (!explRes.ok) { setError(explRes.error); setLoading(false); return; }

    setProjectExplanation(explRes.data.explanation);
    if (selectedPlatform) {
      dispatchPhase('IOT_LEARNING_START');
    } else {
      dispatchPhase('DISCOVER_NON_IOT_SUCCESS');
    }
    setLoading(false);
  };

  // ── Platform selection (IoT) ─────────────────────────────────────────────
  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
    
    // Trigger specific guides based on selected platform
    const isTelegram = platformId.toLowerCase().includes('telegram');
    const isBlynkPlatform = platformId === 'Virtual_Blynk' || platformId.toLowerCase().includes('blynk');
    const isESP32Project = intakeAnswers?.recommendedMCU === 'MCU_ESP32';
    
    if (isTelegram) {
      // concept not yet set — extract it locally right now
      if (!concept) {
        const localC = extractConceptFromPrompt(input);
        if (intakeAnswers?.recommendedMCU) {
          localC.logic = [intakeAnswers.recommendedMCU];
        }
        setConceptData(localC);
      }
      setShowTelegramGuide(true);
    } else if (isBlynkPlatform || isESP32Project) {
      setShowBlynkGuide(true);
    } else {
      setShowModeSelector(true);
    }
  };

  // ── Guide Handlers ────────────────────────────
  const handleBlynkGuideComplete = () => {
    setShowBlynkGuide(false);
    setShowModeSelector(true);
  };
  const handleBlynkGuideBack = () => setShowBlynkGuide(false);

  const handleTelegramGuideComplete = () => {
    setShowTelegramGuide(false);
    setShowModeSelector(true);
  };
  const handleTelegramGuideBack = () => setShowTelegramGuide(false);

  const handleCircuitReady = () => {
    const platform = (selectedPlatform ?? '').toLowerCase();
    const comps = [
      ...(selectedComponents.length > 0 ? selectedComponents : [
        ...(concept?.inputs ?? []),
        ...(concept?.outputs ?? [])
      ]),
      ...(concept?.logic ?? []),
    ];

    if (platform.includes('telegram')) {
      setArduinoCode(buildTelegramCode(comps, input));
    } else if (platform.includes('blynk')) {
      setArduinoCode(buildBlynkCode(comps, input));
    } else if (platform.includes('mqtt')) {
      const code = buildStandaloneCode(comps, input);
      setArduinoCode(`// MQTT platform selected — using standalone template\n// Add PubSubClient library for MQTT support:\n// #include <PubSubClient.h>\n\n${code}`);
    } else {
      setArduinoCode(buildStandaloneCode(comps, input));
    }

    dispatchPhase('CIRCUIT_READY');
  };

  // ── IDEA_EXPLANATION → COMPONENT_SELECTION ────────────────────────────────
  const handleIdeaExplained = () => {
    if (concept) {
      // Pre-select recommended registry keys from the concept
      setSelectedComponents(conceptToRegistryKeys(concept));
    }
    dispatchPhase('IDEA_EXPLAINED');
  };

  // ── COMPONENT_SELECTION → COMPONENT_TEACHING ─────────────────────────────
  const handleComponentsConfirmed = (components: string[]) => {
    setSelectedComponents(components);
    dispatchPhase('COMPONENTS_CONFIRMED');
  };

  // ── COMPONENT_TEACHING → SYSTEM_LOGIC_VIEW ───────────────────────────────
  const handleTeachingComplete = () => {
    if (concept) {
      try {
        const logic = generateSystemLogic(concept);
        setSystemLogic(logic);
      } catch (e: any) {
        setError({ message: e.message ?? 'Error generating system logic' });
        return;
      }
    }
    dispatchPhase('TEACHING_COMPLETE');
  };

  // ── Teaching sections (from concept or selectedComponents) ────────────────
  const teachingSections = (() => {
    if (!concept) return [];
    return [
      { category: 'Processing (MCU)', components: concept.logic.map(c => ({ id: c, name: c.replaceAll('_', ' '), description: getExplanation(c), icon: mapIcon(c) })) },
      { category: 'Inputs', components: concept.inputs.map(c => ({ id: c, name: c.replaceAll('_', ' '), description: getExplanation(c), icon: mapIcon(c) })) },
      { category: 'Outputs', components: concept.outputs.map(c => ({ id: c, name: c.replaceAll('_', ' '), description: getExplanation(c), icon: mapIcon(c) })) },
    ].filter(s => s.components.length > 0);
  })();

  // ── Shared chat context ───────────────────────────────────────────────────
  const logicSummary = systemLogic
    ? `Logic type: ${systemLogic.logicType}. Conditions: ${systemLogic.displayConditions.join(', ')}. Actions: ${systemLogic.actions.join(', ')}.`
    : '';

  // ── Phase renderer ────────────────────────────────────────────────────────
  const renderPhase = () => {
    // Hard error block — EIL safety violation
    if (error?.status === 'EIL_HARD_BLOCK') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-xl max-w-lg text-center shadow-xl shadow-red-500/10">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-red-400 mb-2">Safety Block</h2>
            <p className="text-red-200/80 mb-6">{error.message}</p>
            <button onClick={reset} className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors">
              Restart Session
            </button>
          </div>
        </div>
      );
    }

    // AI/LLM error — rate limit or generation failure
    if (error?.message && uiPhase === 'CIRCUIT_VISUALIZATION' && !concept) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
          <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-xl max-w-lg text-center shadow-xl shadow-amber-500/10">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-amber-300 mb-2">Generation Failed</h2>
            <p className="text-amber-200/80 mb-2">{error.message}</p>
            <p className="text-slate-400 text-sm mb-6">This is usually a temporary API rate limit. Wait 30 seconds and try again.</p>
            <button onClick={reset} className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-amber-400 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // DISCOVERY — full screen, no chat
    if (uiPhase === 'DISCOVERY') {
      // Step 1a: Intake wizard (after idea submitted)
      if (showIntakeWizard) {
        return (
          <ProjectIntakeWizard
            projectIdea={input}
            onComplete={handleIntakeComplete}
          />
        );
      }
      // Step 1b: Loading after intake
      if (loading) {
        return <GeneratingScreen mode="QUICK_BUILD" />;
      }
      // Step 1c: Mode selector (non-IoT path)
      if (showModeSelector) {
        return <ModeSelector onSelectMode={handleModeSelect} />;
      }
      // Default: conversational entry (step 0)
      if (showDiscoveryChat) {
        return (
          <ConversationalEntry
            onIdeaConfirmed={(idea) => {
              setInput(idea);
              setShowDiscoveryChat(false);
              handleIdeaSubmit(idea);
            }}
          />
        );
      }
      // Fallback hero (reachable if user skips chat)
      return (
        <HeroSearchSection
          value={input}
          onChange={e => setInput(e.target.value)}
          onSearch={handleIdeaSubmit}
          isLoading={loading}
        />
      );
    }

    if (uiPhase === 'PLATFORM_SELECTED') {
      // IoT path step 1: explain IoT first
      if (showIoTReveal) {
        return (
          <IoTReveal
            projectIdea={input}
            onContinue={() => setShowIoTReveal(false)}
          />
        );
      }
      // IoT path step 1.5: Blynk/ESP32 setup guide (7 steps)
      if (showBlynkGuide) {
        return (
          <BlynkSetupGuide
            projectIdea={input}
            components={selectedComponents.length > 0
              ? selectedComponents
              : concept ? [...concept.inputs, ...concept.outputs] : []}
            onComplete={handleBlynkGuideComplete}
            onBack={handleBlynkGuideBack}
          />
        );
      }
      
      // IoT path step 1.6: Telegram setup guide (5 steps)
      if (showTelegramGuide) {
        return (
          <TelegramSetupGuide
            projectIdea={input}
            components={selectedComponents.length > 0
              ? selectedComponents
              : concept ? [...concept.inputs, ...concept.outputs] : []}
            onComplete={handleTelegramGuideComplete}
            onBack={handleTelegramGuideBack}
          />
        );
      }
      // IoT path step 2: mode selector (after platform chosen)
      if (showModeSelector) {
        return <ModeSelector onSelectMode={handleModeSelect} />;
      }
      // IoT path step 3: platform picker
      return (
        <IoTPlatformSelection
          platforms={platforms.map(p => ({
            id: p.id, name: p.name,
            description: p.description,
            difficulty: p.difficulty as 'beginner' | 'intermediate' | 'advanced'
          }))}
          selectedPlatform={selectedPlatform}
          onSelect={handlePlatformSelect}
        />
      );
    }


    if (uiPhase === 'GENERATING_CIRCUIT') {
      return (
        <GeneratingScreen
          mode={appMode === 'LEARNING_MODE' ? 'LEARNING_MODE' : 'QUICK_BUILD'}
        />
      );
    }

    // ── Learning Mode phases with 70/30 chat layout ───────────────────────

    if (uiPhase === 'IDEA_EXPLANATION') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary}>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-blue-200 font-bold">Preparing component map…</p>
                </div>
              </div>
            )}
            <ProjectExplanationPanel 
              data={projectExplanation} 
              onContinue={handleIdeaExplained} 
              mcuName={intakeAnswers?.recommendedMCU || 'Arduino'}
              inputName={concept?.inputs?.[0]}
              outputName={concept?.outputs?.[0]}
            />
          </div>
        </PhaseLayout>
      );
    }

    if (uiPhase === 'COMPONENT_SELECTION') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary}>
          <ComponentSelectionPanel
            recommendedComponents={selectedComponents}
            onConfirm={handleComponentsConfirmed}
          />
        </PhaseLayout>
      );
    }

    if (uiPhase === 'COMPONENT_TEACHING') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary}>
          <ComponentTeachingPanel
            sections={teachingSections}
            onContinue={handleTeachingComplete}
          />
        </PhaseLayout>
      );
    }

    if (uiPhase === 'SYSTEM_LOGIC_VIEW') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary}>
          <SystemLogicPanel
            data={systemLogic}
            onContinue={() => dispatchPhase('LOGIC_UNDERSTOOD')}
          />
        </PhaseLayout>
      );
    }

    if (uiPhase === 'QUIZ') {
      // Conversational quiz — full screen, no PhaseLayout
      return <ConversationalQuiz />;
    }

    if (uiPhase === 'CIRCUIT_VISUALIZATION') {
      // Full screen canvas, no side chat (floating bubble added inside ResultWorkspaceLayout if needed)
      return (
        <ResultWorkspaceLayout
          selectedComponents={selectedComponents}
          onStartFinalQuiz={handleCircuitReady}
        />
      );
    }

    if (uiPhase === 'CODE_REVIEW') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary} arduinoCodeSnapshot={arduinoCode}>
          <CodeReviewPanel
            arduinoCode={arduinoCode}
            systemLogic={systemLogic}
            onContinue={() => dispatchPhase('CODE_REVIEWED')}
          />
        </PhaseLayout>
      );
    }

    if (uiPhase === 'COMPLETED') {
      return (
        <PhaseLayout phase={uiPhase} selectedComponents={selectedComponents} systemLogicSummary={logicSummary} arduinoCodeSnapshot={arduinoCode}>
          <CompletedWorkspaceLayout
            onDownloadCircuit={() => {}}
            onDownloadCode={() => {
              const blob = new Blob([arduinoCode], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'sketch.ino'; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }}
            onCopyCode={() => navigator.clipboard.writeText(arduinoCode).catch(() => { })}
          />
        </PhaseLayout>
      );
    }

    return null;
  };

  return (
    <div className="relative font-sans text-slate-50 antialiased bg-slate-950 min-h-screen">
      {/* Back / Restart button — hidden on DISCOVERY */}
      {uiPhase !== 'DISCOVERY' && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={handleReset}
            className="backdrop-blur-lg bg-black/20 border border-white/10 px-4 py-2 rounded-full text-white/50 text-xs hover:text-white flex items-center gap-2 transition-all hover:bg-black/40"
          >
            <ChevronLeft size={14} /> Restart
          </button>
        </div>
      )}
      {renderPhase()}
    </div>
  );
}

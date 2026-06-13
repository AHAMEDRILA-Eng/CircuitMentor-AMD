'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronRight, ShoppingCart, ExternalLink, CheckCircle2,
    Circle, Zap, Trophy, Cpu, Radio, Speaker, Lightbulb,
    Thermometer, Droplets, Flame, Wind, Eye, Volume2,
    AlertTriangle, Info, Sparkles, Play, Pause,
    SkipForward, ChevronLeft, Copy, Download, Check,
    Code2, MessageCircle, X, ShieldAlert, Trash2,
} from 'lucide-react';
import CircuitCanvas from '@/components/CircuitCanvas';
import { ReactFlowProvider } from 'reactflow';
import { useProjectStore } from '@/store/useProjectStore';
import { buildCircuitGraph } from '@/logic/wiringRulesEngine';
import { COMPONENT_REGISTRY } from '@/logic/componentRegistry';
import { generateWireExplanations, type WireExplanation } from '@/logic/wireExplainer';
import { API_BASE_URL } from '@/api/client';

// ──────────────────────────────────────────────────────────────────
// Hardware Pricing (unchanged from original)
// ──────────────────────────────────────────────────────────────────
interface HardwareMeta {
    price: number; name: string; url: string;
    purpose: string; icon: React.ReactNode; color: string;
}

const HARDWARE_PRICING: Record<string, HardwareMeta> = {
    'MCU_Arduino_Uno':        { price: 550,  name: 'Arduino Uno R3',            url: 'https://www.amazon.in/s?k=Arduino+Uno+R3',               purpose: 'The brain — runs your code and controls everything',  icon: <Cpu className="w-4 h-4" />,           color: 'text-indigo-400' },
    'MCU_ESP32':              { price: 350,  name: 'ESP32 DevKit V1',            url: 'https://www.amazon.in/s?k=ESP32+Development+Board',       purpose: 'Microcontroller with built-in Wi-Fi & Bluetooth',     icon: <Cpu className="w-4 h-4" />,           color: 'text-cyan-400' },
    'Sensor_PIR':             { price: 90,   name: 'HC-SR501 PIR Sensor',       url: 'https://www.amazon.in/s?k=HC-SR501+PIR',                  purpose: 'Detects human motion via infrared heat',              icon: <Radio className="w-4 h-4" />,         color: 'text-yellow-400' },
    'Sensor_DHT11':           { price: 120,  name: 'DHT11 Temp & Humidity',     url: 'https://www.amazon.in/s?k=DHT11+Module',                  purpose: 'Measures temperature (°C) and humidity (%)',          icon: <Thermometer className="w-4 h-4" />,   color: 'text-orange-400' },
    'Sensor_LDR':             { price: 30,   name: 'LDR Photoresistor',         url: 'https://www.amazon.in/s?k=LDR+Module',                    purpose: 'Detects light intensity — dark/bright environment',   icon: <Lightbulb className="w-4 h-4" />,     color: 'text-amber-400' },
    'Input_Button':           { price: 10,   name: 'Tactile Push Button',       url: 'https://www.amazon.in/s?k=Tactile+Push+Button',           purpose: 'Manual input — press to trigger an action',          icon: <Zap className="w-4 h-4" />,           color: 'text-slate-400' },
    'Sensor_HC_SR04':         { price: 85,   name: 'HC-SR04 Ultrasonic',        url: 'https://www.amazon.in/s?k=HC-SR04+Ultrasonic',            purpose: 'Measures distance 2cm–400cm using sound echo',        icon: <Radio className="w-4 h-4" />,         color: 'text-blue-400' },
    'Actuator_LED':           { price: 5,    name: '5mm LED',                   url: 'https://www.amazon.in/s?k=5mm+LED+pack',                  purpose: 'Visual indicator — lights up on signal',              icon: <Lightbulb className="w-4 h-4" />,     color: 'text-yellow-300' },
    'Actuator_Buzzer':        { price: 25,   name: '5V Active Buzzer',          url: 'https://www.amazon.in/s?k=Active+Buzzer+5V',              purpose: 'Audio alert — beeps when triggered',                  icon: <Speaker className="w-4 h-4" />,       color: 'text-red-400' },
    'Actuator_Relay_5V':      { price: 65,   name: '1-Channel 5V Relay',        url: 'https://www.amazon.in/s?k=1+Channel+5V+Relay',            purpose: 'Switches high-power devices (fan, bulb, pump)',       icon: <Zap className="w-4 h-4" />,           color: 'text-violet-400' },
    'Actuator_Servo_SG90':    { price: 130,  name: 'SG90 Micro Servo',          url: 'https://www.amazon.in/s?k=SG90+Micro+Servo',              purpose: 'Rotates 0–180°. Great for locks, arms, cameras',     icon: <Wind className="w-4 h-4" />,          color: 'text-emerald-400' },
    'Display_LCD_16x2':       { price: 220,  name: '16x2 LCD (I2C)',            url: 'https://www.amazon.in/s?k=16x2+LCD+I2C',                  purpose: 'Displays 32 characters across 2 lines',               icon: <Eye className="w-4 h-4" />,           color: 'text-blue-300' },
    'Display_OLED_SSD1306':   { price: 250,  name: '0.96" OLED Display',       url: 'https://www.amazon.in/s?k=0.96+OLED+I2C',                 purpose: 'High-contrast display — perfect for data readouts',   icon: <Eye className="w-4 h-4" />,           color: 'text-slate-300' },
    'Sensor_Soil_Moisture':   { price: 50,   name: 'Soil Moisture Sensor',      url: 'https://www.amazon.in/s?k=Soil+Moisture+Sensor',          purpose: 'Measures water content in soil (0–1023 range)',       icon: <Droplets className="w-4 h-4" />,      color: 'text-green-400' },
    'Sensor_Rain':            { price: 60,   name: 'Rain Drop Sensor',          url: 'https://www.amazon.in/s?k=Rain+Sensor+Module',            purpose: 'Detects raindrops on metal plate surface',            icon: <Droplets className="w-4 h-4" />,      color: 'text-cyan-300' },
    'Sensor_MQ2_Gas':         { price: 110,  name: 'MQ-2 Gas Sensor',          url: 'https://www.amazon.in/s?k=MQ2+Gas+Sensor',                purpose: 'Detects LPG, smoke, hydrogen, methane gas',          icon: <AlertTriangle className="w-4 h-4" />, color: 'text-orange-400' },
    'Sensor_Flame':           { price: 45,   name: 'Flame Sensor',              url: 'https://www.amazon.in/s?k=Flame+Sensor+Module',           purpose: 'Detects fire/flame via infrared spectrum',            icon: <Flame className="w-4 h-4" />,         color: 'text-red-400' },
    'Sensor_Sound':           { price: 45,   name: 'Sound Sensor',              url: 'https://www.amazon.in/s?k=Sound+Sensor+Module',           purpose: 'Detects sound/clap above a threshold level',          icon: <Volume2 className="w-4 h-4" />,       color: 'text-pink-400' },
    'Sensor_Temperature_LM35':{ price: 55,   name: 'LM35 Temperature Sensor',  url: 'https://www.amazon.in/s?k=LM35+Temperature+Sensor',       purpose: 'Analog temperature output: 10mV per °C',              icon: <Thermometer className="w-4 h-4" />,   color: 'text-orange-300' },
    'Sensor_IR_Obstacle':     { price: 40,   name: 'IR Obstacle Sensor',        url: 'https://www.amazon.in/s?k=IR+Obstacle+Sensor',            purpose: 'Detects objects within 2–30cm range',                 icon: <Radio className="w-4 h-4" />,         color: 'text-red-300' },
    'Actuator_DC_Motor':      { price: 80,   name: '3-6V DC Hobby Motor',       url: 'https://www.amazon.in/s?k=DC+Motor+Arduino',              purpose: 'Rotates continuously — wheels, fans, conveyors',     icon: <Wind className="w-4 h-4" />,          color: 'text-slate-400' },
    'Actuator_Water_Pump':    { price: 150,  name: '5V Mini Water Pump',        url: 'https://www.amazon.in/s?k=5V+Mini+Water+Pump',            purpose: 'Pumps water — automatic irrigation, aquarium',       icon: <Droplets className="w-4 h-4" />,      color: 'text-blue-400' },
    'Actuator_Fan':           { price: 60,   name: '5V DC Cooling Fan',         url: 'https://www.amazon.in/s?k=5V+DC+Fan',                     purpose: 'Cooling or ventilation control',                      icon: <Wind className="w-4 h-4" />,          color: 'text-cyan-400' },
    'Power_9V_Battery':       { price: 40,   name: '9V Battery + Snap',         url: 'https://www.amazon.in/s?k=9V+Battery+clip',               purpose: 'Powers the Arduino independently from USB',           icon: <Zap className="w-4 h-4" />,           color: 'text-emerald-400' },
    'Basic_Resistor':         { price: 2,    name: 'Carbon Film Resistors',     url: 'https://www.amazon.in/s?k=Resistor+kit',                  purpose: '220Ω for LED protection. Prevents pin damage',        icon: <Info className="w-4 h-4" />,          color: 'text-slate-400' },
    'Breadboard':             { price: 90,   name: 'Solderless Breadboard',     url: 'https://www.amazon.in/s?k=Solderless+Breadboard',         purpose: 'Prototype board — no soldering needed',               icon: <Info className="w-4 h-4" />,          color: 'text-slate-400' },
    'Jumper_Wire':            { price: 60,   name: 'Jumper Wires (MM/MF/FF)',   url: 'https://www.amazon.in/s?k=Jumper+Wires',                  purpose: 'Connects components on breadboard to Arduino',        icon: <Info className="w-4 h-4" />,          color: 'text-slate-400' },
};

const REGISTRY_TO_PRICING_KEY: Record<string, string> = {
    'ESP32': 'MCU_ESP32', 'ARDUINO': 'MCU_Arduino_Uno', 'PIR': 'Sensor_PIR',
    'DHT11': 'Sensor_DHT11', 'DHT22': 'Sensor_DHT11', 'HC_SR04': 'Sensor_HC_SR04',
    'HCSR04': 'Sensor_HC_SR04', 'LDR': 'Sensor_LDR', 'SOIL_MOISTURE': 'Sensor_Soil_Moisture',
    'SOILMOISTURE': 'Sensor_Soil_Moisture', 'MQ2_GAS': 'Sensor_MQ2_Gas', 'MQ2': 'Sensor_MQ2_Gas',
    'FLAME': 'Sensor_Flame', 'SOUND': 'Sensor_Sound', 'RAIN': 'Sensor_Rain',
    'NTC_TEMP': 'Sensor_Temperature_LM35', 'IR': 'Sensor_IR_Obstacle', 'BUTTON': 'Input_Button',
    'LED': 'Actuator_LED', 'BUZZER': 'Actuator_Buzzer', 'RELAY': 'Actuator_Relay_5V',
    'SERVO': 'Actuator_Servo_SG90', 'DC_MOTOR': 'Actuator_DC_Motor', 'MOTOR': 'Actuator_DC_Motor',
    'WATER_PUMP': 'Actuator_Water_Pump', 'WATERPUMP': 'Actuator_Water_Pump', 'FAN': 'Actuator_Fan',
    'LCD': 'Display_LCD_16x2', 'OLED': 'Display_OLED_SSD1306',
};

function getBomItem(cid: string): HardwareMeta {
    if (HARDWARE_PRICING[cid]) return HARDWARE_PRICING[cid];
    const ciKey = Object.keys(HARDWARE_PRICING).find(k => k.toLowerCase() === cid.toLowerCase());
    if (ciKey) return HARDWARE_PRICING[ciKey];
    const mapped = REGISTRY_TO_PRICING_KEY[cid.toUpperCase().replace(/-/g, '_')];
    if (mapped && HARDWARE_PRICING[mapped]) return HARDWARE_PRICING[mapped];
    const clean = cid.replace(/^(SENSOR_|ACTUATOR_|INPUT_|DISPLAY_|POWER_|MCU_)/i, '').replace(/_/g, ' ');
    return { price: 50, name: clean + ' Module', url: `https://www.amazon.in/s?k=${clean.replace(/ /g, '+')}+Arduino`, purpose: 'Electronics component for your project', icon: <Info className="w-4 h-4" />, color: 'text-slate-400' };
}

// ──────────────────────────────────────────────────────────────────
// Interactive Code Panel
// ──────────────────────────────────────────────────────────────────
interface CodePanelProps {
    code: string;
    isESP32: boolean;
    hoveredComponent: string | null;
    activeKeywords: string[];   // keywords from current explain-step bubble
    onPinHover: (pin: string | null) => void;
    onCopy: () => void;
    copied: boolean;
}

function CodePanel({ code, isESP32, hoveredComponent, activeKeywords, onPinHover, onCopy, copied }: CodePanelProps) {
    const lines = code.split('\n');

    // Regex to find pin numbers (1-2 digits, not part of larger numbers)
    const PIN_RE = /\b(\d{1,2})\b/g;

    // Component keyword → CSS highlight colour
    const COMP_KW: Record<string, string> = {
        dht: 'bg-orange-500/15 border-l-2 border-orange-400',
        pir: 'bg-yellow-500/15 border-l-2 border-yellow-400',
        relay: 'bg-violet-500/15 border-l-2 border-violet-400',
        servo: 'bg-emerald-500/15 border-l-2 border-emerald-400',
        lcd: 'bg-blue-500/15 border-l-2 border-blue-400',
        buzzer: 'bg-red-500/15 border-l-2 border-red-400',
        tone: 'bg-red-500/15 border-l-2 border-red-400',
        led: 'bg-amber-500/15 border-l-2 border-amber-400',
        motor: 'bg-slate-500/15 border-l-2 border-slate-400',
        soil: 'bg-green-500/15 border-l-2 border-green-400',
        ldr: 'bg-amber-500/15 border-l-2 border-amber-400',
        lm35: 'bg-orange-500/15 border-l-2 border-orange-400',
        ultrasonic: 'bg-blue-500/15 border-l-2 border-blue-400',
        pulse: 'bg-blue-500/15 border-l-2 border-blue-400',
        trig: 'bg-blue-500/15 border-l-2 border-blue-400',
        echo: 'bg-blue-500/15 border-l-2 border-blue-400',
    };

    function lineHighlight(line: string): string | null {
        const lower = line.toLowerCase();
        // Explain-mode active keywords take priority
        for (const kw of activeKeywords) {
            if (lower.includes(kw.toLowerCase())) {
                return 'bg-indigo-500/20 border-l-2 border-indigo-400';
            }
        }
        // Canvas component hover
        if (hoveredComponent) {
            const compLower = hoveredComponent.toLowerCase().replace(/^(sensor_|actuator_|mcu_|display_)/, '');
            if (lower.includes(compLower)) return 'bg-amber-500/15 border-l-2 border-amber-400';
        }
        // Per-keyword colour
        for (const [kw, cls] of Object.entries(COMP_KW)) {
            if (lower.includes(kw)) return cls;
        }
        return null;
    }

    function renderLine(line: string, lineNum: number) {
        const highlight = lineHighlight(line);
        const parts: React.ReactNode[] = [];
        let last = 0;

        // Colour-code the line text and wrap pin numbers in hover spans
        for (const m of line.matchAll(/\b(\d{1,2})\b/g)) {
            const idx = m.index!;
            if (idx > last) parts.push(<span key={`t-${last}`}>{line.slice(last, idx)}</span>);
            const pinNum = m[1];
            const canvasPin = isESP32 ? `GPIO${pinNum}` : `D${pinNum}`;
            parts.push(
                <span
                    key={`p-${idx}`}
                    className="cursor-pointer rounded px-0.5 font-bold text-amber-300 hover:bg-amber-400/20 hover:text-amber-200 transition-colors duration-150 underline decoration-amber-400/40"
                    onMouseEnter={() => onPinHover(canvasPin)}
                    onMouseLeave={() => onPinHover(null)}
                    title={`Hover to highlight ${canvasPin} on circuit`}
                >
                    {pinNum}
                </span>
            );
            last = idx + m[0].length;
        }
        if (last < line.length) parts.push(<span key="tail">{line.slice(last)}</span>);

        return (
            <div
                key={lineNum}
                className={`flex gap-3 px-3 py-0.5 rounded transition-all duration-200 ${highlight ?? 'hover:bg-white/3'}`}
            >
                <span className="select-none text-slate-600 font-mono text-xs w-6 shrink-0 text-right mt-0.5">
                    {lineNum + 1}
                </span>
                <pre className="font-mono text-[12.5px] text-slate-300 whitespace-pre leading-6 flex-1 flex flex-wrap">
                    {parts.length > 0 ? parts : line}
                </pre>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0d1117] rounded-2xl overflow-hidden border border-white/8">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <div className="flex items-center gap-1.5 ml-3">
                        <Code2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-mono text-slate-500">sketch.ino</span>
                    </div>
                </div>
                <button
                    onClick={onCopy}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
                >
                    {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
            </div>

            {/* Hint bar */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-900/20 border-b border-indigo-500/10 shrink-0">
                <Lightbulb className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-[10px] text-indigo-300/70 font-medium">
                    Hover a <span className="text-amber-300 font-bold">number</span> in code to highlight its wire on the diagram →
                </span>
            </div>

            {/* Lines */}
            <div className="flex-1 overflow-y-auto py-3 scroll-smooth">
                {lines.map((line, i) => renderLine(line, i))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-900 border-t border-white/5 shrink-0 flex items-center justify-between text-xs font-mono text-slate-600">
                <span>{lines.length} lines</span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> AI Generated
                </span>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────
// Explain Mode Speech Bubble
// ──────────────────────────────────────────────────────────────────
interface ExplainBubbleProps {
    exp: WireExplanation;
    step: number;
    total: number;
    isPlaying: boolean;
    onPrev: () => void;
    onNext: () => void;
    onTogglePlay: () => void;
    onClose: () => void;
}

function ExplainBubble({ exp, step, total, isPlaying, onPrev, onNext, onTogglePlay, onClose }: ExplainBubbleProps) {
    const WIRE_BG: Record<string, string> = {
        POWER:  'from-red-900/50 border-red-500/30',
        GROUND: 'from-slate-800/80 border-slate-500/30',
        DATA:   'from-blue-900/50 border-blue-500/30',
        SIGNAL: 'from-yellow-900/40 border-yellow-500/30',
        PWM:    'from-emerald-900/40 border-emerald-500/30',
    };
    const bg = WIRE_BG[exp.wireType] ?? WIRE_BG.SIGNAL;

    return (
        <div className={`absolute bottom-4 left-4 right-4 z-30 bg-gradient-to-br ${bg} to-slate-900/95 border backdrop-blur-xl rounded-2xl p-4 shadow-2xl`}
            style={{ animation: 'slideUpFade 0.3s ease-out' }}
        >
            {/* Close */}
            <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>

            {/* Wire colour badge + title */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-lg" style={{ background: exp.wireColourHex, boxShadow: `0 0 8px ${exp.wireColourHex}` }} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {exp.wireColour} Wire · {exp.wireType}
                </span>
                <span className="ml-auto text-xs text-slate-500">{step + 1} / {total}</span>
            </div>

            {/* Title */}
            <p className="font-bold text-white text-sm mb-1">{exp.title}</p>

            {/* Route */}
            <p className="text-xs text-slate-400 font-mono mb-2">
                <span className="text-white">{exp.fromLabel}</span>
                {exp.fromPin ? ` [${exp.fromPin}]` : ''} →{' '}
                <span className="text-white">{exp.toLabel}</span>
                {exp.toPin ? ` [${exp.toPin}]` : ''}
            </p>

            {/* Why */}
            <p className="text-xs text-slate-300 leading-relaxed mb-3">{exp.why}</p>

            {/* Controls */}
            <div className="flex items-center gap-2">
                <button onClick={onPrev} disabled={step === 0}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={onTogglePlay}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold transition-all">
                    {isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Auto Play</>}
                </button>
                <button onClick={onNext} disabled={step === total - 1}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <SkipForward className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────
// Component classifier
// ──────────────────────────────────────────────────────────────────
function classifyComponent(k: string): 'input' | 'output' | 'mcu' | 'other' {
    const regEntry = COMPONENT_REGISTRY[k];
    if (regEntry) {
        if (regEntry.category === 'SENSOR') return 'input';
        if (regEntry.category === 'ACTUATOR') return 'output';
        if (regEntry.category === 'MCU') return 'mcu';
    }
    if (k.startsWith('Sensor_') || k.startsWith('Input_')) return 'input';
    if (k.startsWith('Actuator_') || k.startsWith('Display_')) return 'output';
    if (k.startsWith('MCU_')) return 'mcu';
    return 'other';
}

// ──────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────
const EMPTY_ARRAY: string[] = [];

interface ResultWorkspaceLayoutProps {
    selectedComponents?: string[];
    onStartFinalQuiz?: () => void;
}

export function ResultWorkspaceLayout({ selectedComponents = EMPTY_ARRAY, onStartFinalQuiz }: ResultWorkspaceLayoutProps) {
    const {
        concept, validatedCircuit, arduinoCode, recommendedMCU,
        hoveredPin, hoveredComponent,
        explainModeActive, explainStep,
        sandboxModeActive, sandboxEdges, sandboxValidationResult,
        setHoveredPin, setHoveredComponent,
        setExplainMode, setExplainStep,
        setSandboxModeActive, setSandboxEdges, setSandboxValidationResult,
        faultyEdges, setFaultyEdges, hoveredFaultyPin, setHoveredFaultyPin,
        breadboardView, setBreadboardView,
    } = useProjectStore();

    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [showCelebration, setShowCelebration] = useState(false);
    const [copied, setCopied] = useState(false);
    const [explainPlaying, setExplainPlaying] = useState(false);
    const playTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isESP32 = recommendedMCU?.toLowerCase().includes('esp32') ?? false;

    // ── Synced concept ──────────────────────────────────────────
    const syncedConcept = React.useMemo(() => {
        if (!concept) return null;
        return {
            ...concept,
            inputs: selectedComponents.length > 0 ? selectedComponents.filter(k => classifyComponent(k) === 'input') : concept.inputs,
            outputs: selectedComponents.length > 0 ? selectedComponents.filter(k => classifyComponent(k) === 'output') : concept.outputs,
            logic: concept.logic,
        };
    }, [concept, selectedComponents]);

    // ── Build graph + explanations ──────────────────────────────
    const graph = React.useMemo(() =>
        syncedConcept ? buildCircuitGraph(syncedConcept, validatedCircuit?.pin_assignments) : { nodes: [], edges: [] },
        [syncedConcept, validatedCircuit]
    );

    const wireExplanations: WireExplanation[] = React.useMemo(() =>
        generateWireExplanations(graph.edges as any, graph.nodes as any),
        [graph]
    );

    // ── Wiring checklist (from graph, same source as canvas) ────
    const wiringChecklist = React.useMemo(() =>
        graph.edges.map((e: any, i: number) => {
            const fromNode = graph.nodes.find((n: any) => n.id === e.from);
            const toNode   = graph.nodes.find((n: any) => n.id === e.to);
            const fromLabel = fromNode ? (fromNode as any).label : e.from;
            const toLabel   = toNode   ? (toNode as any).label   : e.to;
            const fp = e.fromPin.replace(/_(src|tgt)$/, '');
            const tp = e.toPin.replace(/_(src|tgt)$/, '');
            const fromStr = fp && fp !== 'in' ? `${fromLabel} [${fp}]` : fromLabel;
            const toStr   = tp && tp !== 'in' ? `${toLabel} [${tp}]`   : toLabel;
            let wt = 'signal';
            if (e.wireType === 'POWER')  wt = 'power';
            if (e.wireType === 'GROUND') wt = 'ground';
            return { id: `wire-${i}`, label: `${fromStr} → ${toStr}`, wireType: wt };
        }),
        [graph]
    );

    // ── BOM ────────────────────────────────────────────────────
    const bomList = React.useMemo(() => {
        const conceptComponents = concept ? [...concept.inputs, ...concept.outputs, ...concept.logic] : [];
        const rawComponents = selectedComponents.length > 0 ? selectedComponents : conceptComponents;
        const needsResistor = rawComponents.some(c => c.toLowerCase().includes('led'));
        const extras = ['Breadboard', 'Jumper_Wire', ...(needsResistor ? ['Basic_Resistor'] : [])];
        return Array.from(new Set([...rawComponents, ...extras]));
    }, [concept, selectedComponents]);

    const totalCost = React.useMemo(() => {
        return bomList.reduce((sum, cid) => sum + getBomItem(cid).price, 0);
    }, [bomList]);

    const totalWires = wiringChecklist.length;
    const checkedCount = checked.size;
    const buildProgress = totalWires > 0 ? Math.round((checkedCount / totalWires) * 100) : 0;
    const allDone = totalWires > 0 && checkedCount === totalWires;

    useEffect(() => {
        if (allDone && !showCelebration) {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 4000);
        }
    }, [allDone]);

    // ── Copy code ──────────────────────────────────────────────
    const handleCopy = () => {
        navigator.clipboard.writeText(arduinoCode).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Explain Mode controls ──────────────────────────────────
    const currentExplanation = wireExplanations[explainStep] ?? null;

    // When explain mode is ON, highlight the active wire's pins.
    // ⚠️ Do NOT add currentExplanation to deps — it's a new object every render
    // and would cause an infinite setState loop. explainStep (primitive) is enough.
    useEffect(() => {
        const exp = wireExplanations[explainStep] ?? null;
        if (explainModeActive && exp) {
            setHoveredPin(exp.fromPin);
        } else if (!explainModeActive) {
            setHoveredPin(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [explainModeActive, explainStep]);

    const handleExplainNext = useCallback(() => {
        if (explainStep < wireExplanations.length - 1) setExplainStep(explainStep + 1);
        else { setExplainPlaying(false); setExplainMode(false); }
    }, [explainStep, wireExplanations.length]);

    // Auto-play timer
    useEffect(() => {
        if (explainPlaying) {
            playTimerRef.current = setTimeout(handleExplainNext, 3500);
        }
        return () => { if (playTimerRef.current) clearTimeout(playTimerRef.current); };
    }, [explainPlaying, explainStep]);

    // Auto-Fix Wires
    const handleAutoFix = (payload: any) => {
        if (!payload || !payload.edgeId) return;
        const currentEdges = useProjectStore.getState().sandboxEdges;
        const updatedEdges = currentEdges.map((edge) => {
            if (edge.id === payload.edgeId) {
                if (payload.toNode === 'MCU') {
                    return { ...edge, targetHandle: payload.correctPin };
                } else if (payload.fromNode === 'MCU') {
                    return { ...edge, sourceHandle: payload.correctPin };
                }
            }
            return edge;
        });
        useProjectStore.getState().setSandboxEdges(updatedEdges);
        const currentFaulty = useProjectStore.getState().faultyEdges;
        useProjectStore.getState().setFaultyEdges(currentFaulty.filter(id => id !== payload.edgeId));
    };

    // Validate Sandbox edges in real-time
    const validateSandbox = useCallback(async (currentEdges: any[]) => {

        if (!syncedConcept) return;
        const mcuKey = recommendedMCU || 'MCU_Arduino_Uno';

        // 1. Get the list of all active components in the workspace
        // Exclude rails from EIL components list (EIL checks standard components)
        const activeComponents = bomList.filter(
            c => c !== 'Breadboard' && c !== 'Jumper_Wire' && c !== 'Basic_Resistor' && c !== mcuKey
        );

        // 2. Map ReactFlow edges back to EIL connections format
        const connections = currentEdges.map(edge => {
            // Helper to get Component Key and Pin Name from Node ID & Handle
            const resolveEILNode = (nodeId: string, handleId: string) => {
                if (nodeId === 'MCU') {
                    const cleanPin = handleId;
                    return `${mcuKey}.${cleanPin}`;
                }
                if (nodeId === 'VCC_RAIL') {
                    return 'VCC';
                }
                if (nodeId === 'GND_RAIL') {
                    return 'GND';
                }
                
                // Find node object in graph
                const node = graph.nodes.find((n: any) => n.id === nodeId);
                if (!node) return `${nodeId}.${handleId}`;
                
                // Resolve component key
                const compKey = node.componentKey; // e.g. "SENSOR_HC_SR04" or similar
                if (!compKey) return `${nodeId}.${handleId}`;
                
                // Convert SENSOR_HC_SR04 back to Sensor_HC_SR04 (matching components.json keys)
                const registryKey = Object.keys(HARDWARE_PRICING).find(
                    k => k.toUpperCase() === compKey.toUpperCase()
                ) ?? compKey;
                
                const cleanPin = handleId;
                return `${registryKey}.${cleanPin}`;
            };

            return {
                from: resolveEILNode(edge.source, edge.sourceHandle),
                to: resolveEILNode(edge.target, edge.targetHandle)
            };
        });

        // 3. Make EIL Payload
        const proposal = {
            mcu: mcuKey,
            power_sources: ['Power_9V_Battery'], // default power source
            components: activeComponents,
            connections: connections
        };

        try {
            const res = await fetch(`${API_BASE_URL}/eil-validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposal)
            });
            const data = await res.json();
            
            // 4. Logic Matching (Code vs Diagram)
            const backendPins = validatedCircuit?.pin_assignments as Record<string, Record<string, string>> | undefined;
            const logicErrors: any[] = [];
            


            if (backendPins) {
                connections.forEach(conn => {
                    const partsF = conn.from.split('.');
                    const partsT = conn.to.split('.');
                    if (partsF.length < 2 || partsT.length < 2) return;
                    
                    const fComp = partsF[0], fPin = partsF[1];
                    const tComp = partsT[0], tPin = partsT[1];
                    


                    // Ignore VCC and GND for specific pin matching (only skip if the component's pin is a power pin)
                    const isPowerPin = (p: string) => ['VCC', 'GND', 'VIN', '5V', '3.3V', 'POWER'].includes(p.toUpperCase());
                    if (isPowerPin(fPin)) return;



                    const normalizePin = (p: string) => {
                        let clean = p.replace(/^GPIO/, '');
                        if (/^A\d+$/.test(clean)) return clean; // keep A4, A5
                        return clean.replace(/^D/, ''); // strip D for digital pins
                    };

                    const PIN_ALIASES: Record<string, string> = {
                      'clk': 'scl', 'clock': 'scl', 'sck': 'scl',
                      'dat': 'sda', 'data': 'sda', 'mosi': 'sda',
                      'sig': 'signal', 'out': 'signal', 'in': 'signal',
                      'trig': 'trig', 'echo': 'echo'
                    };

                    const findBestPinMatch = (backendEntry: Record<string, any>, pinName: string): string | undefined => {
                      const lower = pinName.toLowerCase();
                      const resolved = PIN_ALIASES[lower] ?? lower;
                      
                      // 1. Exact or alias match
                      if (backendEntry[resolved] !== undefined) return String(backendEntry[resolved]);
                      
                      // 2. Fuzzy fallback
                      const fuzzyKey = Object.keys(backendEntry).find(k => lower.includes(k) || k.includes(lower));
                      if (fuzzyKey) return String(backendEntry[fuzzyKey]);
                      
                      return undefined;
                    };

                    // Check if From is a component and To is MCU
                    if (fComp !== mcuKey && backendPins[fComp]) {
                        const expectedPin = findBestPinMatch(backendPins[fComp], fPin);

                        if (expectedPin !== undefined) {
                            const cleanTPin = normalizePin(tPin);
                            const expectedClean = normalizePin(expectedPin);

                            if (tComp === mcuKey && cleanTPin !== expectedClean) {
                                const isAnalog = /^A\d+$/.test(expectedPin);
                                const prefix = isAnalog ? '' : 'D';
                                logicErrors.push({
                                    code: "LOGIC_MISMATCH",
                                    technical: "Connection doesn't match the code.",
                                    explanation: `In the code, ${fComp}'s ${fPin} pin is assigned to ${expectedPin}, but you connected it to ${cleanTPin}.`,
                                    fix: `Connect ${fComp}.${fPin} to MCU.${prefix}${expectedClean} to match your Arduino code.`,
                                    autoFixPayload: { edgeId: (conn as any).id || `edge-${conn.from}-${conn.to}`, toNode: 'MCU', correctPin: expectedPin }
                                });
                            }
                        }
                    }

                    // Check if To is a component and From is MCU
                    if (tComp !== mcuKey && backendPins[tComp]) {
                        const expectedPin = findBestPinMatch(backendPins[tComp], tPin);

                        if (expectedPin !== undefined) {
                            const cleanFPin = normalizePin(fPin);
                            const expectedClean = normalizePin(expectedPin);

                            if (fComp === mcuKey && cleanFPin !== expectedClean) {
                                const isAnalog = /^A\d+$/.test(expectedPin);
                                const prefix = isAnalog ? '' : 'D';
                                logicErrors.push({
                                    code: "LOGIC_MISMATCH",
                                    technical: "Connection doesn't match the code.",
                                    explanation: `In the code, ${tComp}'s ${tPin} pin is assigned to ${expectedPin}, but you connected it to ${cleanFPin}.`,
                                    fix: `Connect MCU.${prefix}${expectedClean} to ${tComp}.${tPin} to match your Arduino code.`,
                                    autoFixPayload: { edgeId: (conn as any).id || `edge-${conn.from}-${conn.to}`, fromNode: 'MCU', correctPin: expectedPin }
                                });
                            }
                        }
                    }
                });
            }

            if (logicErrors.length > 0) {
                if (data.status === 'OK' || data.status === 'WARNING') {
                    data.status = 'ERROR';
                }
                data.errors = [...(data.errors || []), ...logicErrors];
            }

            setSandboxValidationResult(data);
        } catch (err) {
            console.error('Error validating sandbox circuit:', err);
        }
    }, [syncedConcept, recommendedMCU, bomList, graph, validatedCircuit, setSandboxValidationResult, sandboxModeActive, breadboardView]);

    // Trigger EIL validation dynamically in Sandbox Mode
    const serializedEdges = JSON.stringify(sandboxEdges);
    useEffect(() => {
        if (sandboxModeActive && !breadboardView) {
            validateSandbox(sandboxEdges);
        } else {
            setSandboxValidationResult(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serializedEdges, sandboxModeActive, breadboardView, validateSandbox, setSandboxValidationResult]);

    const toggleExplainMode = () => {
        if (explainModeActive) {
            setExplainMode(false);
            setExplainPlaying(false);
        } else {
            setExplainMode(true);
            setExplainStep(0);
        }
    };

    const WIRE_COLORS: Record<string, string> = {
        power:  'text-red-400 border-red-500/30 bg-red-500/5',
        ground: 'text-slate-400 border-slate-500/30 bg-slate-500/5',
        signal: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
    };
    const WIRE_DOT: Record<string, string> = {
        power: 'bg-red-500', ground: 'bg-slate-500', signal: 'bg-yellow-400',
    };

    return (
        <div className="min-h-screen bg-[#07070F] overflow-y-auto pb-24 font-sans">
            <style>{`
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Celebration Banner */}
            {showCelebration && (
                <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 animate-fade-down pointer-events-none">
                    <div className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.4)] backdrop-blur-xl">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                        <p className="text-emerald-300 font-black text-lg">🎉 All wires connected! Your circuit is ready to test!</p>
                    </div>
                </div>
            )}

            <div className="max-w-[1500px] mx-auto px-6 pt-8">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-400/20 rounded-full mb-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Circuit Workspace</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Your Circuit</h1>
                        <p className="text-slate-400 mt-1 text-sm">Hover pin numbers in the code to highlight wires. Click components on the diagram.</p>
                    </div>
                    <button
                        onClick={onStartFinalQuiz}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                        Finish & Export <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Section 1: Circuit Canvas + Code Panel ─────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5 mb-6">

                    {/* Circuit Canvas */}
                    <div className="relative bg-slate-950/60 border border-white/8 rounded-2xl overflow-hidden">
                        {/* Canvas header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-900/60">
                            <div className="flex items-center gap-3">
                                <h2 className="text-white font-bold text-sm">Circuit Diagram</h2>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">Auto-Routed</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Schematic / Breadboard View Toggle */}
                                <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-white/10 select-none mr-2">
                                    <button
                                        onClick={() => setBreadboardView(false)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer ${
                                            !breadboardView
                                                ? 'bg-indigo-600 text-white shadow-[0_0_8px_rgba(79,70,229,0.4)]'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        Schematic
                                    </button>
                                    <button
                                        onClick={() => setBreadboardView(true)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer ${
                                            breadboardView
                                                ? 'bg-indigo-600 text-white shadow-[0_0_8px_rgba(79,70,229,0.4)]'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        Breadboard
                                    </button>
                                </div>

                                {/* Wire legend */}
                                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 mr-2">
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-red-500 inline-block rounded" /> 5V</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-slate-400 inline-block rounded" /> GND</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-yellow-400 inline-block rounded" /> Signal</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-blue-400 inline-block rounded" /> Data</span>
                                </div>
                                {/* Sandbox Mode toggle — disabled while Breadboard view is active */}
                                <button
                                    onClick={() => !breadboardView && setSandboxModeActive(!sandboxModeActive)}
                                    disabled={breadboardView}
                                    title={breadboardView ? 'Switch to Schematic view to use Sandbox Mode' : undefined}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        breadboardView
                                            ? 'opacity-30 cursor-not-allowed bg-white/5 text-slate-500 border border-white/10'
                                            : sandboxModeActive
                                                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)] border border-indigo-400/30'
                                                : 'bg-white/5 text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-300 border border-white/10'
                                    }`}
                                >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    {sandboxModeActive ? 'Exit Sandbox' : 'Sandbox Mode'}
                                </button>
                                {sandboxModeActive && (
                                    <button
                                        onClick={() => setSandboxEdges([])}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all duration-200"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Clear Wires
                                    </button>
                                )}
                                {/* Explain Mode toggle */}
                                <button
                                    onClick={toggleExplainMode}
                                    disabled={sandboxModeActive}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        sandboxModeActive ? 'opacity-50 cursor-not-allowed' : ''
                                    } ${
                                        explainModeActive
                                            ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                                            : 'bg-white/5 text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-300 border border-white/10'
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {explainModeActive ? 'Exit Explain' : 'Explain Mode'}
                                </button>
                            </div>
                        </div>

                        {/* Canvas body */}
                        <div className="relative h-[520px] w-full cursor-grab active:cursor-grabbing bg-slate-950/40">
                            <ReactFlowProvider>
                                <div style={{ height: '100%', width: '100%' }}>
                                    <CircuitCanvas />
                                </div>
                            </ReactFlowProvider>

                            {/* Explain Mode Bubble */}
                            {explainModeActive && currentExplanation && (
                                <ExplainBubble
                                    exp={currentExplanation}
                                    step={explainStep}
                                    total={wireExplanations.length}
                                    isPlaying={explainPlaying}
                                    onPrev={() => setExplainStep(Math.max(0, explainStep - 1))}
                                    onNext={handleExplainNext}
                                    onTogglePlay={() => setExplainPlaying(p => !p)}
                                    onClose={() => { setExplainMode(false); setExplainPlaying(false); }}
                                />
                            )}

                            {/* Sandbox Mode Alert Overlay */}
                            {sandboxModeActive && sandboxValidationResult && (
                                <div className="absolute bottom-4 left-4 right-4 z-20 animate-[slideUpFade_0.3s_ease-out] pointer-events-auto max-h-[160px] overflow-y-auto">
                                    {sandboxValidationResult.status === 'ERROR' ? (
                                        <div className="flex flex-col gap-3">
                                            {/* Hardware Hazards */}
                                            {sandboxValidationResult.errors.filter((e: any) => e.code !== 'LOGIC_MISMATCH').length > 0 && (
                                                <div className="flex flex-col gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 shadow-[0_4px_24px_rgba(239,68,68,0.2)] backdrop-blur-md">
                                                    <div className="flex items-center gap-2 font-black text-sm text-red-400">
                                                        <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                                                        💥 ELECTRONIC HAZARD DETECTED!
                                                    </div>
                                                    {sandboxValidationResult.errors.filter((e: any) => e.code !== 'LOGIC_MISMATCH').map((err: any, idx: number) => (
                                                        <div key={idx} className="text-xs leading-normal font-mono pl-6 border-l-2 border-red-500/40">
                                                            <p className="font-bold text-red-200">{err.explanation}</p>
                                                            <p className="text-slate-400 mt-0.5">🛠️ Fix: {err.fix}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Logic Mismatches */}
                                            {sandboxValidationResult.errors.filter((e: any) => e.code === 'LOGIC_MISMATCH').length > 0 && (
                                                <div className="flex flex-col gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 shadow-[0_4px_24px_rgba(249,115,22,0.2)] backdrop-blur-md">
                                                    <div className="flex items-center gap-2 font-black text-sm text-orange-400">
                                                        <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
                                                        ⚡ LOGIC MISMATCH
                                                    </div>
                                                    {sandboxValidationResult.errors.filter((e: any) => e.code === 'LOGIC_MISMATCH').map((err: any, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            className="text-xs leading-normal font-mono pl-6 border-l-2 border-orange-500/40 relative group"
                                                            onMouseEnter={() => {
                                                                if (err.autoFixPayload?.correctPin) {
                                                                    const rawPinNumber = err.autoFixPayload.correctPin.replace(/^GPIO/, '');
                                                                    setHoveredFaultyPin(rawPinNumber);
                                                                }
                                                            }}
                                                            onMouseLeave={() => setHoveredFaultyPin(null)}
                                                        >
                                                            <p className="font-bold text-orange-200">{err.explanation}</p>
                                                            <p className="text-slate-400 mt-0.5 mb-2">🛠️ Fix: {err.fix}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : sandboxValidationResult.status === 'WARNING' ? (
                                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-[0_4px_24px_rgba(245,158,11,0.2)] backdrop-blur-md">
                                            <div className="flex items-center gap-2 font-black text-sm text-amber-400">
                                                <Info className="w-4 h-4 text-amber-400 animate-pulse" />
                                                ⚠️ CIRCUIT WARNING
                                            </div>
                                            {sandboxValidationResult.warnings.map((warn: any, idx: number) => (
                                                <div key={idx} className="text-xs leading-normal font-mono pl-6 border-l-2 border-amber-500/40">
                                                    <p className="font-bold text-amber-200">{warn.explanation}</p>
                                                    <p className="text-slate-400 mt-0.5">🛠️ Fix: {warn.fix}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-[0_4px_24px_rgba(16,185,129,0.2)] backdrop-blur-md">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
                                            <div>
                                                <p className="font-black text-sm text-emerald-400">⚡ CIRCUIT IS SAFE & VALID!</p>
                                                <p className="text-slate-400 text-xs mt-0.5 font-mono">No shorts, load strain, or floating inputs detected. Great wiring!</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Explain Mode dim overlay when not active */}
                            {explainModeActive && (
                                <div className="absolute inset-0 pointer-events-none ring-2 ring-indigo-500/30 rounded-2xl" />
                            )}
                        </div>
                    </div>

                    {/* Code Panel */}
                    <div className="h-[580px]">
                        <CodePanel
                            code={arduinoCode || '// No code generated yet.\n// Generate a circuit to see the sketch here.'}
                            isESP32={isESP32}
                            hoveredComponent={hoveredComponent}
                            activeKeywords={explainModeActive && currentExplanation ? currentExplanation.codeKeywords : []}
                            onPinHover={setHoveredPin}
                            onCopy={handleCopy}
                            copied={copied}
                        />
                    </div>
                </div>

                {/* ── Section 2: Wiring Progress + Checklist ─────────── */}
                <div className="mb-6">
                    {/* Progress bar */}
                    {totalWires > 0 && (
                        <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-5 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    <span className="text-white font-bold text-sm">Wiring Progress</span>
                                    <span className="text-slate-500 text-xs">· tick each wire as you connect it physically</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-sm">{checkedCount}/{totalWires}</span>
                                    <span className={`font-black text-sm ${allDone ? 'text-emerald-400' : 'text-amber-400'}`}>{buildProgress}%</span>
                                </div>
                            </div>
                            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                        allDone
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                            : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                    }`}
                                    style={{ width: `${buildProgress}%` }}
                                />
                            </div>
                            {allDone && (
                                <p className="text-emerald-400 text-xs font-bold mt-2 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> All connections verified — ready to upload!
                                </p>
                            )}
                        </div>
                    )}

                    {/* Checklist grid */}
                    {wiringChecklist.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {wiringChecklist.map((wire: any) => {
                                const isDone = checked.has(wire.id);
                                return (
                                    <button
                                        key={wire.id}
                                        onClick={() => setChecked(prev => {
                                            const next = new Set(prev);
                                            if (next.has(wire.id)) next.delete(wire.id);
                                            else next.add(wire.id);
                                            return next;
                                        })}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 group ${
                                            isDone
                                                ? 'border-emerald-500/30 bg-emerald-500/8 scale-[0.99]'
                                                : `${WIRE_COLORS[wire.wireType]} hover:scale-[1.01] hover:border-opacity-60`
                                        }`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? 'bg-emerald-400' : WIRE_DOT[wire.wireType]}`} />
                                        <span className={`flex-1 font-mono text-xs leading-relaxed ${isDone ? 'text-emerald-300 line-through opacity-60' : 'text-slate-300'}`}>
                                            {wire.label}
                                        </span>
                                        {isDone
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            : <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                                        }
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Section 3: Bill of Materials ────────────────────── */}
                <div className="bg-slate-900/60 border border-emerald-500/15 rounded-2xl overflow-hidden mb-8">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold">Bill of Materials</h2>
                                <p className="text-slate-500 text-xs">{bomList.length} components needed</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-xs">Estimated Total</p>
                            <p className="text-3xl font-black text-emerald-400">₹{totalCost.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {bomList.map((cid, i) => {
                            const item = getBomItem(cid);
                            return (
                                <div key={cid} className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors group">
                                    <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 ${item.color} group-hover:bg-white/8 transition-colors`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5 truncate">{item.purpose}</p>
                                    </div>
                                    <p className="text-emerald-300 font-mono font-bold text-sm shrink-0">₹{item.price}</p>
                                    <a href={item.url} target="_blank" rel="noreferrer"
                                        className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all border border-blue-500/20 hover:border-blue-400/40">
                                        Buy <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            );
                        })}
                    </div>

                    <div className="px-6 py-4 bg-emerald-500/5 border-t border-emerald-500/15 flex items-center justify-between">
                        <p className="text-slate-400 text-sm">💡 Prices are estimates from Amazon India. Actual prices may vary.</p>
                        <p className="text-emerald-400 font-black text-lg">Total: ₹{totalCost.toLocaleString()}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}

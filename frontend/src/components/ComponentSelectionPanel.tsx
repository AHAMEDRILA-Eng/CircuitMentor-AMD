'use client';

import React from 'react';
import { Check, Cpu, Zap, Radio, Lightbulb, Speaker, ToggleLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPONENT_REGISTRY } from '@/logic/componentRegistry';

interface ComponentSelectionPanelProps {
    recommendedComponents: string[];
    onConfirm: (selected: string[]) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
    SENSOR: 'Sensors',
    ACTUATOR: 'Actuators',
    MCU: 'Microcontrollers',
    TIMER: 'Logic',
    PLATFORM: 'IoT Platforms',
};

function ComponentIcon({ name, className }: { name: string; className?: string }) {
    const n = name.toUpperCase();
    if (n.includes('PIR') || n.includes('BUTTON')) return <Radio className={className} />;
    if (n.includes('DHT') || n.includes('SOIL') || n.includes('LDR') || n.includes('LM35')) return <Zap className={className} />;
    if (n.includes('HC_SR04')) return <Radio className={className} />;
    if (n.includes('LED') || n.includes('LCD')) return <Lightbulb className={className} />;
    if (n.includes('BUZZER')) return <Speaker className={className} />;
    if (n.includes('SERVO') || n.includes('RELAY') || n.includes('MOTOR')) return <ToggleLeft className={className} />;
    if (n.includes('ARDUINO') || n.includes('ESP')) return <Cpu className={className} />;
    return <Zap className={className} />;
}

function friendlyName(key: string): string {
    const map: Record<string, string> = {
        PIR: 'PIR Motion Sensor',
        HC_SR04: 'Ultrasonic Distance Sensor',
        DHT11: 'DHT11 Temp & Humidity Sensor',
        LM35: 'LM35 Temperature Sensor',
        SOIL_MOISTURE: 'Soil Moisture Sensor',
        LDR: 'Light Dependent Resistor',
        BUTTON: 'Push Button',
        LED: 'LED',
        BUZZER: 'Buzzer',
        SERVO: 'Servo Motor',
        MOTOR: 'DC Motor / Fan',
        RELAY: 'Relay Module',
        LCD: '16×2 I2C LCD Display',
        TIMER: 'Timer Logic',
        ARDUINO: 'Arduino Uno',
        ESP32: 'ESP32',
        BLYNK: 'Blynk IoT Platform',
    };
    return map[key] ?? key.replace(/_/g, ' ');
}

export function ComponentSelectionPanel({ recommendedComponents, onConfirm }: ComponentSelectionPanelProps) {
    const [selected, setSelected] = React.useState<string[]>(recommendedComponents);

    const grouped = React.useMemo(() => {
        const groups: Record<string, string[]> = {};
        for (const key of Object.keys(COMPONENT_REGISTRY)) {
            const cat = COMPONENT_REGISTRY[key].category;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(key);
        }
        return groups;
    }, []);

    const toggle = (key: string) => {
        setSelected(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    return (
        <div className="flex h-screen w-full bg-[#03030a] text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Left Sidebar - Sticky Info */}
            <div className="hidden lg:flex flex-col justify-between w-[400px] xl:w-[450px] p-10 bg-gradient-to-b from-[#0a0a1a] to-[#03030a] border-r border-white/5 relative z-10">
                
                {/* Decorative background glow */}
                <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Phase 02 · Selection</span>
                    </div>

                    <h1 className="text-5xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40">
                        Craft Your<br />Hardware.
                    </h1>
                    
                    <p className="text-slate-400 text-lg leading-relaxed mb-8">
                        We've pre-selected the optimal components for your project. Feel free to tweak the list below to match your exact inventory.
                    </p>

                    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm font-medium">Selected Items</span>
                            <span className="text-2xl font-bold text-white">{selected.length}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
                                style={{ width: `${Math.min((selected.length / 10) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <Button
                        onClick={() => onConfirm(selected)}
                        disabled={selected.length === 0}
                        className="w-full h-14 bg-white hover:bg-slate-200 text-black font-bold rounded-2xl text-lg transition-all duration-300 disabled:opacity-50 group flex items-center justify-center gap-3"
                    >
                        Confirm Setup
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <p className="text-center text-slate-500 text-xs mt-4">
                        You can't change these later in this session.
                    </p>
                </div>
            </div>

            {/* Right Side - Scrollable Grid */}
            <div className="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth">
                {/* Mobile Header (Hidden on LG) */}
                <div className="lg:hidden p-6 pb-2 border-b border-white/5 bg-[#0a0a1a] sticky top-0 z-20 backdrop-blur-xl">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Component Selection</h1>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">{selected.length} items selected</span>
                        <Button
                            onClick={() => onConfirm(selected)}
                            disabled={selected.length === 0}
                            size="sm"
                            className="bg-white text-black font-bold rounded-lg"
                        >
                            Confirm <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <div className="p-6 lg:p-12 max-w-5xl mx-auto pb-32 lg:pb-12">
                    {Object.entries(grouped).map(([category, keys], idx) => (
                        <div key={category} className="mb-16 animate-in slide-in-from-bottom-8 duration-700 fill-mode-both" style={{ animationDelay: `${idx * 100}ms` }}>
                            
                            {/* Category Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-xl font-bold tracking-tight text-white/90">
                                    {CATEGORY_LABEL[category] ?? category}
                                </h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                            </div>

                            {/* Components Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {keys.map((key, i) => {
                                    const isSelected = selected.includes(key);
                                    const isRecommended = recommendedComponents.includes(key);
                                    
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => toggle(key)}
                                            className={`
                                                relative group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300
                                                border ${isSelected ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}
                                            `}
                                        >
                                            {/* Glowing gradient background for selected state */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50" />
                                            )}

                                            <div className="relative p-5 flex flex-col h-full z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`
                                                        w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                                                        ${isSelected ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-slate-400 group-hover:text-slate-200 group-hover:scale-110'}
                                                    `}>
                                                        <ComponentIcon name={key} className="w-6 h-6" />
                                                    </div>
                                                    
                                                    {/* Selection Indicator */}
                                                    <div className={`
                                                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                                        ${isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700 bg-transparent'}
                                                    `}>
                                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                </div>

                                                <h3 className={`font-semibold mb-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                    {friendlyName(key)}
                                                </h3>
                                                
                                                <div className="mt-auto pt-2 flex items-center">
                                                    {isRecommended && (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" /> Recommended
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

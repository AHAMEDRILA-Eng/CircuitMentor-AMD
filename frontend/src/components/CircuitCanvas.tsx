'use client';

/**
 * ============================================================
 * CircuitCanvas.tsx — ReactFlow-based Circuit Visualizer
 * ============================================================
 * Receives a `concept` from the Zustand store, runs it through
 * the WiringRulesEngine to get an electrically-correct graph,
 * then renders it using ReactFlow with Wokwi / Fritzing / Card nodes.
 *
 * Layout:
 *   [Sensors / Inputs]  ←→  [Arduino MCU]  ←→  [Actuators / Displays]
 *                                  ↑
 *                          [VCC Rail + GND Rail]
 * ============================================================
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Handle,
    Position,
    NodeProps,
    EdgeProps,
    getSmoothStepPath,
    Node,
    Edge,
    addEdge,
    Connection,
    applyEdgeChanges,
    ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@wokwi/elements';
import { useProjectStore } from '@/store/useProjectStore';
import { buildCircuitGraph, CircuitNode } from '@/logic/wiringRulesEngine';
import { BreadboardCanvas } from '@/components/BreadboardCanvas';
import {
    C,
    type CompDef,
    type PinDef,
    COMPONENT_DEFS,
    KEYWORD_TO_COMP,
    resolveDef,
} from '@/logic/componentDefs';

// C, CompDef, PinDef, COMPONENT_DEFS, KEYWORD_TO_COMP, resolveDef → imported from @/logic/componentDefs


// ── Wire color by type ────────────────────────────────────────────────────────
function wireColor(wireType: string): string {
    if (wireType === 'POWER') return C.VCC;
    if (wireType === 'GROUND') return C.GND;
    if (wireType === 'DATA' || wireType === 'I2C') return C.DATA;
    if (wireType === 'PWM') return C.PWM;
    return C.SIGNAL;
}

// ── Node renderers ────────────────────────────────────────────────────────────

// Power Rail
function PowerRailNode({ data }: NodeProps) {
    const { color, width, label, handleCount } = data;
    const slots = Array.from({ length: handleCount ?? 8 });
    const sandboxModeActive = useProjectStore(s => s.sandboxModeActive);

    const handleStyle = (posLeft: number): React.CSSProperties => sandboxModeActive ? {
        left: posLeft,
        top: 0,
        transform: 'translateX(-50%)',
        width: 14,
        height: 14,
        opacity: 0.9,
        background: color,
        border: '2px solid white',
        borderRadius: '50%',
        cursor: 'crosshair',
        zIndex: 20,
        boxShadow: `0 0 8px ${color}`
    } : {
        left: posLeft,
        top: 0,
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        background: 'transparent',
        border: 'none',
        pointerEvents: 'none'
    };

    return (
        <div style={{ position: 'relative', width, height: 12 }}>
            <div style={{ position: 'absolute', top: 3, left: 0, right: 0, height: 6, background: color, borderRadius: 3, boxShadow: `0 0 8px ${color}88` }} />
            <div style={{ position: 'absolute', top: -18, left: 8, fontSize: 10, fontWeight: 800, color, letterSpacing: 1, fontFamily: 'monospace' }}>{label}</div>
            <Handle id="in" type="target" position={Position.Left} isConnectable={sandboxModeActive} style={sandboxModeActive ? { left: 0, top: 6, width: 14, height: 14, background: color, border: '2px solid white', zIndex: 20 } : { left: 0, top: 6, width: 0, height: 0, background: 'transparent', border: 'none' }} />
            {slots.map((_, i) => (
                <Handle key={i} id={`slot_${i}`} type="source" position={Position.Top} isConnectable={sandboxModeActive}
                    style={handleStyle(40 + (i + 1) * (width / (slots.length + 1)))} />
            ))}
        </div>
    );
}

// Type icons / colors for generic card
const TYPE_ICONS: Record<string, string> = { sensor: '📡', actuator: '⚙️', display: '🖥️', communication: '📶', power: '⚡', motor: '🔄', input: '🎛️', basic: '🔧', semiconductor: '⬡', mcu: '🖥', unknown: '🔌' };
const TYPE_COLORS: Record<string, string> = { sensor: '#3b82f6', actuator: '#10b981', display: '#8b5cf6', communication: '#f59e0b', power: '#ef4444', motor: '#06b6d4', input: '#ec4899', basic: '#f97316', semiconductor: '#a78bfa', mcu: '#22d3ee', unknown: '#64748b' };

function GenericModuleNode({ data }: NodeProps) {
    const { label, compType = 'unknown', pins, renderW = 110, renderH = 70, imageUrl } = data;
    const color = TYPE_COLORS[compType] ?? TYPE_COLORS.unknown;
    const icon = TYPE_ICONS[compType] ?? TYPE_ICONS.unknown;
    const sandboxModeActive = useProjectStore(s => s.sandboxModeActive);

    return (
        <div style={{ position: 'relative', width: renderW, height: renderH }}>
            {(pins as PinDef[])?.map((pin) => {
                const px = pin.xPct * renderW, py = pin.yPct * renderH;
                const pos = pin.yPct < 0.1 ? Position.Top : pin.yPct > 0.9 ? Position.Bottom : pin.xPct < 0.1 ? Position.Left : Position.Right;
                const handleStyle: React.CSSProperties = sandboxModeActive ? {
                    left: px,
                    top: py,
                    width: 14,
                    height: 14,
                    opacity: 0.9,
                    background: pin.color,
                    border: '2px solid white',
                    borderRadius: '50%',
                    transform: 'translate(-50%,-50%)',
                    cursor: 'crosshair',
                    zIndex: 20,
                    boxShadow: `0 0 8px ${pin.color}`
                } : {
                    left: px,
                    top: py,
                    width: 0,
                    height: 0,
                    opacity: 0,
                    pointerEvents: 'none'
                };
                return (
                    <React.Fragment key={pin.id}>
                        <Handle id={pin.id} type="source" position={pos} isConnectable={sandboxModeActive} style={handleStyle} />
                        {!sandboxModeActive && (
                            <div style={{ position: 'absolute', left: px, top: py, width: 8, height: 8, borderRadius: '50%', background: pin.color, border: '1.5px solid #0f172a', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 10, boxShadow: `0 0 4px ${pin.color}88` }} />
                        )}
                    </React.Fragment>
                );
            })}
            <div style={{ width: renderW, height: renderH, 
                background: imageUrl ? 'transparent' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                border: imageUrl ? 'none' : `1.5px solid ${color}55`, 
                borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                gap: imageUrl ? 2 : 4, 
                boxShadow: imageUrl ? 'none' : `0 0 12px ${color}22` 
            }}>
                {!imageUrl && <div style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius: 1 }} />}
                
                {imageUrl ? (
                    <>
                        <img src={imageUrl} alt={label} onError={(e) => { 
                            e.currentTarget.style.display = 'none'; 
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; 
                            if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
                                e.currentTarget.parentElement.style.border = `1.5px solid ${color}55`;
                                e.currentTarget.parentElement.style.boxShadow = `0 0 12px ${color}22`;
                            }
                        }} style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 5, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }} />
                        <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 5 }}>
                            <div style={{ fontSize: 20 }}>{icon}</div>
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace', textAlign: 'center', padding: '0 4px', lineHeight: 1.1 }}>{label}</div>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 20, zIndex: 5 }}>{icon}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace', textAlign: 'center', padding: '0 4px', lineHeight: 1.1 }}>{label}</div>
                    </>
                )}
                
                {!imageUrl && (
                    <div style={{ fontSize: 7, color, fontWeight: 600, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{compType}</div>
                )}
            </div>
        </div>
    );
}

// Wokwi web component node
function WokwiNode({ data }: NodeProps) {
    const { tag, renderW, renderH, pins, label, imageUrl } = data;
    const sandboxModeActive = useProjectStore(s => s.sandboxModeActive);
    return (
        <div style={{ position: 'relative', width: renderW, height: renderH }}>
            {(pins as PinDef[])?.map((pin) => {
                const px = pin.xPct * renderW, py = pin.yPct * renderH;
                const pos = pin.yPct < 0.1 ? Position.Top : pin.yPct > 0.9 ? Position.Bottom : pin.xPct < 0.1 ? Position.Left : Position.Right;
                const handleStyle: React.CSSProperties = sandboxModeActive ? {
                    left: px,
                    top: py,
                    width: 14,
                    height: 14,
                    opacity: 0.9,
                    background: pin.color,
                    border: '2px solid white',
                    borderRadius: '50%',
                    transform: 'translate(-50%,-50%)',
                    cursor: 'crosshair',
                    zIndex: 20,
                    boxShadow: `0 0 8px ${pin.color}`
                } : {
                    left: px,
                    top: py,
                    width: 0,
                    height: 0,
                    opacity: 0,
                    pointerEvents: 'none'
                };
                return (
                    <React.Fragment key={pin.id}>
                        <Handle id={pin.id} type="source" position={pos} isConnectable={sandboxModeActive} style={handleStyle} />
                        {!sandboxModeActive && (
                            <div style={{ position: 'absolute', left: px, top: py, width: 8, height: 8, borderRadius: '50%', background: pin.color, border: '1.5px solid #0f172a', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 10, boxShadow: `0 0 4px ${pin.color}88` }} />
                        )}
                    </React.Fragment>
                );
            })}
            {tag ? (
                React.createElement(tag, { style: { width: renderW, height: renderH, display: 'block' } })
            ) : imageUrl ? (
                <img
                    src={imageUrl}
                    alt={label}
                    style={{
                        width: renderW,
                        height: renderH,
                        display: 'block',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
                    }}
                />
            ) : null}
            <div style={{ position: 'absolute', top: renderH + 5, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', background: 'rgba(15,23,42,0.85)', padding: '1px 8px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
        </div>
    );
}

// ── Edge: Signal (animated dashed) ───────────────────────────────────────────────────
function SignalEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
    const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 6 });
    const color = (data?.color as string) ?? C.SIGNAL;
    const hoveredPin = useProjectStore(s => s.hoveredPin);
    const explainModeActive = useProjectStore(s => s.explainModeActive);
    const srcHandle = (data?.sourceHandle as string) ?? '';
    const tgtHandle = (data?.targetHandle as string) ?? '';
    const isHighlighted = hoveredPin !== null && (srcHandle === hoveredPin || tgtHandle === hoveredPin);
    const isDimmed = hoveredPin !== null && !isHighlighted && !explainModeActive;
    const isSelected = selected;
    const sw = isHighlighted ? 4 : 2.3;
    const op = isDimmed ? 0.18 : 1;
    const glowFilter = isHighlighted 
        ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)` 
        : isSelected 
            ? `drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #fbbf24)` 
            : undefined;

    return (
        <g style={{ opacity: op, transition: 'opacity 0.2s', filter: glowFilter }}>
            {isSelected && (
                <path d={path} stroke="#fbbf24" strokeWidth={6} fill="none" opacity={0.6} strokeLinecap="round" />
            )}
            <path d={path} stroke={color} strokeWidth={10} fill="none" opacity={0.07} strokeLinecap="round" />
            <path d={path} stroke="#000"  strokeWidth={3.5} fill="none" opacity={0.18} strokeLinecap="round" />
            
            <path d={path} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray="8 4" style={{ animation: 'dash 1.2s linear infinite' }} />
            
            <circle cx={sourceX} cy={sourceY} r={isHighlighted || isSelected ? 5 : 4} fill={isSelected ? '#fbbf24' : color} opacity={0.85} />
            <circle cx={targetX} cy={targetY} r={isHighlighted || isSelected ? 5 : 4} fill={isSelected ? '#fbbf24' : color} opacity={0.85} />
        </g>
    );
}

// ── Edge: Power (solid) ────────────────────────────────────────────────────────────────────────────
function PowerEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
    const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 6 });
    const color = (data?.color as string) ?? C.VCC;
    const hoveredPin = useProjectStore(s => s.hoveredPin);
    const explainModeActive = useProjectStore(s => s.explainModeActive);
    const srcHandle = (data?.sourceHandle as string) ?? '';
    const tgtHandle = (data?.targetHandle as string) ?? '';
    const isHighlighted = hoveredPin !== null && (srcHandle === hoveredPin || tgtHandle === hoveredPin);
    const isDimmed = hoveredPin !== null && !isHighlighted && !explainModeActive;
    const isSelected = selected;
    const sw = isHighlighted ? 4 : 2.3;
    const op = isDimmed ? 0.18 : 1;
    const glowFilter = isHighlighted 
        ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)` 
        : isSelected 
            ? `drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #fbbf24)` 
            : undefined;

    return (
        <g style={{ opacity: op, transition: 'opacity 0.2s', filter: glowFilter }}>
            {isSelected && (
                <path d={path} stroke="#fbbf24" strokeWidth={6} fill="none" opacity={0.6} strokeLinecap="round" />
            )}
            <path d={path} stroke={color} strokeWidth={10} fill="none" opacity={0.06} strokeLinecap="round" />
            <path d={path} stroke="#000"  strokeWidth={3.5} fill="none" opacity={0.18} strokeLinecap="round" />
            <path d={path} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="square" />
            <circle cx={targetX} cy={targetY} r={isHighlighted || isSelected ? 5 : 3.5} fill={isSelected ? '#fbbf24' : color} opacity={0.85} />
        </g>
    );
}

// ── Node: I2C Display (OLED / LCD) — custom card so handles are always reliable ─
function DisplayNode({ data }: { data: { label: string; displayType: 'oled' | 'lcd' } }) {
    const isOled = data.displayType === 'oled';
    const sandboxModeActive = useProjectStore(s => s.sandboxModeActive);

    const getStyle = (config: { left: number; top?: number; bottom?: number }, pinColor: string): React.CSSProperties => {
        const baseStyle: React.CSSProperties = sandboxModeActive ? {
            width: 14,
            height: 14,
            opacity: 0.9,
            background: pinColor,
            border: '2px solid white',
            borderRadius: '50%',
            transform: 'translate(-50%,-50%)',
            cursor: 'crosshair',
            zIndex: 20,
            boxShadow: `0 0 8px ${pinColor}`
        } : {
            width: 8,
            height: 8,
            background: pinColor,
            border: '1.5px solid #0f172a',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none' as const,
            zIndex: 10,
            boxShadow: `0 0 4px ${pinColor}88`
        };
        return {
            ...baseStyle,
            left: config.left,
            ...(config.top !== undefined ? { top: config.top } : {}),
            ...(config.bottom !== undefined ? { bottom: config.bottom } : {})
        };
    };

    return (
        <div style={{
            width: 120, background: isOled ? '#0a0a14' : '#2d4a1e',
            border: `2px solid ${isOled ? '#4f46e5' : '#22c55e'}`,
            borderRadius: 10, padding: '8px 6px', fontFamily: 'monospace',
            boxShadow: `0 0 14px ${isOled ? '#4f46e540' : '#22c55e30'}`,
            position: 'relative',
        }}>
            {/* Screen */}
            <div style={{
                background: isOled ? '#000' : '#7ec850', borderRadius: 6,
                height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6, border: `1px solid ${isOled ? '#2d2d5e' : '#4a7c30'}`,
                fontSize: 9, color: isOled ? '#22d3ee' : '#1a3a0a', fontWeight: 'bold', letterSpacing: 1,
            }}>
                {isOled ? 'ΟLED' : 'LCD'}
            </div>
            {/* Chip label */}
            <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', marginBottom: 4 }}>
                {data.label}
            </div>
            {/* Pin labels row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#64748b', marginBottom: 2 }}>
                <span style={{ color: C.VCC   }}>VCC</span>
                <span style={{ color: C.GND   }}>GND</span>
                <span style={{ color: C.I2C   }}>SDA</span>
                <span style={{ color: C.I2C   }}>SCL</span>
            </div>
            {/* ReactFlow Handles — fixed positions, no web-component interference */}
            {/* VCC — top-left */}
            <Handle id="VIN"  type="source" position={Position.Top}   isConnectable={sandboxModeActive} style={getStyle({ left: 20, top: 0 }, C.VCC)} />
            {/* VCC for LCD (sigPin SDA uses VCC pin) */}
            <Handle id="VCC"  type="source" position={Position.Top}   isConnectable={sandboxModeActive} style={getStyle({ left: 20, top: 0 }, C.VCC)} />
            {/* GND — top-right */}
            <Handle id="GND"  type="source" position={Position.Top}   isConnectable={sandboxModeActive} style={getStyle({ left: 95, top: 0 }, C.GND)} />
            {/* SDA (DATA) — bottom-left */}
            <Handle id="DATA" type="source" position={Position.Bottom} isConnectable={sandboxModeActive} style={getStyle({ left: 20, bottom: 0 }, C.I2C)} />
            {/* SDA alias for LCD */}
            <Handle id="SDA"  type="source" position={Position.Bottom} isConnectable={sandboxModeActive} style={getStyle({ left: 20, bottom: 0 }, C.I2C)} />
            {/* SCL (CLK) — bottom-right */}
            <Handle id="CLK"  type="source" position={Position.Bottom} isConnectable={sandboxModeActive} style={getStyle({ left: 70, bottom: 0 }, C.I2C)} />
        </div>
    );
}

const nodeTypes = { wokwi: WokwiNode, powerRail: PowerRailNode, generic: GenericModuleNode, displayCard: DisplayNode, image: GenericModuleNode };
const edgeTypes = { signal: SignalEdge, power: PowerEdge };
const proOptions = { hideAttribution: true };

// ── Convert WiringEngine output → ReactFlow nodes/edges ──────────────────────
function engineToReactFlow(
    concept: { inputs: string[]; logic: string[]; outputs: string[] } | null,
    backendPins?: Record<string, any>
): { nodes: Node[]; edges: Edge[] } {
    const graph = buildCircuitGraph(concept, backendPins);
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    const totalSlots = graph.nodes.filter(n => n.kind !== 'MCU' && n.kind !== 'POWER_RAIL').length;
    const RAIL_W = 900;

    for (const cn of graph.nodes) {
        if (cn.kind === 'MCU') {
            // Pick ESP32 or Arduino Uno based on the concept's logic
            const isESP32 = cn.componentKey?.toUpperCase().includes('ESP32') ||
                            cn.id?.toUpperCase().includes('ESP32') ||
                            cn.label?.toUpperCase().includes('ESP32');
            const mcuKey = isESP32 ? 'MCU_ESP32' : 'MCU_ARDUINO_UNO';
            const d = COMPONENT_DEFS[mcuKey];
            // Both ESP32 and Arduino MCU nodes use the 'wokwi' ReactFlow node renderer
            const nodeType = 'wokwi';
            rfNodes.push({
                id: cn.id, type: nodeType,
                position: { x: cn.x, y: cn.y },
                draggable: true,
                data: { tag: d.tag, renderW: d.renderW, renderH: d.renderH, label: cn.label ?? mcuKey, pins: d.pins, compType: 'mcu', componentKey: mcuKey, imageUrl: d.imageUrl },
            });
            continue;
        }

        if (cn.kind === 'POWER_RAIL') {
            rfNodes.push({
                id: cn.id, type: 'powerRail',
                position: { x: cn.x, y: cn.y },
                draggable: false, selectable: false,
                data: { color: (cn.meta as any)?.color, width: RAIL_W, label: cn.label, handleCount: totalSlots + 2, componentKey: 'POWER_RAIL' },
            });
            continue;
        }

        const { def, nodeType } = resolveDef(cn.componentKey, cn.kind);

        rfNodes.push({
            id: cn.id, type: nodeType,
            position: { x: cn.x, y: cn.y },
            draggable: true,
            data: {
                tag: def.tag, renderW: def.renderW, renderH: def.renderH,
                label: cn.label, pins: def.pins,
                compType: def.compType ?? 'unknown',
                displayType: cn.componentKey.toLowerCase().includes('oled') ? 'oled' : 'lcd',
                imageUrl: def.imageUrl || `/images/${cn.componentKey}.png`,
                componentKey: cn.componentKey
            },
        });
    }

    for (const ce of graph.edges) {
        const isPower = ce.wireType === 'POWER' || ce.wireType === 'GROUND';
        const color = wireColor(ce.wireType);
        // wiringRulesEngine appends _src / _tgt suffixes — strip them so they
        // match the bare handle IDs defined on node components (e.g. '5V', 'TRIG')
        const srcHandle = ce.fromPin.replace(/_(src|tgt)$/, '');
        const tgtHandle = ce.toPin.replace(/_(src|tgt)$/, '');
        rfEdges.push({
            id: ce.id,
            type: isPower ? 'power' : 'signal',
            source: ce.from, sourceHandle: srcHandle,
            target: ce.to,   targetHandle: tgtHandle,
            data: { color, sourceHandle: srcHandle, targetHandle: tgtHandle },
        });
    }

    return { nodes: rfNodes, edges: rfEdges };
}

// ── Main Component ────────────────────────────────────────────────────────────
const CircuitCanvas = () => {
    const {
        concept, validatedCircuit, sandboxModeActive, sandboxEdges,
        setSandboxEdges, sandboxValidationResult, breadboardView,
    } = useProjectStore();
    const { fitView, getEdges } = useReactFlow();
    const backendPins = validatedCircuit?.pin_assignments as Record<string, any> | undefined;

    const { nodes: initNodes, edges: initEdges } = useMemo(
        () => engineToReactFlow(concept, backendPins),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [concept, validatedCircuit]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
    const activeEdges = sandboxModeActive ? sandboxEdges : initEdges;
    const [edges, setEdges, onEdgesChange] = useEdgesState(activeEdges);

    const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{ edgeId: string; x: number; y: number } | null>(null);

    // Sync ReactFlow state whenever concept or activeEdges change
    useEffect(() => {
        setNodes(initNodes);
        setEdges(activeEdges);
    }, [initNodes, activeEdges, setNodes, setEdges]);

    // Close right-click context menu on outer clicks
    useEffect(() => {
        const handleClose = () => setContextMenu(null);
        window.addEventListener('click', handleClose);
        return () => window.removeEventListener('click', handleClose);
    }, []);

    const onEdgesChangeCustom = useCallback((changes: any) => {
        onEdgesChange(changes);
        if (sandboxModeActive) {
            const currentEdges = getEdges();
            const nextEdges = applyEdgeChanges(changes, currentEdges);
            setSandboxEdges(nextEdges);
        }
    }, [onEdgesChange, sandboxModeActive, setSandboxEdges, getEdges]);

    // Helper to get matching wire color based on source pin type
    const getWireColor = useCallback((sourceId: string, handleId: string | null) => {
        if (!handleId) return C.SIGNAL;
        const node = nodes.find(n => n.id === sourceId);
        if (!node || !node.data?.pins) return C.SIGNAL;
        const cleanId = handleId;
        const pin = node.data.pins.find((p: any) => p.id === cleanId);
        return pin ? pin.color : C.SIGNAL;
    }, [nodes]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target) return;
        const color = getWireColor(params.source, params.sourceHandle);
        const isPower = color === C.VCC || color === C.GND;
        const newEdge = {
            ...params,
            id: `edge-sandbox-${Date.now()}`,
            type: isPower ? 'power' : 'signal',
            data: { color, sourceHandle: params.sourceHandle, targetHandle: params.targetHandle }
        };
        
        const currentEdges = getEdges();
        const nextEdges = addEdge(newEdge, currentEdges);
        setEdges(nextEdges);
        
        if (sandboxModeActive) {
            setSandboxEdges(nextEdges);
        }
    }, [sandboxModeActive, setSandboxEdges, getWireColor, setEdges, getEdges]);

    // Also validate the graph and show warnings
    const validation = useMemo(() => buildCircuitGraph(concept, backendPins), [concept, validatedCircuit]);


    // Combined node+edge count — single stable dependency (React rules: array size must not change)
    const graphSize = nodes.length + edges.length;
    useEffect(() => {
        if (nodes.length > 0) {
            // Fire twice: once after DOM paint, once after Wokwi elements finish rendering
            const t1 = setTimeout(() => fitView({ padding: 0.10, duration: 400 }), 200);
            const t2 = setTimeout(() => fitView({ padding: 0.10, duration: 400 }), 800);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphSize, fitView]);

    if (!concept || nodes.length === 0) {
        return (
            <div style={{ minHeight: 500 }} className="w-full rounded-2xl border border-white/8 bg-[#07070F] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-3">⚡</div>
                    <p className="text-slate-500 text-sm font-mono">Circuit will appear here</p>
                    <p className="text-slate-600 text-xs mt-1 font-mono">Generate a project to see the wiring diagram</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes dash { to { stroke-dashoffset: -24; } }
                @keyframes drawWire { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
            `}</style>

            {/* Validation warning strip (only show in standard mode) */}
            {!sandboxModeActive && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="mb-2 flex flex-wrap gap-2 px-1">
                    {validation.errors.map((e, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono px-3 py-1 rounded-full">
                            ⚠ {e}
                        </span>
                    ))}
                    {validation.warnings.map((w, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono px-3 py-1 rounded-full">
                            ℹ {w}
                        </span>
                    ))}
                </div>
            )}

            {/* Canvas: Breadboard SVG -or- ReactFlow schematic */}
            {breadboardView ? (
                <div
                    style={{ height: 560 }}
                    className="w-full rounded-2xl border border-white/8 bg-[#0a1628] overflow-auto transition-all duration-300"
                >
                    <BreadboardCanvas graph={validation} />
                </div>
            ) : (
                /* Custom glowing wrapper depending on EIL status in Sandbox Mode */
                (() => {
                    let glowClass = "border-white/8";
                    if (sandboxModeActive) {
                        if (sandboxValidationResult?.status === 'ERROR') {
                            glowClass = "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-[shake_0.4s_ease-in-out]";
                        } else if (sandboxValidationResult?.status === 'OK' || sandboxValidationResult?.status === 'WARNING') {
                            glowClass = "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]";
                        } else {
                            glowClass = "border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
                        }
                    }

                    return (
                        <div style={{ height: 560 }} className={`w-full rounded-2xl border bg-[#07070F] overflow-hidden transition-all duration-300 ${glowClass}`}>
                            <ReactFlow
                                nodes={nodes} edges={edges}
                                onNodesChange={onNodesChange} onEdgesChange={onEdgesChangeCustom}
                                onConnect={sandboxModeActive ? onConnect : undefined}
                                nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                                nodesDraggable={true} nodesConnectable={sandboxModeActive}
                                connectionMode={ConnectionMode.Loose}
                                panOnDrag zoomOnScroll fitView
                                proOptions={proOptions}
                                deleteKeyCode={sandboxModeActive ? ['Delete', 'Backspace'] : null}
                                edgesFocusable={true}
                                edgesUpdatable={sandboxModeActive}
                                onEdgeClick={(_, edge) => {
                                    setSelectedEdgeId(edge.id);
                                }}
                                onPaneClick={() => setSelectedEdgeId(null)}
                                onNodeClick={() => setSelectedEdgeId(null)}
                                onEdgeContextMenu={(event, edge) => {
                                    event.preventDefault();
                                    if (sandboxModeActive) {
                                        setContextMenu({
                                            edgeId: edge.id,
                                            x: event.clientX,
                                            y: event.clientY,
                                        });
                                    }
                                }}
                                onEdgesDelete={(deleted) => {
                                    const deletedIds = deleted.map(e => e.id);
                                    const current = useProjectStore.getState().faultyEdges;
                                    useProjectStore.getState().setFaultyEdges(
                                        current.filter(id => !deletedIds.includes(id))
                                    );
                                }}
                            >
                                <Background color="#1e293b" gap={24} size={1} />
                                <Controls style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                <MiniMap
                                    nodeColor={n => n.type === 'powerRail' ? '#ef4444' : '#6366f1'}
                                    maskColor="rgba(7,7,15,0.85)"
                                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                                />
                            </ReactFlow>
                        </div>
                    );
                })()
            )}

            {/* Wire legend */}
            <div className="flex flex-wrap gap-4 mt-3 px-1">
                {[
                    { color: C.VCC,    label: '5V Power' },
                    { color: C.GND,    label: 'Ground' },
                    { color: C.SIGNAL, label: 'Digital Signal' },
                    { color: C.ANALOG, label: 'Analog Signal' },
                    { color: C.PWM,    label: 'PWM' },
                    { color: C.DATA,   label: 'Data / I2C' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div style={{ width: 24, height: 3, background: color, borderRadius: 2 }} />
                        <span className="text-xs text-slate-500 font-mono">{label}</span>
                    </div>
                ))}
            </div>

            {/* Context menu for removing wires */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y,
                        zIndex: 9999,
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        padding: '4px',
                        minWidth: '120px',
                    }}
                >
                    <button
                        onClick={() => {
                            setEdges((eds) => eds.filter(e => e.id !== contextMenu.edgeId));
                            if (sandboxModeActive) {
                                setSandboxEdges(sandboxEdges.filter(e => e.id !== contextMenu.edgeId));
                            }
                            const currentFaulty = useProjectStore.getState().faultyEdges;
                            useProjectStore.getState().setFaultyEdges(
                                currentFaulty.filter(id => id !== contextMenu.edgeId)
                            );
                            setContextMenu(null);
                        }}
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            borderRadius: '4px',
                        }}
                        className="hover:bg-red-500/10 transition-colors"
                    >
                        Remove Wire
                    </button>
                </div>
            )}
        </>
    );
};

export default CircuitCanvas;

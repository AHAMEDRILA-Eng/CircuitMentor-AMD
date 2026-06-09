'use client';

/**
 * ============================================================
 * BreadboardCanvas.tsx — Cirkit Designer–style SVG Renderer
 * ============================================================
 * Layout:  [Arduino]  [Breadboard 63×10]  [Components]
 *
 * The breadboard is vertical with 63 numbered rows, columns
 * A-E (left) and F-J (right) separated by a centre gap,
 * and ±power rails on both edges.
 *
 * Components render using the same images / Wokwi tags as the
 * schematic view via componentDefs.ts.
 * ============================================================
 */

import React, { useMemo, useCallback } from 'react';
import type { CircuitGraph } from '@/logic/wiringRulesEngine';
import { resolveDef, COMPONENT_DEFS } from '@/logic/componentDefs';
import '@wokwi/elements';
import '@wokwi/elements/dist/esm/esp32-devkit-v1-element';
import {
    buildBreadboardLayout,
    rowY, colX,
    BB_ROWS, ROW_PITCH, HOLE_R, BB_X, BB_Y, BB_W, BB_H, BB_INNER_W,
    LEFT_COLS, RIGHT_COLS, COL,
    ARD_X, ARD_W, ARD_H,
    COMP_X, CANVAS_W, CANVAS_H,
    type BBComponent,
} from '@/logic/breadboardLayoutEngine';

// ── Colour palette ────────────────────────────────────────────────────────────
const BOARD_BG     = '#e8e0d0';
const BOARD_BORDER = '#c4b89a';
const HOLE_EMPTY   = '#9b8b70';
const HOLE_FILL_ST = '#1e293b';
const GAP_LINE     = '#c4b89a';
const RAIL_PLUS_C  = '#ef4444';
const RAIL_MINUS_C = '#3b82f6';
const ARD_LABEL    = '#e2e8f0';
const CANVAS_BG    = '#0b1120';
const GRID_DOT     = 'rgba(255,255,255,0.03)';

// ── Helpers ───────────────────────────────────────────────────────────────────
const allRows = Array.from({ length: BB_ROWS }, (_, i) => i + 1);
const leftCols  = [...LEFT_COLS];
const rightCols = [...RIGHT_COLS];

// ── Component visual ──────────────────────────────────────────────────────────
function CompVisual({ comp }: { comp: BBComponent }) {
    const { def } = resolveDef(comp.componentKey, comp.kind as any);
    const { imgX, imgY, imgW, imgH } = comp;

    // Short label
    const short = comp.label.split(' ').slice(0, 2).join(' ').slice(0, 16);

    return (
        <g>
            {/* Card background */}
            <rect
                x={imgX - 6} y={imgY - 18}
                width={imgW + 12} height={imgH + 32}
                rx={6} fill="#111827" stroke="#1e293b" strokeWidth={1}
                opacity={0.9}
            />
            {/* Label */}
            <text
                x={imgX + imgW / 2} y={imgY - 5}
                textAnchor="middle" fontSize={7.5}
                fill="#94a3b8" fontWeight={700}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >{short}</text>

            {/* Actual image / Wokwi element / generic fallback */}
            {def.tag ? (
                <foreignObject
                    x={imgX} y={imgY}
                    width={imgW} height={imgH}
                    style={{ overflow: 'visible' }}
                >
                    {React.createElement(def.tag as any, {
                        style: { width: `${imgW}px`, height: `${imgH}px`, display: 'block' },
                    })}
                </foreignObject>
            ) : def.imageUrl ? (
                <image
                    href={def.imageUrl}
                    x={imgX} y={imgY}
                    width={imgW} height={imgH}
                    preserveAspectRatio="xMidYMid meet"
                />
            ) : (
                <g>
                    <rect
                        x={imgX} y={imgY}
                        width={imgW} height={imgH}
                        rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1}
                    />
                    <text
                        x={imgX + imgW / 2} y={imgY + imgH / 2}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={9} fill="#94a3b8" fontWeight={700}
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >{short}</text>
                </g>
            )}

            {/* Pin labels on left edge of component card */}
            {comp.pinHoles.map(hole => (
                <g key={`plbl-${comp.nodeId}-${hole.pinId}`}>
                    <circle cx={imgX - 6} cy={hole.y} r={2.5}
                        fill={hole.color} opacity={0.9} />
                    <text
                        x={imgX - 12} y={hole.y + 0.5}
                        textAnchor="end" dominantBaseline="middle"
                        fontSize={6} fill={hole.color} fontWeight={700}
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >{hole.label.slice(0, 5)}</text>
                </g>
            ))}
        </g>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface BreadboardCanvasProps { graph: CircuitGraph }

export function BreadboardCanvas({ graph }: BreadboardCanvasProps) {
    const layout = useMemo(() => buildBreadboardLayout(graph), [graph]);

    // Filled holes lookup
    const filledHoles = useMemo(() => {
        const m = new Map<string, string>();
        for (const comp of layout.components)
            for (const h of comp.pinHoles)
                m.set(`${h.row},${h.col}`, h.color);
        // merge engine holes
        for (const [k, v] of layout.usedHoles) m.set(k, v);
        return m;
    }, [layout]);

    // Which Arduino pins are used?
    const usedArdPins = useMemo(() => {
        const s = new Set<string>();
        for (const e of graph.edges) {
            if (e.from === 'MCU') s.add(e.fromPin.replace(/_(src|tgt)$/, ''));
            if (e.to === 'MCU') s.add(e.toPin.replace(/_(src|tgt)$/, ''));
        }
        return s;
    }, [graph]);

    const mcuNode = useMemo(() => graph.nodes.find(n => n.kind === 'MCU'), [graph]);
    const mcuKey = mcuNode?.componentKey || 'MCU_ARDUINO_UNO';
    const isESP32 = useMemo(() => mcuKey.toUpperCase().includes('ESP32'), [mcuKey]);
    const mcuW = isESP32 ? 220 : 274;
    const mcuH = isESP32 ? 260 : 202;
    const mcuY = BB_Y + (BB_H - mcuH) / 2;
    const canonicalMcuKey = isESP32 ? 'MCU_ESP32' : 'MCU_ARDUINO_UNO';
    const mcuPins = useMemo(() => COMPONENT_DEFS[canonicalMcuKey]?.pins || [], [canonicalMcuKey]);
    const mcuTag = useMemo(() => COMPONENT_DEFS[canonicalMcuKey]?.tag || 'wokwi-arduino-uno', [canonicalMcuKey]);

    const isPinUsed = useCallback((pinId: string) => {
        const cleanId = pinId.replace(/_(src|tgt)$/, '').toUpperCase();
        for (const u of usedArdPins) {
            const cu = u.toUpperCase();
            if (cleanId === cu) return true;
            if (cleanId === `D${cu}`) return true;
            if (cleanId === cu.replace(/^D/, '')) return true;
            if (cleanId === cu.replace(/^GPIO/, '')) return true;
            if (cleanId.replace(/^GPIO/, '') === cu) return true;
            if (cleanId.startsWith('GND') && cu.startsWith('GND')) return true;
        }
        return false;
    }, [usedArdPins]);

    // Board edge coordinates
    const boardLeft  = BB_X - 2;
    const boardRight = BB_X + BB_INNER_W + 2;
    const boardTop   = BB_Y;
    const boardBot   = BB_Y + BB_H;
    const gapY1 = (colX('E') + colX('F')) / 2;   // x of centre gap

    return (
        <div className="w-full overflow-auto" style={{ scrollbarWidth: 'thin' }}>
            <svg
                width={CANVAS_W} height={CANVAS_H}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                style={{ display: 'block', fontFamily: '"JetBrains Mono","Fira Mono",monospace' }}
                aria-label="Breadboard circuit diagram – Cirkit Designer style"
            >
                {/* ═══════════════════════════════════════════════════════════
                    LAYER 0 — Dark canvas background with subtle grid
                ═══════════════════════════════════════════════════════════ */}
                <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={CANVAS_BG} />
                {/* Subtle dot grid */}
                <defs>
                    <pattern id="bb-grid" x={0} y={0} width={20} height={20} patternUnits="userSpaceOnUse">
                        <circle cx={10} cy={10} r={0.6} fill={GRID_DOT} />
                    </pattern>
                </defs>
                <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#bb-grid)" />

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 1 — Breadboard body
                ═══════════════════════════════════════════════════════════ */}
                <rect
                    x={boardLeft} y={boardTop}
                    width={boardRight - boardLeft} height={boardBot - boardTop}
                    rx={8} fill={BOARD_BG} stroke={BOARD_BORDER} strokeWidth={1.5}
                />

                {/* ── Power rail stripes (vertical) ──────────────────────── */}
                {/* Left + rail */}
                <line x1={COL.RAIL_LP} y1={boardTop + 6} x2={COL.RAIL_LP} y2={boardBot - 6}
                    stroke={RAIL_PLUS_C} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
                <line x1={COL.RAIL_LP} y1={boardTop + 6} x2={COL.RAIL_LP} y2={boardBot - 6}
                    stroke={RAIL_PLUS_C} strokeWidth={1} opacity={0.6} strokeLinecap="round" />
                {/* Left − rail */}
                <line x1={COL.RAIL_LM} y1={boardTop + 6} x2={COL.RAIL_LM} y2={boardBot - 6}
                    stroke={RAIL_MINUS_C} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
                <line x1={COL.RAIL_LM} y1={boardTop + 6} x2={COL.RAIL_LM} y2={boardBot - 6}
                    stroke={RAIL_MINUS_C} strokeWidth={1} opacity={0.6} strokeLinecap="round" />
                {/* Right + rail */}
                <line x1={COL.RAIL_RP} y1={boardTop + 6} x2={COL.RAIL_RP} y2={boardBot - 6}
                    stroke={RAIL_PLUS_C} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
                <line x1={COL.RAIL_RP} y1={boardTop + 6} x2={COL.RAIL_RP} y2={boardBot - 6}
                    stroke={RAIL_PLUS_C} strokeWidth={1} opacity={0.6} strokeLinecap="round" />
                {/* Right − rail */}
                <line x1={COL.RAIL_RM} y1={boardTop + 6} x2={COL.RAIL_RM} y2={boardBot - 6}
                    stroke={RAIL_MINUS_C} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
                <line x1={COL.RAIL_RM} y1={boardTop + 6} x2={COL.RAIL_RM} y2={boardBot - 6}
                    stroke={RAIL_MINUS_C} strokeWidth={1} opacity={0.6} strokeLinecap="round" />

                {/* Rail labels */}
                <text x={COL.RAIL_LP} y={boardTop - 3} textAnchor="middle" fontSize={8} fill={RAIL_PLUS_C} fontWeight={800}>+</text>
                <text x={COL.RAIL_LM} y={boardTop - 3} textAnchor="middle" fontSize={8} fill={RAIL_MINUS_C} fontWeight={800}>−</text>
                <text x={COL.RAIL_RP} y={boardTop - 3} textAnchor="middle" fontSize={8} fill={RAIL_PLUS_C} fontWeight={800}>+</text>
                <text x={COL.RAIL_RM} y={boardTop - 3} textAnchor="middle" fontSize={8} fill={RAIL_MINUS_C} fontWeight={800}>−</text>

                {/* ── Centre gap divider ─────────────────────────────────── */}
                <line
                    x1={gapY1} y1={boardTop + 8} x2={gapY1} y2={boardBot - 8}
                    stroke={GAP_LINE} strokeWidth={2.5} opacity={0.5}
                />

                {/* ── Column labels (top + bottom) ──────────────────────── */}
                {[...leftCols, ...rightCols].map(c => (
                    <React.Fragment key={`cl-${c}`}>
                        <text x={colX(c)} y={boardTop + 10}
                            textAnchor="middle" fontSize={7} fill="#7a6a50" fontWeight={700}>{c}</text>
                        <text x={colX(c)} y={boardBot - 4}
                            textAnchor="middle" fontSize={7} fill="#7a6a50" fontWeight={700}>{c}</text>
                    </React.Fragment>
                ))}

                {/* ── Row numbers (left and right of grid) ──────────────── */}
                {allRows.map(r => (r === 1 || r % 5 === 0 || r === BB_ROWS) && (
                    <React.Fragment key={`rn-${r}`}>
                        <text x={COL.A - 8} y={rowY(r) + 0.5}
                            textAnchor="end" dominantBaseline="middle"
                            fontSize={6.5} fill="#8a7a5a" fontWeight={600}>{r}</text>
                        <text x={COL.J + 8} y={rowY(r) + 0.5}
                            textAnchor="start" dominantBaseline="middle"
                            fontSize={6.5} fill="#8a7a5a" fontWeight={600}>{r}</text>
                    </React.Fragment>
                ))}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 2 — Hole grid
                ═══════════════════════════════════════════════════════════ */}
                {/* Left rail holes */}
                {allRows.map(r => {
                    const fy = rowY(r);
                    const fcP = filledHoles.get(`${r},RAIL_LP`);
                    const fcM = filledHoles.get(`${r},RAIL_LM`);
                    return (
                        <React.Fragment key={`lrh-${r}`}>
                            <circle cx={COL.RAIL_LP} cy={fy} r={HOLE_R}
                                fill={fcP ?? HOLE_EMPTY} stroke={fcP ? HOLE_FILL_ST : 'none'}
                                strokeWidth={0.6} opacity={fcP ? 1 : 0.5} />
                            <circle cx={COL.RAIL_LM} cy={fy} r={HOLE_R}
                                fill={fcM ?? HOLE_EMPTY} stroke={fcM ? HOLE_FILL_ST : 'none'}
                                strokeWidth={0.6} opacity={fcM ? 1 : 0.5} />
                        </React.Fragment>
                    );
                })}
                {/* Right rail holes */}
                {allRows.map(r => {
                    const fy = rowY(r);
                    const fcP = filledHoles.get(`${r},RAIL_RP`);
                    const fcM = filledHoles.get(`${r},RAIL_RM`);
                    return (
                        <React.Fragment key={`rrh-${r}`}>
                            <circle cx={COL.RAIL_RP} cy={fy} r={HOLE_R}
                                fill={fcP ?? HOLE_EMPTY} stroke={fcP ? HOLE_FILL_ST : 'none'}
                                strokeWidth={0.6} opacity={fcP ? 1 : 0.5} />
                            <circle cx={COL.RAIL_RM} cy={fy} r={HOLE_R}
                                fill={fcM ?? HOLE_EMPTY} stroke={fcM ? HOLE_FILL_ST : 'none'}
                                strokeWidth={0.6} opacity={fcM ? 1 : 0.5} />
                        </React.Fragment>
                    );
                })}

                {/* Main grid (A-E, F-J) */}
                {allRows.flatMap(r => [...leftCols, ...rightCols].map(c => {
                    const fc = filledHoles.get(`${r},${c}`);
                    return (
                        <circle key={`h-${r}-${c}`}
                            cx={colX(c)} cy={rowY(r)} r={HOLE_R}
                            fill={fc ?? HOLE_EMPTY}
                            stroke={fc ? HOLE_FILL_ST : 'none'}
                            strokeWidth={fc ? 0.8 : 0}
                            opacity={fc ? 1 : 0.55}
                        />
                    );
                }))}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 3 — Wires (behind MCU + components)
                ═══════════════════════════════════════════════════════════ */}
                {layout.wires.map(wire => (
                    <polyline
                        key={wire.id}
                        points={wire.points.map(([x, y]) => `${x},${y}`).join(' ')}
                        stroke={wire.color}
                        strokeWidth={wire.width}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.88}
                    />
                ))}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 4 — MCU Wokwi Element (left side)
                ═══════════════════════════════════════════════════════════ */}
                {/* Drop shadow */}
                <rect x={ARD_X + 3} y={mcuY + 3}
                    width={mcuW} height={mcuH}
                    rx={6} fill="rgba(0,0,0,0.25)" />
                {/* MCU Wokwi Element */}
                <foreignObject
                    x={ARD_X} y={mcuY}
                    width={mcuW} height={mcuH}
                    style={{ overflow: 'visible' }}
                >
                    {React.createElement(mcuTag as any, {
                        style: {
                            width: `${mcuW}px`,
                            height: `${mcuH}px`,
                            display: 'block',
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                        },
                    })}
                </foreignObject>

                {/* MCU Pin connection dots overlay */}
                {mcuPins.map(pin => {
                    const px = ARD_X + pin.xPct * mcuW;
                    const py = mcuY + pin.yPct * mcuH;
                    const isUsed = isPinUsed(pin.id);

                    return (
                        <g key={`ap-${pin.id}`}>
                            <circle cx={px} cy={py} r={isUsed ? 3.5 : 2.5}
                                fill={isUsed ? pin.color : '#475569'}
                                stroke={isUsed ? '#fff' : 'none'}
                                strokeWidth={isUsed ? 0.8 : 0}
                                opacity={isUsed ? 1 : 0.5} />
                        </g>
                    );
                })}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 5 — Component images (right side)
                ═══════════════════════════════════════════════════════════ */}
                {layout.components.map(comp => (
                    <CompVisual key={`cv-${comp.nodeId}`} comp={comp} />
                ))}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 6 — Filled hole highlights (glow rings)
                ═══════════════════════════════════════════════════════════ */}
                {layout.components.flatMap(comp =>
                    comp.pinHoles.map(h => (
                        <circle key={`glow-${comp.nodeId}-${h.pinId}`}
                            cx={h.x} cy={h.y} r={HOLE_R + 2.5}
                            fill="none" stroke={h.color}
                            strokeWidth={1.2} opacity={0.5} />
                    ))
                )}

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 7 — Legend
                ═══════════════════════════════════════════════════════════ */}
                <g transform={`translate(${ARD_X}, ${CANVAS_H - 18})`}>
                    {([
                        { color: '#ef4444', label: '5V / VCC' },
                        { color: '#374151', label: 'GND' },
                        { color: '#eab308', label: 'Signal' },
                        { color: '#3b82f6', label: 'I²C SDA' },
                        { color: '#06b6d4', label: 'I²C SCL' },
                        { color: '#a855f7', label: 'PWM' },
                    ] as const).map((item, i) => (
                        <g key={item.label} transform={`translate(${i * 95}, 0)`}>
                            <line x1={0} y1={-4} x2={18} y2={-4}
                                stroke={item.color} strokeWidth={2.5} strokeLinecap="round" />
                            <text x={22} y={-1} fontSize={7.5} fill="#94a3b8"
                                fontWeight={600}>{item.label}</text>
                        </g>
                    ))}
                </g>

                {/* ── "Conceptual layout" note ─────────────────────────── */}
                <text x={CANVAS_W - 8} y={CANVAS_H - 5}
                    textAnchor="end" fontSize={6.5} fill="#475569" fontStyle="italic">
                    Breadboard View — conceptual layout
                </text>
            </svg>
        </div>
    );
}

/**
 * ============================================================
 * breadboardLayoutEngine.ts — Cirkit Designer–style Layout
 * ============================================================
 * Canvas layout (left → right):
 *   [Arduino]  [Breadboard 63×10]  [Components]
 *
 * Breadboard: vertical, 63 rows × 10 columns (A-E left, F-J right)
 *   • Power rails on left + right edges
 *   • Centre divider gap between columns E and F
 *   • Row numbers printed on both sides
 *
 * Wires: orthogonal (horizontal + vertical segments only)
 *   red = VCC/5V, dark = GND, yellow = signal,
 *   blue = SDA, cyan = SCL, purple = PWM
 * ============================================================
 */

import type { CircuitGraph, CircuitEdge } from './wiringRulesEngine';
import { resolveDef, COMPONENT_DEFS } from './componentDefs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 1  GEOMETRY CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const BB_ROWS      = 63;
export const ROW_PITCH    = 11;        // px between row centres
export const HOLE_R       = 2.8;       // hole circle radius
export const COL_PITCH    = 13;        // px between column centres

// Board chrome
const BOARD_PAD_TOP  = 28;             // space above row 1 for col labels
const BOARD_PAD_BOT  = 22;

// Breadboard body position (absolute px)
export const BB_X     = 380;           // left edge of board body
export const BB_Y     = 12;
export const BB_W     = 230;
const GRID_TOP        = BB_Y + BOARD_PAD_TOP;

export function rowY(row: number): number {
    return GRID_TOP + (row - 1) * ROW_PITCH;
}

// Column x-offsets relative to BB_X
const _x = BB_X;
export const COL: Record<string, number> = {
    RAIL_LP:  _x + 8,     // left rail  +
    RAIL_LM:  _x + 19,    // left rail  −
    A: _x + 36,  B: _x + 49,  C: _x + 62,  D: _x + 75,  E: _x + 88,
    // centre gap ≈ 14 px
    F: _x + 102, G: _x + 115, H: _x + 128, I: _x + 141, J: _x + 154,
    RAIL_RP:  _x + 172,   // right rail +
    RAIL_RM:  _x + 183,   // right rail −
};
export const BB_INNER_W = 195;         // from left rail to right rail

export const LEFT_COLS  = ['A','B','C','D','E'] as const;
export const RIGHT_COLS = ['F','G','H','I','J'] as const;

export function colX(col: string): number { return COL[col] ?? _x; }

// Board-bottom for rendering
export const BB_H = BOARD_PAD_TOP + (BB_ROWS - 1) * ROW_PITCH + BOARD_PAD_BOT;

// ── Arduino card ──────────────────────────────────────────────────────────────
export const ARD_X = 20;
export const ARD_W = 274;
export const ARD_H = 202;
// Vertically centre with breadboard
export const ARD_Y = BB_Y + (BB_H - ARD_H) / 2;
export const ARD_PIN_X = ARD_X + ARD_W;   // right edge = pin strip

// ── Component area ────────────────────────────────────────────────────────────
export const COMP_X = BB_X + BB_INNER_W + 60;    // left edge of component imgs

// ── Canvas total ──────────────────────────────────────────────────────────────
export const CANVAS_W = COMP_X + 260;
export const CANVAS_H = BB_Y + BB_H + 10;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 2  ARDUINO PIN LAYOUT (right edge, top-to-bottom)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ArdPinDef { name: string; yOff: number; color: string }

const PC = {
    SIG: '#eab308', PWM: '#a855f7', VCC: '#ef4444',
    GND: '#475569', I2C: '#3b82f6', ANA: '#f97316',
};

export const ARD_PINS: ArdPinDef[] = [
    // Digital
    { name:'D13', yOff:18,  color:PC.SIG },
    { name:'D12', yOff:30,  color:PC.SIG },
    { name:'D11', yOff:42,  color:PC.PWM },
    { name:'D10', yOff:54,  color:PC.PWM },
    { name:'D9',  yOff:66,  color:PC.PWM },
    { name:'D8',  yOff:78,  color:PC.SIG },
    { name:'D7',  yOff:96,  color:PC.SIG },
    { name:'D6',  yOff:108, color:PC.PWM },
    { name:'D5',  yOff:120, color:PC.PWM },
    { name:'D4',  yOff:132, color:PC.SIG },
    { name:'D3',  yOff:144, color:PC.PWM },
    { name:'D2',  yOff:156, color:PC.SIG },
    { name:'D1',  yOff:168, color:PC.SIG },
    { name:'D0',  yOff:180, color:PC.SIG },
    // Misc
    { name:'GND.3', yOff:198, color:PC.GND },
    { name:'AREF',  yOff:210, color:PC.SIG },
    { name:'SDA',   yOff:222, color:PC.I2C },
    { name:'SCL',   yOff:234, color:PC.I2C },
    // Power
    { name:'5V',    yOff:256, color:PC.VCC },
    { name:'3.3V',  yOff:268, color:PC.VCC },
    { name:'GND',   yOff:280, color:PC.GND },
    { name:'GND.1', yOff:292, color:PC.GND },
    { name:'GND.2', yOff:304, color:PC.GND },
    { name:'VIN',   yOff:316, color:PC.VCC },
    // Analog
    { name:'A0', yOff:336, color:PC.ANA },
    { name:'A1', yOff:348, color:PC.ANA },
    { name:'A2', yOff:360, color:PC.ANA },
    { name:'A3', yOff:372, color:PC.ANA },
    { name:'A4', yOff:384, color:PC.I2C },
    { name:'A5', yOff:396, color:PC.I2C },
];

export interface McuPinPos {
    x: number;
    y: number;
    xPct: number;
    yPct: number;
}

export function getMcuPinPos(
    mcuKey: string,
    pinName: string,
    mcuW: number,
    mcuH: number,
    mcuY: number
): McuPinPos | null {
    const isESP32 = mcuKey.toUpperCase().includes('ESP32');
    const canonicalMcuKey = isESP32 ? 'MCU_ESP32' : 'MCU_ARDUINO_UNO';
    const def = COMPONENT_DEFS[canonicalMcuKey];
    if (!def) return null;

    const pin = def.pins.find(p => {
        const pn = p.id.toUpperCase();
        const n = pinName.toUpperCase();
        return pn === n || pn === `D${n}` || pn === n.replace(/^GPIO/, 'D') || pn === n.replace(/^GPIO/, '');
    });

    if (!pin) {
        if (pinName.toUpperCase().startsWith('GND')) {
            const gndPin = def.pins.find(p => p.id.toUpperCase().startsWith('GND'));
            if (gndPin) {
                return {
                    x: ARD_X + gndPin.xPct * mcuW,
                    y: mcuY + gndPin.yPct * mcuH,
                    xPct: gndPin.xPct,
                    yPct: gndPin.yPct
                };
            }
        }
        return null;
    }

    return {
        x: ARD_X + pin.xPct * mcuW,
        y: mcuY + pin.yPct * mcuH,
        xPct: pin.xPct,
        yPct: pin.yPct
    };
}

export function routeMCUWire(
    ax: number, ay: number,
    bx: number, by: number,
    xPct: number, yPct: number,
    channelX: number,
    isESP32: boolean
): [number, number][] {
    if (isESP32) {
        const isLeft = xPct < 0.5;
        const offset = isLeft ? -12 : 12;
        const px1 = ax + offset;
        const py1 = ay;
        const px2 = px1;
        const py2 = by;
        return [
            [ax, ay],
            [px1, py1],
            [px2, py2],
            [bx, by]
        ];
    } else {
        const isTop = yPct < 0.5;
        const offset = isTop ? -15 : 15;
        const px1 = ax;
        const py1 = ay + offset;
        const px2 = channelX;
        const py2 = py1;
        const px3 = channelX;
        const py3 = by;
        return [
            [ax, ay],
            [px1, py1],
            [px2, py2],
            [px3, py3],
            [bx, by]
        ];
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 3  WIRE COLOUR LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function wireColor(wireType: string, pinName?: string): string {
    if (wireType === 'POWER')  return '#ef4444';
    if (wireType === 'GROUND') return '#374151';
    if (wireType === 'PWM')    return '#a855f7';
    if (wireType === 'DATA' || wireType === 'I2C') {
        const p = (pinName ?? '').toUpperCase();
        if (p.includes('SCL') || p.includes('CLK')) return '#06b6d4';
        return '#3b82f6';
    }
    return '#eab308';   // default signal yellow
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 4  OUTPUT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BBPinHole {
    pinId: string; label: string;
    row: number; col: string;
    x: number; y: number; color: string;
}

export interface BBComponent {
    nodeId: string; componentKey: string;
    label: string; kind: string;
    imgX: number; imgY: number;
    imgW: number; imgH: number;
    baseRow: number;
    pinHoles: BBPinHole[];
}

export interface BBWire {
    id: string; color: string;
    width: number;
    points: [number, number][];
}

export interface BreadboardLayout {
    components: BBComponent[];
    wires:      BBWire[];
    usedHoles:  Map<string, string>;   // "row,col" → colour
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 5  MAIN LAYOUT BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const strip = (s: string) => s.replace(/_(src|tgt)$/, '');

/** Which column to use for pin index (spreads across G-J) */
function pinCol(idx: number, total: number): string {
    if (total <= 2) return ['H', 'I'][idx] ?? 'H';
    if (total <= 4) return ['G', 'H', 'I', 'J'][idx] ?? 'J';
    return RIGHT_COLS[Math.min(idx, 4)] ?? 'J';
}

/** Pin sort priority: VCC first, GND last */
function pinPri(p: string): number {
    const u = p.toUpperCase();
    if (/^(VCC|VIN|V\+|5V|3V3|3\.3V|COIL1)/.test(u)) return 0;
    if (/^(GND|NEG|COIL2)/.test(u) || u === 'C')       return 9;
    return 5;
}

export function buildBreadboardLayout(graph: CircuitGraph): BreadboardLayout {
    const components: BBComponent[] = [];
    const wires:      BBWire[]      = [];
    const usedHoles = new Map<string, string>();

    const mcuNode = graph.nodes.find(n => n.kind === 'MCU');
    const mcuKey = mcuNode?.componentKey || 'MCU_ARDUINO_UNO';
    const isESP32 = mcuKey.toUpperCase().includes('ESP32');
    const mcuW = isESP32 ? 220 : 274;
    const mcuH = isESP32 ? 260 : 202;
    const mcuY = BB_Y + (BB_H - mcuH) / 2;

    const getPinPos = (pinName: string) => {
        return getMcuPinPos(mcuKey, pinName, mcuW, mcuH, mcuY);
    };

    // ── 1. Filter component nodes ────────────────────────────────────────────
    const compNodes = graph.nodes.filter(n => n.kind !== 'MCU' && n.kind !== 'POWER_RAIL');
    if (compNodes.length === 0) return { components, wires, usedHoles };

    // ── 2. Assign breadboard rows (rows 5–59, leave margins) ─────────────────
    const ROW_START = 5, ROW_END = 59;
    const gap = Math.max(1, Math.floor((ROW_END - ROW_START) / compNodes.length));

    const pinPosMap = new Map<string, { x: number; y: number; row: number }>();

    compNodes.forEach((cn, ci) => {
        const { def } = resolveDef(cn.componentKey, cn.kind);
        const pins = [...def.pins].sort((a, b) => pinPri(a.id) - pinPri(b.id));
        const baseRow = ROW_START + ci * gap;

        // Image sizing
        const MAX_W = 110, MAX_H = 85;
        const s = Math.min(1, MAX_W / def.renderW, MAX_H / def.renderH);
        const imgW = def.renderW * s;
        const imgH = def.renderH * s;

        const centreRow = baseRow + Math.floor((pins.length - 1) / 2);
        const imgY = rowY(centreRow) - imgH / 2;

        const pinHoles: BBPinHole[] = pins.map((pin, i) => {
            const row = baseRow + i;
            const col = pinCol(i, pins.length);
            const x = colX(col);
            const y = rowY(row);
            usedHoles.set(`${row},${col}`, pin.color);
            pinPosMap.set(`${cn.id}.${pin.id}`, { x, y, row });
            return { pinId: pin.id, label: pin.id, row, col, x, y, color: pin.color };
        });

        components.push({
            nodeId: cn.id, componentKey: cn.componentKey,
            label: cn.label, kind: cn.kind,
            imgX: COMP_X, imgY, imgW, imgH,
            baseRow, pinHoles,
        });
    });

    // ── 3. Build component-lead wires (image → breadboard holes) ─────────────
    for (const comp of components) {
        for (const hole of comp.pinHoles) {
            wires.push({
                id: `lead-${comp.nodeId}-${hole.pinId}`,
                color: hole.color, width: 1.8,
                points: [[comp.imgX - 2, hole.y], [hole.x, hole.y]],
            });
        }
    }

    // ── 4. Collect MCU-signal edges for channel routing ──────────────────────
    interface SigWire { edge: CircuitEdge; ardPos: {x:number;y:number}; targetRow: number; col: string; color: string }
    const sigWires: SigWire[] = [];
    let drewVcc = false, drewGnd = false;

    for (const e of graph.edges) {
        const fp = strip(e.fromPin), tp = strip(e.toPin);
        const color = wireColor(e.wireType, fp);
        const fromMCU = e.from === 'MCU', toMCU = e.to === 'MCU';

        // ── Power: VCC_RAIL/GND_RAIL → component ────────────────────────────
        if (e.from === 'VCC_RAIL' || e.from === 'GND_RAIL') {
            const pos = pinPosMap.get(`${e.to}.${tp}`);
            if (pos) {
                const rail = e.from === 'VCC_RAIL' ? 'RAIL_RP' : 'RAIL_RM';
                const rc   = e.from === 'VCC_RAIL' ? '#ef4444' : '#374151';
                usedHoles.set(`${pos.row},${rail}`, rc);
                wires.push({ id: `rail-${e.id}`, color: rc, width: 2,
                    points: [[colX(rail), pos.y], [pos.x, pos.y]] });
            }
            continue;
        }

        // ── MCU → power rails ───────────────────────────────────────────────
        if (fromMCU && (e.to === 'VCC_RAIL' || e.to === 'GND_RAIL')) {
            const isVcc = e.to === 'VCC_RAIL';
            if (isVcc && drewVcc) continue;
            if (!isVcc && drewGnd) continue;
            const ardPin = getPinPos(isVcc ? '5V' : 'GND');
            if (ardPin) {
                const railCol = isVcc ? 'RAIL_LP' : 'RAIL_LM';
                const rc      = isVcc ? '#ef4444' : '#374151';
                const points = routeMCUWire(
                    ardPin.x, ardPin.y,
                    colX(railCol), ardPin.y,
                    ardPin.xPct, ardPin.yPct,
                    isESP32 ? ARD_X + mcuW + 15 : ARD_X + mcuW + 20,
                    isESP32
                );
                wires.push({ id: `mcu-rail-${e.id}`, color: rc, width: 2.2, points });
                // Bus wire connecting left rail → right rail at top
                const busRow = isVcc ? 2 : 3;
                const ry = rowY(busRow);
                wires.push({ id: `bus-${isVcc?'vcc':'gnd'}`, color: rc, width: 2,
                    points: [
                        [colX(railCol), ardPin.y], [colX(railCol), ry],
                        [colX(isVcc ? 'RAIL_RP' : 'RAIL_RM'), ry],
                    ] });
            }
            if (isVcc) drewVcc = true; else drewGnd = true;
            continue;
        }

        // ── MCU → component signal wire ─────────────────────────────────────
        if (fromMCU || toMCU) {
            const mcuPin  = fromMCU ? fp : tp;
            const compId  = fromMCU ? e.to : e.from;
            const compPin = fromMCU ? tp : fp;

            if (compId === 'VCC_RAIL' || compId === 'GND_RAIL') continue;

            const ardPos = getPinPos(mcuPin);
            const cPos   = pinPosMap.get(`${compId}.${compPin}`);
            if (ardPos && cPos) {
                // Pick a left-half column on the same row (mirror of component col)
                const leftCol = 'C';
                usedHoles.set(`${cPos.row},${leftCol}`, color);
                sigWires.push({ edge: e, ardPos: { x: ardPos.x, y: ardPos.y }, targetRow: cPos.row, col: leftCol, color });
            }
            continue;
        }

        // ── Component → component (helper wires) ────────────────────────────
        const fromP = pinPosMap.get(`${e.from}.${fp}`);
        const toP   = pinPosMap.get(`${e.to}.${tp}`);
        if (fromP && toP) {
            wires.push({ id: `cc-${e.id}`, color, width: 1.8,
                points: [[fromP.x, fromP.y], [toP.x, fromP.y], [toP.x, toP.y]] });
        }
    }

    // ── 5. Route signal wires with channels (avoids overlap) ─────────────────
    sigWires.sort((a, b) => a.targetRow - b.targetRow);
    const chStart = (ARD_X + mcuW) + 12;
    const chEnd   = BB_X - 4;
    const chStep  = Math.min(8, (chEnd - chStart) / (sigWires.length + 1));

    sigWires.forEach((sw, i) => {
        const chX = chStart + (i + 1) * chStep;
        const ty  = rowY(sw.targetRow);
        const hx  = colX(sw.col);

        const edge = sw.edge;
        const fp = strip(edge.fromPin);
        const tp = strip(edge.toPin);
        const mcuPinName = edge.from === 'MCU' ? fp : tp;
        const mcuPin = getPinPos(mcuPinName);

        let points: [number, number][];
        if (mcuPin) {
            points = routeMCUWire(
                mcuPin.x, mcuPin.y,
                hx, ty,
                mcuPin.xPct, mcuPin.yPct,
                chX,
                isESP32
            );
        } else {
            points = [
                [sw.ardPos.x, sw.ardPos.y],
                [chX, sw.ardPos.y],
                [chX, ty],
                [hx, ty],
            ];
        }

        wires.push({
            id: `sig-${sw.edge.id}`, color: sw.color, width: 2,
            points,
        });
    });

    return { components, wires, usedHoles };
}

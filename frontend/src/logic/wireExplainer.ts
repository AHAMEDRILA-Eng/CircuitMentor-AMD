/**
 * wireExplainer.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Converts raw circuit graph edges (from wiringRulesEngine) into friendly,
 * student-readable explanation objects used by Explain Mode.
 *
 * Each explanation includes:
 *   - what the wire does (in plain language)
 *   - why this connection is needed
 *   - a colour hint for the physical wire the student should use
 *   - which code lines this connection relates to (keyword hints)
 */

export interface WireExplanation {
    edgeId: string;
    fromLabel: string;
    toLabel: string;
    fromPin: string;
    toPin: string;
    wireType: 'POWER' | 'GROUND' | 'SIGNAL' | 'DATA' | 'PWM';
    /** Short title shown in the speech bubble header */
    title: string;
    /** Full student-friendly explanation sentence */
    why: string;
    /** Physical wire colour to use */
    wireColour: string;
    wireColourHex: string;
    /** Code keywords related to this connection (for line highlighting) */
    codeKeywords: string[];
}

// ── Friendly pin name normalisation ─────────────────────────────────────────

function cleanPin(raw: string): string {
    return raw
        .replace(/_(src|tgt)$/, '')
        .replace(/slot_\w+/, 'port')
        .replace('GND_RAIL', 'GND')
        .replace('VCC_RAIL', '5V');
}

// ── Wire-type → physical colour ─────────────────────────────────────────────

const WIRE_COLOUR: Record<string, { name: string; hex: string }> = {
    POWER:  { name: 'Red',    hex: '#ef4444' },
    GROUND: { name: 'Black',  hex: '#64748b' },
    SIGNAL: { name: 'Yellow', hex: '#facc15' },
    DATA:   { name: 'Blue',   hex: '#60a5fa' },
    PWM:    { name: 'Green',  hex: '#34d399' },
};

// ── Code keyword extractor ───────────────────────────────────────────────────

function codeKeywordsFor(fromLabel: string, toLabel: string, fromPin: string, toPin: string): string[] {
    const tokens = [fromLabel, toLabel, fromPin, toPin].join(' ').toLowerCase();
    const keywords: string[] = [];

    if (tokens.includes('dht'))       keywords.push('dht');
    if (tokens.includes('pir'))       keywords.push('pir', 'digitalread');
    if (tokens.includes('hc-sr04') || tokens.includes('ultrasonic'))
                                      keywords.push('pulse', 'echo', 'trig');
    if (tokens.includes('relay'))     keywords.push('relay', 'digitalwrite');
    if (tokens.includes('servo'))     keywords.push('servo', 'write');
    if (tokens.includes('lcd'))       keywords.push('lcd', 'liquidcrystal', 'i2c');
    if (tokens.includes('buzzer'))    keywords.push('buzzer', 'tone', 'digitalwrite');
    if (tokens.includes('led'))       keywords.push('led', 'digitalwrite');
    if (tokens.includes('motor'))     keywords.push('motor', 'analogwrite', 'pwm');
    if (tokens.includes('ldr'))       keywords.push('ldr', 'analogread');
    if (tokens.includes('soil'))      keywords.push('soil', 'analogread');
    if (tokens.includes('lm35'))      keywords.push('lm35', 'analogread', 'temperature');
    if (tokens.includes('mq') || tokens.includes('gas'))
                                      keywords.push('mq', 'gas', 'analogread');
    if (tokens.includes('5v') || tokens.includes('vcc') || tokens.includes('power'))
                                      keywords.push('setup', 'pinmode');
    if (tokens.includes('gnd') || tokens.includes('ground'))
                                      keywords.push('gnd', 'ground');

    // Always include pin numbers from pins
    const pinNums = [fromPin, toPin].join(' ').match(/\d+/g) ?? [];
    pinNums.forEach(n => keywords.push(`D${n}`, `GPIO${n}`, n));

    return [...new Set(keywords)];
}

// ── Why-sentence generator ───────────────────────────────────────────────────

function buildWhySentence(
    wireType: string,
    fromLabel: string,
    toLabel: string,
    fromPin: string,
    toPin: string,
): { title: string; why: string } {
    const fp = cleanPin(fromPin);
    const tp = cleanPin(toPin);

    if (wireType === 'POWER') {
        if (toLabel.toLowerCase().includes('rail') || tp === '5V') {
            return {
                title: '⚡ Power Supply',
                why: `This RED wire carries 5V from the ${fromLabel} to power the circuit. Without this, nothing turns on!`,
            };
        }
        return {
            title: '⚡ Power to Component',
            why: `RED wire: ${fromLabel} (${fp}) → ${toLabel} (${tp}). This gives the ${toLabel} the voltage it needs to operate. Always connect VCC first!`,
        };
    }

    if (wireType === 'GROUND') {
        return {
            title: '⏚ Ground (Return Path)',
            why: `BLACK wire: ${fromLabel} → ${toLabel}. Ground completes the circuit. Electricity needs a full loop — GND is the return path. Without this, nothing works even if power is connected!`,
        };
    }

    if (wireType === 'DATA') {
        return {
            title: '📡 I²C Data Bus',
            why: `BLUE wire: ${fromLabel} (${fp}) → ${toLabel} (${tp}). This is an I²C data line. The microcontroller sends and receives data packets through this wire. Both SDA and SCL are needed for I²C to work.`,
        };
    }

    if (wireType === 'PWM') {
        return {
            title: '〜 PWM Control Signal',
            why: `GREEN wire: ${fromLabel} pin ${fp} → ${toLabel} pin ${tp}. PWM (Pulse Width Modulation) rapidly switches the signal ON/OFF to control speed or brightness. The duty cycle determines the output level.`,
        };
    }

    // SIGNAL
    if (fromLabel.toLowerCase().includes('arduino') || fromLabel.toLowerCase().includes('esp')) {
        return {
            title: '📤 Control Signal (Output)',
            why: `YELLOW wire: ${fromLabel} pin ${fp} → ${toLabel} pin ${tp}. The microcontroller SENDS a HIGH or LOW signal here to turn the ${toLabel} ON or OFF using \`digitalWrite(${fp}, HIGH)\` in code.`,
        };
    }

    return {
        title: '📥 Sensor Signal (Input)',
        why: `YELLOW wire: ${fromLabel} pin ${fp} → ${toLabel} pin ${tp}. The ${fromLabel} sends its sensor reading to the microcontroller here. The code reads this with \`digitalRead(${tp})\` or \`analogRead(${tp})\`.`,
    };
}

// ── Main Export ──────────────────────────────────────────────────────────────

export interface GraphEdge {
    id: string;
    from: string;
    to: string;
    fromPin: string;
    toPin: string;
    wireType: 'POWER' | 'GROUND' | 'SIGNAL' | 'DATA' | 'PWM';
}

export interface GraphNode {
    id: string;
    label: string;
}

/**
 * Takes the raw graph from buildCircuitGraph() and returns a list of
 * WireExplanation objects — one per edge — sorted so POWER and GROUND
 * wires come first (easier to understand when building).
 */
export function generateWireExplanations(
    edges: GraphEdge[],
    nodes: GraphNode[],
): WireExplanation[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n.label]));

    const explanations: WireExplanation[] = edges.map(edge => {
        const fromLabel = nodeMap.get(edge.from) ?? edge.from;
        const toLabel   = nodeMap.get(edge.to)   ?? edge.to;
        const fp = cleanPin(edge.fromPin);
        const tp = cleanPin(edge.toPin);
        const colour = WIRE_COLOUR[edge.wireType] ?? { name: 'Yellow', hex: '#facc15' };
        const { title, why } = buildWhySentence(edge.wireType, fromLabel, toLabel, edge.fromPin, edge.toPin);

        return {
            edgeId:        edge.id,
            fromLabel,
            toLabel,
            fromPin:       fp,
            toPin:         tp,
            wireType:      edge.wireType,
            title,
            why,
            wireColour:    colour.name,
            wireColourHex: colour.hex,
            codeKeywords:  codeKeywordsFor(fromLabel, toLabel, edge.fromPin, edge.toPin),
        };
    });

    // Sort: POWER → GROUND → DATA → SIGNAL → PWM
    const ORDER = { POWER: 0, GROUND: 1, DATA: 2, SIGNAL: 3, PWM: 4 };
    return explanations.sort((a, b) => (ORDER[a.wireType] ?? 5) - (ORDER[b.wireType] ?? 5));
}

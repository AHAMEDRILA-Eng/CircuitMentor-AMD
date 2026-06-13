/**
 * ============================================================
 * wiringRulesEngine.ts — Deterministic Circuit Wiring Engine
 * ============================================================
 * Takes a concept {inputs, logic, outputs} and produces a
 * validated, electrically-correct graph (CircuitNode[], CircuitEdge[])
 * ready for ReactFlow rendering.
 *
 * Pipeline:
 *  1. resolve component types from concept arrays
 *  2. assign MCU pins (digital / analog / PWM / I2C)
 *  3. apply per-component wiring rules (VCC, GND, SIGNAL)
 *  4. auto-insert helper nodes (resistors, transistors, diodes)
 *  5. add power architecture (VCC rail + GND rail)
 *
 * No LLM. No random. 100% deterministic.r
 * ============================================================
 */

export interface CircuitNode {
    id: string;
    kind: 'MCU' | 'SENSOR' | 'ACTUATOR' | 'DISPLAY' | 'POWER_RAIL' | 'HELPER' | 'INPUT';
    label: string;
    componentKey: string;   // maps to COMPONENT_DEFS in CircuitCanvas
    x: number;
    y: number;
    meta?: Record<string, unknown>;
}

export interface CircuitEdge {
    id: string;
    from: string;           // node id
    fromPin: string;        // e.g. 'D9_src', '5V_src'
    to: string;
    toPin: string;          // e.g. 'A_tgt', 'GND_tgt'
    wireType: 'POWER' | 'GROUND' | 'SIGNAL' | 'DATA' | 'PWM';
}

export interface CircuitGraph {
    nodes: CircuitNode[];
    edges: CircuitEdge[];
    errors: string[];
    warnings: string[];
}

// ── Pin pools (Arduino Uno) ───────────────────────────────────────────────────
const UNO_DIGITAL_SENSOR_PINS = [2, 3, 4, 5, 6, 7];
const UNO_ANALOG_SENSOR_PINS = ['A0', 'A1', 'A2', 'A3'];
const UNO_DIGITAL_ACTUATOR_PINS = [8, 9, 10, 11, 12, 13];
const UNO_PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
const UNO_I2C_SDA = 'A4';
const UNO_I2C_SCL = 'A5';

// ── Pin pools (ESP32) ─────────────────────────────────────────────────────────
const ESP_DIGITAL_SENSOR_PINS = [14, 15, 16, 17, 18, 19];
const ESP_ANALOG_SENSOR_PINS = ['34', '35', '36', '39'];  // 32, 33 removed — they're in ESP_DIGITAL_ACTUATOR_PINS
const ESP_DIGITAL_ACTUATOR_PINS = [2, 12, 13, 25, 26, 27, 32, 33];
const ESP_PWM_PINS = new Set([2, 4, 5, 12, 13, 14, 15, 25, 26, 27, 32, 33]);
const ESP_I2C_SDA = '21';
const ESP_I2C_SCL = '22';

// ── Component wiring rule types ────────────────────────────────────────────────
type SignalType = 'DIGITAL' | 'ANALOG' | 'DATA' | 'I2C' | 'PWM' | 'NONE';

interface ComponentRule {
    kind: 'SENSOR' | 'ACTUATOR' | 'DISPLAY' | 'INPUT';
    signalType: SignalType;
    needsVCC: boolean;
    needsGND: boolean;
    vccPin: string;
    gndPin: string;
    sigPin: string;
    requiresHelper?: 'RESISTOR' | 'TRANSISTOR_NPN' | 'TRANSISTOR_DIODE';
    helperLabel?: string;
    /** For I2C — uses shared bus, doesn't consume a unique digital pin */
    isI2C?: boolean;
}

// ── Wiring rules per registry key ─────────────────────────────────────────────
const COMPONENT_WIRING_RULES: Record<string, ComponentRule> = {
    // === Sensors ===
    PIR: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
    },
    DHT11: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
    },
    DHT22: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
    },
    HC_SR04: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'TRIG',
        // ECHO uses a second pin — handled as special case
    },
    LDR: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
    },
    SOIL_MOISTURE: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
    },
    MQ2_GAS: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AOUT',
    },
    FLAME: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'DOUT',
    },
    SOUND: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'DOUT',
    },
    NTC_TEMP: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
    },
    // === Sensor aliases (normalizer strips underscores → these must match) ===
    SOILMOISTURE: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
    },
    RAIN: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AO',
    },
    IR: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'OUT',
    },
    // Heart rate sensor (MAX30102 placeholder — uses I2C SDA pin)
    HEARTBEAT: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
    },
    SENSOR_HEARTBEAT: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
    },
    MQ2: {
        kind: 'SENSOR', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'AOUT',
    },
    // HC alias — normalizer turns "Sensor_HC_SR04" → "HCSR04", but substring fallback
    // catches "HC" so this covers both paths
    HC: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'TRIG',
    },
    HCSR04: {
        kind: 'SENSOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'TRIG',
    },
    // === Inputs ===
    BUTTON: {
        kind: 'INPUT', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'GND', sigPin: '1l',
    },
    POTENTIOMETER: {
        kind: 'INPUT', signalType: 'ANALOG', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SIG',
    },
    // === Actuators ===
    LED: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'C', sigPin: 'A',
        requiresHelper: 'RESISTOR',
        helperLabel: '220Ω',
    },
    BUZZER: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: '2', sigPin: '1',
        // Buzzer: MCU signal → pin1(+), pin2(-) → GND
    },
    SERVO: {
        kind: 'ACTUATOR', signalType: 'PWM', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'PWM',
    },
    RELAY: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: true, needsGND: true,
        vccPin: 'COIL1', gndPin: 'COIL2', sigPin: 'IN',
        // Relay module already has integrated transistor + diode driver
    },
    // === Relay-driven actuators (wired via relay module, same rule) ===
    WATERPUMP: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
    },
    WATER_PUMP: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
    },
    FAN: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
    },
    DC_MOTOR: {
        kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,
        vccPin: '', gndPin: 'IN2', sigPin: 'IN1',
    },
    // === Displays ===
    LCD: {
        kind: 'DISPLAY', signalType: 'I2C', needsVCC: true, needsGND: true,
        vccPin: 'VCC', gndPin: 'GND', sigPin: 'SDA',
        isI2C: true,
    },
    OLED: {
        kind: 'DISPLAY', signalType: 'I2C', needsVCC: true, needsGND: true,
        vccPin: 'VIN', gndPin: 'GND', sigPin: 'DATA',
        isI2C: true,
    },
    // === Full registry key aliases — ensures every components.json key resolves ===
    // Sensors (only NEW keys not already defined above)
    IR_OBSTACLE:        { kind: 'SENSOR',   signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'OUT'  },
    IROBSTACLE:         { kind: 'SENSOR',   signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'OUT'  },
    TEMPERATURE_LM35:   { kind: 'SENSOR',   signalType: 'ANALOG',  needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'OUT'  },
    TEMPERATURELM35:    { kind: 'SENSOR',   signalType: 'ANALOG',  needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'OUT'  },
    LM35:               { kind: 'SENSOR',   signalType: 'ANALOG',  needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'OUT'  },
    MQ2GAS:             { kind: 'SENSOR',   signalType: 'ANALOG',  needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'AOUT' },
    RAINSENSOR:         { kind: 'SENSOR',   signalType: 'ANALOG',  needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'AO'   },
    SOUNDSENSOR:        { kind: 'SENSOR',   signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'DOUT' },
    // Actuators (only NEW keys not already defined above)
    RELAY_5V:           { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'COIL1', gndPin: 'COIL2', sigPin: 'IN'   },
    SERVO_SG90:         { kind: 'ACTUATOR', signalType: 'PWM',     needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'PWM'  },
    SERVOSG90:          { kind: 'ACTUATOR', signalType: 'PWM',     needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'PWM'  },
    DCMOTOR:            { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,  vccPin: '',      gndPin: 'IN2', sigPin: 'IN1'   },
    MOTOR:              { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,  vccPin: '',      gndPin: 'IN2', sigPin: 'IN1'   },
    // Displays (only NEW keys not already defined above)
    LCD_16X2:           { kind: 'DISPLAY',  signalType: 'I2C',     needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'SDA',  isI2C: true },
    OLED_SSD1306:       { kind: 'DISPLAY',  signalType: 'I2C',     needsVCC: true,  needsGND: true,  vccPin: 'VIN',   gndPin: 'GND',   sigPin: 'DATA', isI2C: true },
    SSD1306:            { kind: 'DISPLAY',  signalType: 'I2C',     needsVCC: true,  needsGND: true,  vccPin: 'VIN',   gndPin: 'GND',   sigPin: 'DATA', isI2C: true },
    SEVENSEGMENT:       { kind: 'DISPLAY',  signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'A'    },
    // Driver
    L298N:              { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'IN1'  },
    DRIVER_L298N:       { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: true,  needsGND: true,  vccPin: 'VCC',   gndPin: 'GND',   sigPin: 'IN1'  },
    // Passives / Power (rendered as helper nodes, no unique MCU pin consumed)
    RESISTOR:           { kind: 'ACTUATOR', signalType: 'NONE',    needsVCC: false, needsGND: true,  vccPin: '',      gndPin: '2',     sigPin: '1'    },
    DIODE:              { kind: 'ACTUATOR', signalType: 'NONE',    needsVCC: false, needsGND: true,  vccPin: '',      gndPin: 'K',     sigPin: 'A'    },
    TRANSISTOR_NPN:     { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,  vccPin: '',      gndPin: 'E',     sigPin: 'B'    },
    TRANSISTORNPN:      { kind: 'ACTUATOR', signalType: 'DIGITAL', needsVCC: false, needsGND: true,  vccPin: '',      gndPin: 'E',     sigPin: 'B'    },
    CAPACITOR:          { kind: 'ACTUATOR', signalType: 'NONE',    needsVCC: false, needsGND: true,  vccPin: '',      gndPin: '2',     sigPin: '1'    },

};

// ── Normalize registry key — strips known prefixes/suffixes ──────────────────
function normalizeComponentKey(key: string): string {
    return key
        .replace(/^Actuator_/, '')
        .replace(/^Sensor_/, '')
        .replace(/^Display_/, '')
        .replace(/^Input_/, '')
        .replace(/^MCU_/, '')
        .replace(/^Power_/, '')
        .replace(/^Driver_/, '')
        .replace(/^Basic_/, '')
        .replace(/_5V$/, '')
        .replace(/_SSD1306$/, '')
        .replace(/_16x2$/, '')
        .replace(/_SG90$/, '')
        .replace(/_SR04$/, '')
        .replace(/_MQ2$/, '')
        .replace(/_DHT11$/, '')
        .replace(/_PIR$/, '')
        .replace(/_LDR$/, '')
        .replace(/_HC$/, '')
        .replace(/_YL69$/, '')
        .replace(/_YL83$/, '')
        .replace(/_KY038$/, '')
        .replace(/_HC_SR501$/, '')
        .replace(/_/g, '')
        .toUpperCase();
}

// ── Resolve concept string → rule key ─────────────────────────────────────────
function resolveRule(raw: string): string | undefined {
    // 1. Try normalizer-based exact match first (most reliable)
    const normalized = normalizeComponentKey(raw);
    const exactMatch = Object.keys(COMPONENT_WIRING_RULES).find(
        k => k.replace(/_/g, '').toUpperCase() === normalized
    );
    if (exactMatch) return exactMatch;

    // 2. Fallback: substring scan on uppercased raw (original behaviour)
    const up = raw.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '');
    return Object.keys(COMPONENT_WIRING_RULES).find(k => up.includes(k));
}

// ── Pretty label from raw concept string ──────────────────────────────────────
function toLabel(raw: string): string {
    return raw
        .replace(/^(Sensor_|Actuator_|Display_|Input_|Driver_|Basic_|Power_|MCU_)/i, '')
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim();
}

// ── Canvas layout constants ────────────────────────────────────────────────────
const CANVAS = {
    MCU_X: 400,
    MCU_Y: 80,
    SENSOR_COL_X: 60,         // sensors + inputs start here
    ACTUATOR_COL_X: 660,      // actuators + displays start here
    ROW_GAP: 140,             // vertical gap between components
    HELPER_OFFSET: 60,        // horizontal gap between helper (resistor) and actuator
    RAIL_MARGIN_TOP: 500,     // VCC/GND rail Y
    RAIL_X: 40,
};

// ── Main engine function ───────────────────────────────────────────────────────
/**
 * @param concept   - {inputs, logic, outputs} from the concept extractor
 * @param backendPins - Optional pin_assignments from the backend API
 *   (validated_circuit.pin_assignments). When provided, the visual canvas
 *   will use the EXACT same GPIO pin numbers as the generated Arduino code.
 */
export function buildCircuitGraph(concept: {
    inputs: string[];
    logic: string[];
    outputs: string[];
} | null,
backendPins?: Record<string, { signal?: number | string; trig?: number; echo?: number; in1?: number; in2?: number; sda?: number; scl?: number }>
): CircuitGraph {

    // Helper: get the backend-assigned pin string for a component role.
    // Falls back to undefined — frontend allocator takes over naturally.
    function backendPin(compKey: string, role: 'signal' | 'trig' | 'echo' | 'in1' | 'in2' = 'signal'): string | undefined {
        if (!backendPins) return undefined;
        // Try exact key first, then normalized key, then scan all keys case-insensitively
        const entry = backendPins[compKey]
            ?? backendPins[normalizeComponentKey(compKey)]
            ?? Object.entries(backendPins).find(([k]) => k.toLowerCase() === compKey.toLowerCase())?.[1];
        if (!entry) {
            console.warn(`[CircuitGraph] backendPin: no entry for "${compKey}" (role: ${role}) in`, Object.keys(backendPins));
            return undefined;
        }
        let val = (entry as any)[role];
        
        // I2C devices in backend payload use "sda" / "scl" instead of "signal"
        if (val === undefined && role === 'signal') {
            if ('sda' in entry || 'scl' in entry) {
                return String((entry as any)['sda'] ?? (entry as any)['scl']);
            }
        }

        if (val === undefined) {
            console.warn(`[CircuitGraph] backendPin: entry found for "${compKey}" but role "${role}" is missing:`, entry);
        }
        return val !== undefined ? String(val) : undefined;
    }


    const nodes: CircuitNode[] = [];
    const edges: CircuitEdge[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!concept) {
        return { nodes, edges, errors: ['No concept provided'], warnings };
    }

    let digitalSensorIdx = 0;
    let analogSensorIdx = 0;
    let actuatorIdx = 0;
    let helperIdx = 0;
    let i2cAssigned = false;
    const usedPins = new Set<string>();

    // ── 1. MCU Node — detect ESP32 vs Arduino from concept.logic ─────────────
    const logicKey = concept.logic?.[0] ?? 'MCU_Arduino_Uno';
    const isESP32 = logicKey.toUpperCase().includes('ESP32');
    console.log('[MCU_TRACE] wiringRulesEngine.ts - buildCircuitGraph: concept =', concept, ', logicKey =', logicKey, ', isESP32 =', isESP32);
    const mcuComponentKey = isESP32 ? 'MCU_ESP32' : 'MCU_ARDUINO_UNO';
    const mcuLabel = isESP32 ? 'ESP32 DevKit V1' : 'Arduino Uno';

    nodes.push({
        id: 'MCU',
        kind: 'MCU',
        label: mcuLabel,
        componentKey: mcuComponentKey,
        x: CANVAS.MCU_X,
        y: CANVAS.MCU_Y,
    });


    // ── 2. Rails ─────────────────────────────────────────────────────────────
    const RAIL_W = CANVAS.ACTUATOR_COL_X + 200 - CANVAS.RAIL_X;
    nodes.push({
        id: 'VCC_RAIL', kind: 'POWER_RAIL', label: '+ 5V', componentKey: 'VCC_RAIL',
        x: CANVAS.RAIL_X, y: CANVAS.RAIL_MARGIN_TOP,
        meta: { color: '#ef4444', width: RAIL_W },
    });
    nodes.push({
        id: 'GND_RAIL', kind: 'POWER_RAIL', label: '↓ GND', componentKey: 'GND_RAIL',
        x: CANVAS.RAIL_X, y: CANVAS.RAIL_MARGIN_TOP + 36,
        meta: { color: '#94a3b8', width: RAIL_W },
    });

    // MCU Power → Rails
    edges.push({
        id: 'mcu-vcc', from: 'MCU', fromPin: isESP32 ? '3V3_src' : '5V_src', to: 'VCC_RAIL', toPin: 'in',
        wireType: 'POWER',
    });
    edges.push({
        id: 'mcu-gnd', from: 'MCU', fromPin: 'GND_src', to: 'GND_RAIL', toPin: 'in',
        wireType: 'GROUND',
    });

    const DIGITAL_SENSOR_PINS = isESP32 ? ESP_DIGITAL_SENSOR_PINS : UNO_DIGITAL_SENSOR_PINS;
    const ANALOG_SENSOR_PINS = isESP32 ? ESP_ANALOG_SENSOR_PINS : UNO_ANALOG_SENSOR_PINS;
    const DIGITAL_ACTUATOR_PINS = isESP32 ? ESP_DIGITAL_ACTUATOR_PINS : UNO_DIGITAL_ACTUATOR_PINS;
    const PWM_PINS = isESP32 ? ESP_PWM_PINS : UNO_PWM_PINS;
    const I2C_SDA = isESP32 ? ESP_I2C_SDA : UNO_I2C_SDA;
    const pinPfx = isESP32 ? "GPIO" : "D";
    const aPfx = isESP32 ? "GPIO" : "";

    // ── 3. Process Inputs & Sensors (left column) ─────────────────────────────
    const inputComponents = [...concept.inputs];
    let leftY = CANVAS.MCU_Y;
    let slotLeft = 0;

    for (const raw of inputComponents) {
        const rKey = resolveRule(raw);
        if (!rKey) {
            warnings.push(`Unknown input component: "${raw}" — skipping wiring`);
            continue;
        }
        const rule = COMPONENT_WIRING_RULES[rKey];
        const nodeId = `sensor_${slotLeft}`;
        const compKey = raw.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '');

        nodes.push({
            id: nodeId,
            kind: rule.kind === 'INPUT' ? 'INPUT' : 'SENSOR',
            label: toLabel(raw),
            componentKey: compKey,
            x: CANVAS.SENSOR_COL_X,
            y: leftY,
        });

        // ── Assign MCU pin — prefer backend-allocated pin if available ───────
        // Special case: HC-SR04 uses 'trig'+'echo' roles, not 'signal'
        const isHCSR04 = rKey === 'HC_SR04' || rKey === 'HCSR04' || rKey === 'HC';
        let mcuPin: string;
        const bPin = isHCSR04 ? backendPin(raw, 'trig') : backendPin(raw);
        if (bPin) {
            mcuPin = rule.signalType === 'ANALOG' ? (isESP32 ? `GPIO${bPin}` : bPin) : `${pinPfx}${bPin}`;
            if (rule.isI2C) i2cAssigned = true;
            usedPins.add(mcuPin);
        } else if (rule.isI2C) {
            mcuPin = isESP32 ? `GPIO${I2C_SDA}` : I2C_SDA;
            i2cAssigned = true;
            usedPins.add(mcuPin);
        } else if (rule.signalType === 'ANALOG') {
            while (true) {
                mcuPin = `${aPfx}${ANALOG_SENSOR_PINS[analogSensorIdx % ANALOG_SENSOR_PINS.length]}`;
                analogSensorIdx++;
                if (!usedPins.has(mcuPin) || analogSensorIdx > 100) break;
            }
            usedPins.add(mcuPin);
        } else {
            while (true) {
                const pin = DIGITAL_SENSOR_PINS[digitalSensorIdx % DIGITAL_SENSOR_PINS.length];
                mcuPin = `${pinPfx}${pin}`;
                digitalSensorIdx++;
                if (!usedPins.has(mcuPin) || digitalSensorIdx > 100) break;
            }
            usedPins.add(mcuPin);
        }

        // ── Signal wire: sensor → MCU ────────────────────────────────────────
        edges.push({
            id: `${nodeId}-sig`,
            from: nodeId, fromPin: `${rule.sigPin}_src`,
            to: 'MCU', toPin: `${mcuPin}_tgt`,
            wireType: rule.signalType === 'DATA' || rule.isI2C ? 'DATA' : 'SIGNAL',
        });

        // HC-SR04 needs ECHO pin too — use the backend-allocated echo pin for exact match with code
        if (isHCSR04) {
            const bEcho = backendPin(raw, 'echo');
            const echoNum = bEcho ?? String(DIGITAL_SENSOR_PINS[digitalSensorIdx % DIGITAL_SENSOR_PINS.length]);
            const echoPinId = `${pinPfx}${echoNum}`;
            if (!bEcho) digitalSensorIdx++;
            usedPins.add(echoPinId);
            edges.push({
                id: `${nodeId}-echo`,
                from: nodeId, fromPin: `ECHO_src`,
                to: 'MCU', toPin: `${echoPinId}_tgt`,
                wireType: 'SIGNAL',
            });
        }

        // ── Power wires: rail → sensor ───────────────────────────────────────
        if (rule.needsVCC && rule.vccPin) {
            edges.push({
                id: `${nodeId}-vcc`,
                from: 'VCC_RAIL', fromPin: `slot_${slotLeft}`,
                to: nodeId, toPin: `${rule.vccPin}_tgt`,
                wireType: 'POWER',
            });
        }
        if (rule.needsGND && rule.gndPin) {
            edges.push({
                id: `${nodeId}-gnd`,
                from: 'GND_RAIL', fromPin: `slot_${slotLeft}`,
                to: nodeId, toPin: `${rule.gndPin}_tgt`,
                wireType: 'GROUND',
            });
        }

        leftY += CANVAS.ROW_GAP;
        slotLeft++;
    }

    // ── 4. Process Outputs / Actuators / Displays (right column) ─────────────
    let rightY = CANVAS.MCU_Y;
    let slotRight = slotLeft; // continue slot indexing for rails

    for (const raw of concept.outputs) {
        const rKey = resolveRule(raw);
        if (!rKey) {
            warnings.push(`Unknown output component: "${raw}" — skipping wiring`);
            continue;
        }
        const rule = COMPONENT_WIRING_RULES[rKey];
        const nodeId = `actuator_${actuatorIdx}`;
        const compKey = raw.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '');

        // ── Assign MCU pin ───────────────────────────────────────────────────
        let mcuPin: string;
        const bPin = backendPin(raw);
        if (bPin) {
            mcuPin = rule.signalType === 'ANALOG' ? (isESP32 ? `GPIO${bPin}` : bPin) : `${pinPfx}${bPin}`;
            if (rule.isI2C) i2cAssigned = true;
            usedPins.add(mcuPin);
        } else if (rule.isI2C) {
            mcuPin = isESP32 ? `GPIO${I2C_SDA}` : I2C_SDA;
            if (!i2cAssigned) i2cAssigned = true;
            usedPins.add(mcuPin);
        } else if (rule.signalType === 'PWM') {
            while (true) {
                let pinNum = DIGITAL_ACTUATOR_PINS[actuatorIdx % DIGITAL_ACTUATOR_PINS.length];
                mcuPin = `${pinPfx}${pinNum}`;
                actuatorIdx++;
                if ((PWM_PINS.has(pinNum as number) && !usedPins.has(mcuPin)) || actuatorIdx > 100) break;
            }
            usedPins.add(mcuPin);
        } else {
            while (true) {
                const pin = DIGITAL_ACTUATOR_PINS[actuatorIdx % DIGITAL_ACTUATOR_PINS.length];
                mcuPin = `${pinPfx}${pin}`;
                actuatorIdx++;
                if (!usedPins.has(mcuPin) || actuatorIdx > 100) break;
            }
            usedPins.add(mcuPin);
        }

        // ── Auto-insert helper component if required ──────────────────────────
        if (rule.requiresHelper === 'RESISTOR') {
            const resistorId = `helper_resistor_${helperIdx}`;
            nodes.push({
                id: resistorId,
                kind: 'HELPER',
                label: rule.helperLabel ?? '220Ω',
                componentKey: 'BASIC_RESISTOR',
                x: CANVAS.ACTUATOR_COL_X - CANVAS.HELPER_OFFSET,
                y: rightY + 20,
                meta: { helperFor: nodeId },
            });

            // MCU → resistor
            edges.push({
                id: `${resistorId}-sig`,
                from: 'MCU', fromPin: `${mcuPin}_src`,
                to: resistorId, toPin: `1_tgt`,
                wireType: 'SIGNAL',
            });

            // resistor → LED anode (not MCU → LED directly)
            nodes.push({
                id: nodeId, kind: 'ACTUATOR', label: toLabel(raw),
                componentKey: compKey,
                x: CANVAS.ACTUATOR_COL_X + CANVAS.HELPER_OFFSET,
                y: rightY,
            });
            edges.push({
                id: `${nodeId}-sig`,
                from: resistorId, fromPin: `2_src`,
                to: nodeId, toPin: `${rule.sigPin}_tgt`,
                wireType: 'SIGNAL',
            });

            helperIdx++;
        } else {
            // Direct MCU → actuator signal
            nodes.push({
                id: nodeId, kind: rule.kind === 'DISPLAY' ? 'DISPLAY' : 'ACTUATOR', label: toLabel(raw),
                componentKey: compKey,
                x: CANVAS.ACTUATOR_COL_X,
                y: rightY,
            });

            if (rule.isI2C) {
                // I2C: MCU is master — both SDA (A4) and SCL (A5) go FROM MCU TO display
                edges.push({
                    id: `${nodeId}-sda`,
                    from: 'MCU', fromPin: `A4_src`,
                    to: nodeId, toPin: `${rule.sigPin}_tgt`,  // DATA pin
                    wireType: 'DATA',
                });
                edges.push({
                    id: `${nodeId}-scl`,
                    from: 'MCU', fromPin: `A5_src`,
                    to: nodeId, toPin: `CLK_tgt`,
                    wireType: 'DATA',
                });
                i2cAssigned = true;
            } else {
                edges.push({
                    id: `${nodeId}-sig`,
                    from: 'MCU', fromPin: `${mcuPin}_src`,
                    to: nodeId, toPin: `${rule.sigPin}_tgt`,
                    wireType: rule.signalType === 'PWM' ? 'PWM' : 'SIGNAL',
                });
            }
        }

        // ── Power wires: rail → actuator ─────────────────────────────────────
        if (rule.needsVCC && rule.vccPin) {
            edges.push({
                id: `${nodeId}-vcc`,
                from: 'VCC_RAIL', fromPin: `slot_${slotRight}`,
                to: nodeId, toPin: `${rule.vccPin}_tgt`,
                wireType: 'POWER',
            });
        }
        if (rule.needsGND && rule.gndPin) {
            edges.push({
                id: `${nodeId}-gnd`,
                from: 'GND_RAIL', fromPin: `slot_${slotRight}`,
                to: nodeId, toPin: `${rule.gndPin}_tgt`,
                wireType: 'GROUND',
            });
        }

        // ── Validation ───────────────────────────────────────────────────────
        if (rKey === 'LED' && !rule.requiresHelper) {
            errors.push(`LED "${raw}" is missing its current-limiting resistor!`);
        }

        rightY += CANVAS.ROW_GAP;
        slotRight++;
        actuatorIdx++;
    }

    // ── 5. I2C SCL connection for sensor-side I2C devices ────────────────────
    // (Output-side I2C already handled in loop above. This handles any input I2C.)
    if (i2cAssigned) {
        const i2cInputNodes = nodes.filter(n =>
            (n.kind === 'SENSOR' || n.kind === 'INPUT') &&
            (n.componentKey.includes('LCD') || n.componentKey.includes('OLED') ||
             n.componentKey.includes('SSD1306') || n.componentKey.includes('1602'))
        );
        i2cInputNodes.forEach(n => {
            edges.push({
                id: `${n.id}-scl`,
                from: 'MCU', fromPin: `A5_src`,
                to: n.id, toPin: `CLK_tgt`,
                wireType: 'DATA',
            });
        });
    }

    return { nodes, edges, errors, warnings };
}

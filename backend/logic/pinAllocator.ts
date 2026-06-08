import { COMPONENT_REGISTRY } from "./componentRegistry"

export interface PinAllocation {
    name: string      // clean component key, e.g. "PIR"
    rawName: string   // as it came from concept, e.g. "Sensor_PIR"
    pin: number
    varName: string   // e.g. "PIR_PIN"
}

// Fixed pin pools, deterministic order
const SENSOR_PINS = [2, 3, 4, 5, 6, 7]
const ACTUATOR_PINS = [8, 9, 10, 11, 12, 13]
// Analog sensor pool (A0..A5 mapped to Arduino constants)
const ANALOG_PINS = [14, 15, 16, 17, 18, 19] // A0–A5 as numbers

function resolveKey(name: string): string | undefined {
    return Object.keys(COMPONENT_REGISTRY).find(k => name.toUpperCase().includes(k))
}

function toVarName(key: string): string {
    return key.replace(/[^A-Z0-9_]/gi, "_").toUpperCase() + "_PIN"
}

function toArduinoAnalogPin(pin: number): string {
    const analogMap: Record<number, string> = {
        14: "A0", 15: "A1", 16: "A2", 17: "A3", 18: "A4", 19: "A5"
    }
    return analogMap[pin] ?? String(pin)
}

export interface PinMap {
    sensors: PinAllocation[]
    actuators: PinAllocation[]
}

export function allocatePins(concept: {
    inputs: string[]
    logic: string[]
    outputs: string[]
}): PinMap {
    const sensors: PinAllocation[] = []
    const actuators: PinAllocation[] = []
    let sensorDigitalIdx = 0
    let sensorAnalogIdx = 0
    let actuatorIdx = 0

    for (const raw of concept.inputs) {
        const key = resolveKey(raw)
        if (!key) continue
        const meta = COMPONENT_REGISTRY[key]
        if (meta.category !== "SENSOR") continue

        let pin: number
        if (meta.signalType === "ANALOG") {
            pin = ANALOG_PINS[sensorAnalogIdx++ % ANALOG_PINS.length]
        } else {
            pin = SENSOR_PINS[sensorDigitalIdx++ % SENSOR_PINS.length]
        }

        sensors.push({ name: key, rawName: raw, pin, varName: toVarName(key) })
    }

    for (const raw of concept.outputs) {
        const key = resolveKey(raw)
        if (!key) continue
        const meta = COMPONENT_REGISTRY[key]
        if (meta.category !== "ACTUATOR") continue

        const pin = ACTUATOR_PINS[actuatorIdx++ % ACTUATOR_PINS.length]
        actuators.push({ name: key, rawName: raw, pin, varName: toVarName(key) })
    }

    return { sensors, actuators }
}

export { toArduinoAnalogPin }

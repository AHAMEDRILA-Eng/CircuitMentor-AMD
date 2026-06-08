import { COMPONENT_REGISTRY } from "./componentRegistry"

// ── Resolve a raw concept string to a registry key ──────────────────────────
function resolveKey(name: string): string | undefined {
    return Object.keys(COMPONENT_REGISTRY).find(k => name.toUpperCase().includes(k))
}

function getMeta(name: string) {
    const key = resolveKey(name)
    return key ? { key, meta: COMPONENT_REGISTRY[key] } : undefined
}

// ── Types ────────────────────────────────────────────────────────────────────

export type LogicType =
    | "SENSOR_BASED"
    | "TIMER_BASED"
    | "HYBRID"

export interface ConditionModel {
    sensor: string              // registry key (e.g. "PIR", "HC_SR04") — NOT the variable name
    operator: "==" | "<" | ">" | "<=" | ">="
    compareTo: string           // "HIGH", "DISTANCE_THRESHOLD", "THRESHOLD", etc.
    displayLabel: string        // human-readable string for the UI panel
}

export interface ConditionResult {
    logicType: LogicType
    conditions: string[]          // display strings for backward compat UI
    conditionModels: ConditionModel[]
}

// ── Main function ─────────────────────────────────────────────────────────────

export function buildConditions(concept: {
    inputs: string[]
    logic: string[]
    outputs: string[]
}): ConditionResult {

    const conditionModels: ConditionModel[] = []
    let hasSensor = false
    let hasTimer = false

    // ── Inputs ───────────────────────────────────────────────────────────────
    for (const input of concept.inputs) {
        const resolved = getMeta(input)
        if (!resolved) continue
        const { key, meta } = resolved

        if (meta.category === "SENSOR" && meta.producesCondition) {
            hasSensor = true

            const readVar = meta.arduino?.readVar ?? key.toLowerCase()

            if (meta.requiresThreshold) {
                const threshold = key === "HC_SR04"
                    ? "DISTANCE_THRESHOLD"
                    : "THRESHOLD"

                const label = meta.friendlyCondition ?? `${key} value < ${threshold}`
                conditionModels.push({
                    sensor: key,        // registry key — generator does the readVar lookup
                    operator: "<",
                    compareTo: threshold,
                    displayLabel: label
                })

            } else {
                const label = meta.friendlyCondition ?? `${key} == HIGH`
                conditionModels.push({
                    sensor: key,        // registry key — generator does the readVar lookup
                    operator: "==",
                    compareTo: "HIGH",
                    displayLabel: label
                })
            }
        }
    }

    // ── Logic Components (timers etc.) ────────────────────────────────────────
    for (const logicItem of concept.logic) {
        const resolved = getMeta(logicItem)
        if (!resolved) continue
        const { meta } = resolved

        if (meta.category === "TIMER") {
            hasTimer = true
            // Timers don't map to a C++ expression — display only entry
            conditionModels.push({
                sensor: "timer",
                operator: "==",
                compareTo: "elapsed",
                displayLabel: "Timer has elapsed"
            })
        }
    }

    // ── Logic type ────────────────────────────────────────────────────────────
    let logicType: LogicType = "SENSOR_BASED"
    if (!hasSensor && hasTimer) logicType = "TIMER_BASED"
    if (hasSensor && hasTimer) logicType = "HYBRID"

    // Derive display strings from models — single source of truth
    const conditions = conditionModels.map(m => m.displayLabel)

    return {
        logicType,
        conditions,
        conditionModels
    }
}

import { COMPONENT_REGISTRY } from "./componentRegistry"

function getMeta(name: string) {
    const key = Object.keys(COMPONENT_REGISTRY).find(k => name.toUpperCase().includes(k));
    return key ? COMPONENT_REGISTRY[key] : undefined;
}

export interface ActionResult {
    actions: string[]
}

export function buildActions(concept: {
    inputs: string[]
    logic: string[]
    outputs: string[]
}): ActionResult {

    const actions: string[] = []

    for (const output of concept.outputs) {
        const meta = getMeta(output)
        if (!meta) continue

        if (meta.category === "ACTUATOR") {
            const outUpper = output.toUpperCase();
            if (outUpper.includes("LED")) {
                actions.push("Turn LED ON")
            }

            if (outUpper.includes("BUZZER")) {
                actions.push("Activate Buzzer")
            }

            if (outUpper.includes("LCD") || outUpper.includes("SERVO")) {
                actions.push(`Activate ${output.replace('Actuator_', '').replace('Display_', '').replace('_', ' ')}`)
            }
        }

        if (meta.category === "PLATFORM") {
            actions.push("Send notification via IoT platform")
        }
    }

    return { actions }
}

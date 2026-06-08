import { buildConditions } from "./conditionBuilder";
import { buildActions } from "./actionBuilder";

// Re-export ConditionModel as part of the public API
export type { ConditionModel } from "./conditionBuilder";

export interface SystemLogicData {
    displayConditions: string[];       // human-readable strings for the UI
    conditionModels: import("./conditionBuilder").ConditionModel[]; // typed models for code generation
    actions: string[];
    logicType: string;
}

export function generateSystemLogic(concept: {
    inputs: string[];
    logic: string[];
    outputs: string[];
}): SystemLogicData {
    const condResult = buildConditions(concept);
    const actResult = buildActions(concept);

    return {
        displayConditions: condResult.conditions,
        conditionModels: condResult.conditionModels,
        actions: actResult.actions,
        logicType: condResult.logicType
    };
}

export { generateArduinoCode } from "./codeGenerator";
export type { NormalizedConcept } from "./codeGenerator";


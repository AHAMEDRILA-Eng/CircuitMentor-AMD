import { COMPONENT_REGISTRY } from "./componentRegistry"
import { allocatePins, toArduinoAnalogPin, PinAllocation } from "./pinAllocator"
import { SystemLogicData } from "./index"

export interface NormalizedConcept {
    inputs: string[]
    logic: string[]
    outputs: string[]
}

// -------------------------------------------------------
// Library detection — pure static lookup, no LLM
// -------------------------------------------------------
function detectLibraries(concept: NormalizedConcept): string[] {
    const libs: string[] = []
    const all = [...concept.inputs, ...concept.logic, ...concept.outputs]
    for (const raw of all) {
        const up = raw.toUpperCase()
        if (up.includes("DHT")) libs.push('#include <DHT.h>')
        if (up.includes("SERVO")) libs.push('#include <Servo.h>')
        if (up.includes("LCD") && !libs.includes('#include <LiquidCrystal_I2C.h>'))
            libs.push('#include <LiquidCrystal_I2C.h>\n#include <Wire.h>')
        if (up.includes("BLYNK")) libs.push('#include <BlynkSimpleEsp8266.h>  // Change to BlynkSimpleEsp32.h for ESP32')
    }
    return [...new Set(libs)]
}

// -------------------------------------------------------
// Global declarations (Servo obj, DHT obj, etc.)
// -------------------------------------------------------
function detectGlobals(concept: NormalizedConcept, sensors: PinAllocation[], actuators: PinAllocation[]): string[] {
    const globals: string[] = []
    const all = [...concept.inputs, ...concept.logic, ...concept.outputs]
    for (const raw of all) {
        const up = raw.toUpperCase()
        if (up.includes("DHT")) {
            const s = sensors.find(s => s.name === "DHT11")
            globals.push(`DHT dht(${s ? s.pin : 4}, DHT11);`)
        }
        if (up.includes("SERVO")) {
            globals.push(`Servo servo;`)
        }
        if (up.includes("LCD")) {
            globals.push(`LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);`)
        }
        if (up.includes("HC_SR04")) {
            // HC-SR04 uses TRIG + ECHO on consecutive pins
            const s = sensors.find(s => s.name === "HC_SR04")
            const trigPin = s ? s.pin : 2
            const echoPin = trigPin + 1
            globals.push(`const int HC_SR04_TRIG = ${trigPin};`)
            globals.push(`const int HC_SR04_ECHO = ${echoPin};`)
        }
    }
    // Blynk credentials — full scaffold with explicit TODOs
    for (const raw of all) {
        if (raw.toUpperCase().includes("BLYNK")) {
            globals.push(
                `// ── Blynk IoT Credentials ─────────────────────────────
// TODO: Replace these placeholders with your real values.
// Get your Auth Token from the Blynk app or console.
char auth[] = "YOUR_BLYNK_AUTH_TOKEN"; // TODO: paste your token here
char ssid[] = "YOUR_WIFI_SSID";         // TODO: your WiFi network name
char pass[] = "YOUR_WIFI_PASSWORD";     // TODO: your WiFi password
// ──────────────────────────────────────────────────────`
            )
            break // only emit once even if concept has multiple Blynk refs
        }
    }
    return [...new Set(globals)]
}

// -------------------------------------------------------
// Helper functions collected from registry
// -------------------------------------------------------
function collectHelperFunctions(sensors: PinAllocation[]): string {
    const helpers: string[] = []
    for (const s of sensors) {
        const meta = COMPONENT_REGISTRY[s.name]
        if (meta?.arduino?.helperFunctions) {
            helpers.push(meta.arduino.helperFunctions)
        }
    }
    return helpers.join("\n\n")
}

// -------------------------------------------------------
// Build pin const definitions
// -------------------------------------------------------
function buildPinDefs(sensors: PinAllocation[], actuators: PinAllocation[]): string {
    const lines: string[] = []
    for (const s of sensors) {
        const meta = COMPONENT_REGISTRY[s.name]
        // HC_SR04 has no single pin — uses TRIG/ECHO globals declared separately
        if (s.name === "HC_SR04") continue
        const pinStr = meta?.arduino?.pinMode === null && s.name === "DHT11"
            ? String(s.pin)
            : meta?.signalType === "ANALOG"
                ? toArduinoAnalogPin(s.pin)
                : String(s.pin)
        lines.push(`const int ${s.varName} = ${pinStr};`)
    }
    for (const a of actuators) {
        if (a.name === "LCD") {
            // LCD uses I2C — no digital pin, but document the I2C address as a constant
            // so students can change it if their module uses 0x3F instead of 0x27
            lines.push(`const int LCD_I2C_ADDR = 0x27;  // TODO: change to 0x3F if LCD stays blank`)
            lines.push(`// LCD wiring: SDA → A4, SCL → A5 (Arduino Uno) or SDA/SCL pins on other boards`)
        } else if (a.name === "SERVO") {
            // Servo uses PWM — emit its allocated pin explicitly
            lines.push(`const int ${a.varName} = ${a.pin};  // Must be a PWM-capable pin (3,5,6,9,10,11 on Uno)`)
        } else {
            lines.push(`const int ${a.varName} = ${a.pin};`)
        }
    }
    return lines.join("\n")
}

// -------------------------------------------------------
// Build setup() body
// -------------------------------------------------------
function buildSetup(sensors: PinAllocation[], actuators: PinAllocation[], concept: NormalizedConcept): string {
    const lines: string[] = ["  Serial.begin(9600);"]

    for (const s of sensors) {
        const meta = COMPONENT_REGISTRY[s.name]
        if (!meta?.arduino?.pinMode) continue
        lines.push(`  pinMode(${s.varName}, ${meta.arduino.pinMode});`)
    }
    for (const a of actuators) {
        const meta = COMPONENT_REGISTRY[a.name]
        if (!meta?.arduino?.pinMode) continue
        lines.push(`  pinMode(${a.varName}, ${meta.arduino.pinMode});`)
    }

    // Special init calls
    const all = [...concept.inputs, ...concept.logic, ...concept.outputs]
    const seen = new Set<string>()
    for (const raw of all) {
        const up = raw.toUpperCase()
        if (up.includes("DHT") && !seen.has("DHT")) {
            lines.push("  dht.begin();"); seen.add("DHT")
        }
        if (up.includes("SERVO") && !seen.has("SERVO")) {
            const a = actuators.find(a => a.name === "SERVO")
            lines.push(`  servo.attach(${a ? a.pin : 9});`); seen.add("SERVO")
        }
        if (up.includes("LCD") && !seen.has("LCD")) {
            lines.push("  lcd.init();");
            lines.push("  lcd.backlight();"); seen.add("LCD")
        }
        if (up.includes("HC_SR04") && !seen.has("HC_SR04")) {
            lines.push("  pinMode(HC_SR04_TRIG, OUTPUT);");
            lines.push("  pinMode(HC_SR04_ECHO, INPUT);"); seen.add("HC_SR04")
        }
        if (up.includes("BLYNK") && !seen.has("BLYNK")) {
            lines.push("  Blynk.begin(auth, ssid, pass); // Connects to WiFi + Blynk server");
            seen.add("BLYNK")
        }
    }

    return lines.join("\n")
}

// -------------------------------------------------------
// Build condition expression for if()
// c.sensor = registry key (e.g. "PIR")
// Looks up arduino.readVar for the exact C++ variable name.
// -------------------------------------------------------
function buildConditionExpr(logic: SystemLogicData): string {
    if (!logic.conditionModels || logic.conditionModels.length === 0) {
        return "true"
    }

    return logic.conditionModels.map(c => {
        const meta = COMPONENT_REGISTRY[c.sensor]
        if (!meta?.arduino?.readVar) {
            throw new Error(
                `[buildConditionExpr] Cannot build condition for '${c.sensor}': ` +
                `missing 'arduino.readVar' in componentRegistry.ts`
            )
        }
        const varName = meta.arduino.readVar
        return `${varName} ${c.operator} ${c.compareTo}`
    }).join(" && ")
}

// -------------------------------------------------------
// Build loop() read section — registry-driven
// -------------------------------------------------------
function buildReadStatements(sensors: PinAllocation[]): string {
    const lines: string[] = []
    for (const s of sensors) {
        const meta = COMPONENT_REGISTRY[s.name]
        if (!meta?.arduino?.readSnippet) continue

        // Use the exact variable name declared in the registry.
        // No fallback — missing readVar is a registry authoring error, not a runtime condition.
        const readVar = meta.arduino.readVar
        if (!readVar) {
            throw new Error(
                `[CodeGenerator] Registry entry '${s.name}' has readSnippet but is missing readVar. ` +
                `Add readVar to componentRegistry.ts for this component.`
            )
        }

        const snippet = meta.arduino.readSnippet
            .replace(/\{VAR\}/g, readVar)
            .replace(/\{PIN\}/g, s.varName)
            .replace(/\{TRIG\}/g, 'HC_SR04_TRIG')
            .replace(/\{ECHO\}/g, 'HC_SR04_ECHO')

        // Indent each line of the snippet by 2 spaces for loop() body
        const indented = snippet
            .split('\n')
            .map(line => `  ${line.trimStart()}`)
            .join('\n')

        lines.push(indented)
    }
    return lines.join('\n')
}

// -------------------------------------------------------
// Build if() action block — registry-driven
// -------------------------------------------------------
function buildActionBlock(actuators: PinAllocation[], concept: NormalizedConcept): string {
    const onLines: string[] = []
    const offLines: string[] = []

    for (const a of actuators) {
        const meta = COMPONENT_REGISTRY[a.name]
        if (!meta?.arduino?.writeSnippet) continue

        // ON state: expand writeSnippet placeholders
        const onSnippet = meta.arduino.writeSnippet
            .replace(/\{PIN\}/g, a.varName)
            .split('\n')
            .map(line => `    ${line.trimStart()}`)
            .join('\n')
        onLines.push(onSnippet)

        // OFF state: invert the signal or clear state
        if (meta.signalType === null && (a.name === 'LED' || a.name === 'BUZZER' || a.name === 'RELAY')) {
            offLines.push(`    digitalWrite(${a.varName}, LOW);`)
        } else if (a.name === 'SERVO') {
            offLines.push(`    servo.write(0);`)
        } else if (a.name === 'LCD') {
            offLines.push(`    lcd.clear();`)
        }
    }

    // IoT platform — driven by presence in concept, not hardcoded name
    const all = [...concept.inputs, ...concept.logic, ...concept.outputs]
    for (const raw of all) {
        const key = Object.keys(COMPONENT_REGISTRY).find(k => raw.toUpperCase().includes(k))
        if (!key) continue
        const meta = COMPONENT_REGISTRY[key]
        if (meta.category === 'PLATFORM' && meta.arduino?.writeSnippet) {
            onLines.push(`    ${meta.arduino.writeSnippet.replace(/\{PIN\}/g, '')}`)
            offLines.push(`    ${meta.arduino.writeSnippet.replace('1)', '0)').replace(/\{PIN\}/g, '')}`)
        }
    }

    return [
        ...onLines,
        '  } else {',
        ...offLines
    ].join('\n')
}

// -------------------------------------------------------
// Registry completeness validator
// Runs BEFORE any code building.
// Throws loudly if a component exists in the concept
// but is missing required arduino metadata in the registry.
// -------------------------------------------------------
function validateRegistryCompleteness(concept: NormalizedConcept): void {
    const errors: string[] = []

    function resolveKey(raw: string): string | undefined {
        return Object.keys(COMPONENT_REGISTRY).find(k => raw.toUpperCase().includes(k))
    }

    for (const raw of concept.inputs) {
        const key = resolveKey(raw)
        if (!key) continue
        const meta = COMPONENT_REGISTRY[key]

        // Sensors that produce output must have a readSnippet
        if (meta.category === 'SENSOR' && meta.producesCondition) {
            if (!meta.arduino?.readSnippet) {
                errors.push(`Sensor '${key}' (from "${raw}") is missing 'arduino.readSnippet' in componentRegistry.ts`)
            }
            if (!meta.arduino?.readVar) {
                errors.push(`Sensor '${key}' (from "${raw}") is missing 'arduino.readVar' in componentRegistry.ts`)
            }
        }

        // All sensors must have pin mode declared
        if (meta.category === 'SENSOR' && meta.arduino?.pinMode === undefined) {
            errors.push(`Sensor '${key}' (from "${raw}") is missing 'arduino.pinMode' in componentRegistry.ts`)
        }
    }

    for (const raw of concept.outputs) {
        const key = resolveKey(raw)
        if (!key) continue
        const meta = COMPONENT_REGISTRY[key]

        // Actuators must have a writeSnippet
        if (meta.category === 'ACTUATOR' && !meta.arduino?.writeSnippet) {
            errors.push(`Actuator '${key}' (from "${raw}") is missing 'arduino.writeSnippet' in componentRegistry.ts`)
        }
    }

    if (errors.length > 0) {
        throw new Error(
            `[CodeGenerator] Registry completeness check failed — fix componentRegistry.ts before generating:\n` +
            errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        )
    }
}

// -------------------------------------------------------
// Main export: generateArduinoCode
// -------------------------------------------------------
export function generateArduinoCode(
    logic: SystemLogicData,
    concept: NormalizedConcept
): string {
    // Run registry completeness check FIRST — fail loudly before any building
    validateRegistryCompleteness(concept)

    const { sensors, actuators } = allocatePins(concept)

    const libraries = detectLibraries(concept)
    const globals = detectGlobals(concept, sensors, actuators)
    const pinDefs = buildPinDefs(sensors, actuators)
    const setupBody = buildSetup(sensors, actuators, concept)
    const readStmts = buildReadStatements(sensors)
    const condExpr = buildConditionExpr(logic)
    const actionBlk = buildActionBlock(actuators, concept)
    const helpers = collectHelperFunctions(sensors)

    // Threshold constants
    const thresholdLines: string[] = []
    for (const s of sensors) {
        if (COMPONENT_REGISTRY[s.name]?.requiresThreshold) {
            if (s.name === "HC_SR04") {
                thresholdLines.push(`const int DISTANCE_THRESHOLD = 30; // cm`)
            } else {
                thresholdLines.push(`const int THRESHOLD = 500; // adjust to your sensor`)
            }
        }
    }

    const sections: string[] = []

    if (libraries.length > 0) {
        sections.push(libraries.join("\n"))
    }

    if (pinDefs) sections.push(pinDefs)
    if (thresholdLines.length > 0) sections.push(thresholdLines.join("\n"))
    if (globals.length > 0) sections.push(globals.join("\n"))

    sections.push(`void setup() {\n${setupBody}\n}`)

    const hasBlynk = [...concept.inputs, ...concept.logic, ...concept.outputs]
        .some(r => r.toUpperCase().includes('BLYNK'))

    const loopBody = [
        hasBlynk ? "  Blynk.run(); // Must be called every loop iteration" : "",
        readStmts ? readStmts + "\n" : "",
        `  if (${condExpr}) {`,
        actionBlk,
        "  }",
        "  delay(100);"
    ].filter(Boolean).join("\n").trim()

    sections.push(`void loop() {\n  ${loopBody}\n}`)

    if (helpers) sections.push(helpers)

    const sketch = sections.join("\n\n")

    validateCodeStructure(sketch)

    return sketch
}

// -------------------------------------------------------
// Static consistency validator
// Runs on the fully assembled sketch string BEFORE return.
// Throws a descriptive error if any referenced symbol is
// missing from the output — preventing silent broken code.
// -------------------------------------------------------
function validateCodeStructure(code: string): void {
    const errors: string[] = []

    // 1. Every threshold constant that is referenced must be declared
    const thresholdRefs: [string, string][] = [
        ["DISTANCE_THRESHOLD", "const int DISTANCE_THRESHOLD"],
        ["THRESHOLD", "const int THRESHOLD"],
    ]
    for (const [usage, decl] of thresholdRefs) {
        // Only check if the usage appears outside a declaration line itself
        const usageCount = (code.match(new RegExp(`\\b${usage}\\b`, "g")) ?? []).length
        const declCount = (code.match(new RegExp(decl.replace(" ", "\\s+"), "g")) ?? []).length
        if (usageCount > 0 && declCount === 0) {
            errors.push(`Used '${usage}' but '${decl}' is never declared.`)
        }
    }

    // 2. Every helper function called must be defined in the sketch
    const helperCheck: [string, string][] = [
        ["readUltrasonic(", "long readUltrasonic("],
    ]
    for (const [call, def] of helperCheck) {
        if (code.includes(call) && !code.includes(def)) {
            errors.push(`Called '${call}...' but the function definition '${def}...' is missing.`)
        }
    }

    // 3. Every pin constant used in pinMode / digitalRead / analogRead must be declared
    const pinUsages = [...code.matchAll(/\b([A-Z][A-Z0-9_]+_PIN)\b/g)].map(m => m[1])
    const uniquePins = [...new Set(pinUsages)]
    for (const pin of uniquePins) {
        if (!code.includes(`const int ${pin}`)) {
            errors.push(`Pin constant '${pin}' is used but never declared with 'const int ${pin}'.`)
        }
    }

    // 4. HC_SR04_TRIG / HC_SR04_ECHO must both be declared if either is used
    const usedTrig = code.includes("HC_SR04_TRIG")
    const usedEcho = code.includes("HC_SR04_ECHO")
    if (usedTrig && !code.includes("const int HC_SR04_TRIG")) {
        errors.push("Used 'HC_SR04_TRIG' but it is never declared.")
    }
    if (usedEcho && !code.includes("const int HC_SR04_ECHO")) {
        errors.push("Used 'HC_SR04_ECHO' but it is never declared.")
    }

    // 5. Blynk credentials must be declared if Blynk is used
    if (code.includes("Blynk.begin(") && !code.includes("char auth[]")) {
        errors.push("Blynk.begin() called but 'char auth[]' credential is missing.")
    }
    if (code.includes("Blynk.run()") && !code.includes("Blynk.begin(")) {
        errors.push("Blynk.run() called but Blynk.begin() was never set up.")
    }

    // 6. LCD object must be declared if lcd.* is used
    if (code.includes("lcd.") && !code.includes("LiquidCrystal_I2C lcd(")) {
        errors.push("lcd.* methods used but 'LiquidCrystal_I2C lcd(...)' object is never declared.")
    }

    // 7. LCD_I2C_ADDR must be declared if used
    if (code.includes("LCD_I2C_ADDR") && !code.includes("const int LCD_I2C_ADDR")) {
        errors.push("Used 'LCD_I2C_ADDR' but it is never declared.")
    }

    if (errors.length > 0) {
        throw new Error(
            `[CodeGenerator] Sketch validation failed:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`
        )
    }
}

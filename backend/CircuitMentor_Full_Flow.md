# CircuitMentor — Complete Tool Flow
Generated: 2026-03-22

---

## What is CircuitMentor?

CircuitMentor is an AI-assisted IoT project builder for students and beginners.
A user types a plain-English idea (e.g., "plant watering system with soil sensor
and water pump") and receives:

  1. A real circuit diagram (interactive, zoomable)
  2. Personalized Arduino / ESP32 code
  3. A step-by-step IoT platform setup guide (Blynk or Telegram)
  4. A full component Bill of Materials (BOM)
  5. Optional: quizzes, wiring explanations, and system logic breakdowns

Zero hardware knowledge required to get started.

---

## High-Level Flow Overview

```
User types an idea
       │
       ▼
[1] HERO SEARCH SCREEN
       │
       ▼
[2] PROJECT INTAKE WIZARD  (3 questions → MCU recommendation)
       │
       ├─ Non-IoT project ──────────────────────────────────────────────┐
       │                                                                 │
       └─ IoT project ──────────────────────────────────────────────────┤
              │                                                          │
              ▼                                                          │
       [3] IoT REVEAL SCREEN                                            │
              │                                                          │
              ▼                                                          │
       [4] PLATFORM SELECTION                                           │
              │                                                          │
              ├─ Telegram ──► [5a] TELEGRAM SETUP GUIDE (5 steps)      │
              │                        │                                 │
              ├─ Blynk ────► [5b] BLYNK SETUP GUIDE (7 steps)         │
              │                        │                                 │
              └─ Other ────────────────┘                                │
                       │                                                 │
                       ▼                                                 │
              [6] MODE SELECTOR ◄──────────────────────────────────────┘
                       │
                       ├─ Quick Build ─────────────► [7a] GENERATING SCREEN
                       │                                      │
                       │                              [8a] RESULT WORKSPACE
                       │                           (circuit + code + BOM)
                       │
                       └─ Learning Mode ──────────► [7b] IDEA EXPLANATION
                                                         │
                                                    [8b] COMPONENT SELECTION
                                                         │
                                                    [9b] COMPONENT TEACHING
                                                         │
                                                    [10b] SYSTEM LOGIC VIEW
                                                         │
                                                    [11b] CODE REVIEW
                                                         │
                                                    [12b] GENERATING SCREEN
                                                         │
                                                    [13b] COMPLETED WORKSPACE
```

---

## Detailed Step-by-Step Flow

---

### SCREEN 1 — Hero Search Section
**File:** [src/components/HeroSearchSection.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/HeroSearchSection.tsx)
**State trigger:** Default landing page

- User sees a full-screen hero with a search input
- They type their project idea in plain English
  - Example: "I want a smart plant watering system"
  - Example: "Motion detector with buzzer and LED alarm"
- On Submit:
  - [input](file:///c:/Anti-gravity/CircuitMentor/backend/local_circuit_engine.py#195-197) state is set in [page.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx)
  - `showIntakeWizard` is set to `true`
  - The backend API is called in the background (`api.generateCircuit`)
    to start fetching the concept, but the user is NOT blocked waiting for it

---

### SCREEN 2 — Project Intake Wizard
**File:** [src/components/ProjectIntakeWizard.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ProjectIntakeWizard.tsx)
**State trigger:** `showIntakeWizard === true`

A 3-question multiple-choice wizard. Questions:

  Q1: "Where will you use this project?" → lab / home / outdoor
  Q2: "Do you want to control or monitor it from your phone?"
        → yes (IoT) / no (standalone) / not sure
  Q3: "What's your experience level?" → beginner / some experience / advanced

After the last question (300ms → 0ms instant transition):
  - An MCU Reveal screen is shown
  - Recommended MCU is calculated:
    - If "yes" or "unsure" to phone control → ESP32
    - If "no" → Arduino Uno
    - ESP32 keywords in the original idea also override to ESP32
  - User clicks "Got it — Let's Build!"
  - `onComplete(intakeAnswers)` fires → back to [page.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx)

**MCU Reveal screen** shows:
  - ESP32 or Arduino Uno recommendation
  - Key specs (WiFi, voltage, RAM, etc.)
  - A brief explanation of why this MCU was chosen

**Guard added:** `if (!currentStep && !showMCUReveal) return null`
  prevents a crash when `step` briefly goes out of bounds
  during the 0ms transition to the MCU reveal screen.

---

### SCREEN 3 — IoT Reveal
**File:** [src/components/IoTReveal.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/IoTReveal.tsx)
**State trigger:** `showIoTReveal === true` (if project is IoT)
**Condition:** Only shown when `intakeAnswers.remoteControl !== 'no'`

- Explains what IoT means in simple terms
- Shows ESP32's role (WiFi, Blynk, Telegram)
- User clicks "Continue" → triggers `showIoTReveal = false`
  and opens Platform Selection

---

### SCREEN 4 — IoT Platform Selection
**File:** [src/components/IoTPlatformSelection.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/IoTPlatformSelection.tsx)
**State trigger:** `isIoT === true` (from store) OR `showIoTReveal` is done

Displays platform cards — currently:
  - **Blynk** — dashboard app, virtual pins, realtime charts
  - **Telegram** — chat bot, text commands, instant alerts
  - (Other platforms: MQTT, Firebase — future)

On selection → [handlePlatformSelect(platformId)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#253-274) in [page.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx):

```
if (platformId includes "telegram"):
    if concept is null → run extractConceptFromPrompt(input) locally
    setShowTelegramGuide(true)

else if (platformId is Blynk OR recommendedMCU is ESP32):
    setShowBlynkGuide(true)

else:
    setShowModeSelector(true)
```

---

### SCREEN 5a — Telegram Setup Guide
**File:** [src/components/TelegramSetupGuide.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/TelegramSetupGuide.tsx)
**State trigger:** `showTelegramGuide === true`

A 5-step interactive guide:

  Step 1 — Create a bot with BotFather
  Step 2 — Save your API Token
  Step 3 — Find your Chat ID (via @RawDataBot)
  Step 4 — Upload Personalized Code  ← DYNAMIC
  Step 5 — Chat with your hardware

**Step 4 is fully dynamic:**
- Calls [buildTelegramCode(components, projectIdea)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/telegramCodeBuilder.ts#466-683)
  from [src/lib/telegramCodeBuilder.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/telegramCodeBuilder.ts)
- Receives the actual component registry keys:
  e.g. `["Sensor_DHT11", "Actuator_Relay_5V"]`
- Generates a complete, compilable [.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) file with:
  - Correct GPIO pin numbers (auto-assigned, collision-free)
  - `/status` handler that reads every sensor
  - Command handlers (`/ledon`, `/relayoff`, `/beep`, etc.)
  - WiFi reconnect loop
  - `client.setInsecure()` for SSL (fixes newer ESP32 core errors)
  - Boot-safe "System Online" message after WiFi connects
  - Unique variable names per sensor (prevents C++ redeclaration errors)

On complete → [handleTelegramGuideComplete()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#282-286):
  - `setShowTelegramGuide(false)`
  - `setShowModeSelector(true)`

---

### SCREEN 5b — Blynk Setup Guide
**File:** [src/components/BlynkSetupGuide.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/BlynkSetupGuide.tsx)
**State trigger:** `showBlynkGuide === true`

A 7-step interactive guide:

  Step 1 — Create Blynk account at blynk.cloud
  Step 2 — Create a Template (ESP32, WiFi)
  Step 3 — Add Datastreams (virtual pins V0, V1...)
  Step 4 — Build your Dashboard (Gauge, Button, SuperChart widgets)
  Step 5 — Get Auth Token & Credentials (3 values)
  Step 6 — Upload Personalized Code  ← DYNAMIC
  Step 7 — Test your connection

**Step 6 is fully dynamic:**
- Calls [buildBlynkCode(components, projectIdea)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#500-661)
  from [src/lib/blynkCodeBuilder.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts)
- Generates a complete [.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) with:
  - Virtual pin assignments per component (V0, V1, V2…)
  - DHT11 gets 2 virtual pins (temp + humidity)
  - Sensors push data via `Blynk.virtualWrite()` on a 2s timer
  - Actuators receive via `BLYNK_WRITE(Vx)` handlers
  - `Blynk.logEvent()` for automatic push notifications
    (gas alert, soil dry, flame detected, motion, rain)
  - ADC averaging (10 samples) for stable analog readings
  - [buildBlynkDatastreamGuide()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#478-499) also exports the V-pin map
    as a comment block at the top of the code

On complete → [handleBlynkGuideComplete()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#275-280):
  - `setShowBlynkGuide(false)`
  - `setShowModeSelector(true)`

---

### SCREEN 6 — Mode Selector
**File:** [src/components/ModeSelector.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ModeSelector.tsx)
**State trigger:** `showModeSelector === true`

User picks how they want to proceed:

  **Quick Build** — "Just show me the circuit and code now"
  **Learning Mode** — "Walk me through it step by step"

---

### PATH A — Quick Build

#### SCREEN 7a — Generating Screen
**File:** [src/components/GeneratingScreen.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/GeneratingScreen.tsx)
**State trigger:** `appMode === 'quick'` after mode selection

Animated loading screen while the system:
  1. Waits for the backend API response (if not yet returned)
  2. Runs [buildCircuitGraph(concept)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/wiringRulesEngine.ts#193-493) via [wiringRulesEngine.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/wiringRulesEngine.ts)
  3. Generates the BOM from `selectedComponents`
  4. Loads the static Arduino code from [generated_iot_code.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino)
     (backend serves this file — Groq never writes code)

#### SCREEN 8a — Result Workspace
**File:** [src/components/ResultWorkspaceLayout.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ResultWorkspaceLayout.tsx)
**State trigger:** `uiPhase === 'RESULT'`

Three-panel layout:
  - **Left panel:** Component BOM (Bill of Materials) table
    - Component name, quantity, specs, purpose, buy info
  - **Center panel:** Interactive Circuit Canvas (ReactFlow)
    - Nodes: MCU, sensors, actuators, power rails, resistors
    - Edges: power (red), ground (grey), signal (blue), PWM (purple), data (green)
    - Auto-layout by [wiringRulesEngine.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/wiringRulesEngine.ts)
  - **Right panel:** Arduino code viewer with copy button

---

### PATH B — Learning Mode

#### SCREEN 7b — Idea Explanation Panel
**File:** [src/components/ProjectExplanationPanel.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ProjectExplanationPanel.tsx)
**State trigger:** `uiPhase === 'IDEA_EXPLANATION'`

- Shows what the system understood from the user's prompt
- Explains the project goal in simple language
- Lists detected components and why each is needed
- User clicks "Got it" → [handleIdeaExplained()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#289-297)
  - Pre-selects recommended registry keys from [concept](file:///c:/Anti-gravity/CircuitMentor/backend/main.py#146-164)
  - Dispatches `IDEA_EXPLAINED` phase

#### SCREEN 8b — Component Selection Panel
**File:** [src/components/ComponentSelectionPanel.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ComponentSelectionPanel.tsx)
**State trigger:** `uiPhase === 'COMPONENT_SELECTION'`

- Shows all detected + recommended components
- User can add/remove components from the list
- Each component card shows: name, icon, purpose, price range
- User clicks "Confirm" → [handleComponentsConfirmed(components)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#298-303)
  - Saves final `selectedComponents[]` to store
  - Dispatches `COMPONENTS_CONFIRMED` phase

#### SCREEN 9b — Component Teaching Panel
**File:** [src/components/ComponentTeachingPanel.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/ComponentTeachingPanel.tsx)
**State trigger:** `uiPhase === 'COMPONENT_TEACHING'`

- Walks through each selected component one by one
- For each: what it is, how it works, practical tips, pin explanation
- Includes a short quiz for each component (QuizPanel)
- User clicks "Next" until all components are covered
- Dispatches `TEACHING_COMPLETE` phase

#### SCREEN 10b — System Logic Panel
**File:** [src/components/SystemLogicPanel.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/SystemLogicPanel.tsx)
**State trigger:** `uiPhase === 'SYSTEM_LOGIC'`

- Shows the system logic flow (inputs → processing → outputs)
- Generated by [generateSystemLogic(concept, selectedComponents)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/api/client.ts#31-32)
- Visual diagram + explanation of how the components work together
- Dispatches `LOGIC_REVIEWED` phase

#### SCREEN 11b — Code Review Panel
**File:** [src/components/CodeReviewPanel.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/CodeReviewPanel.tsx)
**State trigger:** `uiPhase === 'CODE_REVIEW'`

- Shows the Arduino code with syntax highlighting
- Explains what each key section does
- User can ask questions (chat feature)
- Dispatches `CODE_REVIEWED` phase

#### SCREEN 12b — Generating Screen
Same as 7a — animated loading while building the final circuit graph.

#### SCREEN 13b — Completed Workspace
**File:** [src/components/CompletedWorkspaceLayout.tsx](file:///c:/Anti-gravity/CircuitMentor/frontend/src/components/CompletedWorkspaceLayout.tsx)
**State trigger:** `uiPhase === 'COMPLETE'`

Same as 8a (Result Workspace) but with learning-mode context:
  - Summary of what was learned
  - BOM + Circuit Canvas + Code
  - "Build it!" CTA

---

## Core Logic Modules

---

### conceptExtractor.ts
**Path:** [src/logic/conceptExtractor.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/conceptExtractor.ts)
**Called:** On prompt submit AND as a local fallback when Telegram is selected

Takes a raw text prompt → returns `{ inputs[], logic[], outputs[] }`

Pipeline:
  1. Normalize: lowercase, strip punctuation, collapse whitespace
  2. Match keywords against SENSOR_KEYWORDS, INPUT_KEYWORDS,
     ACTUATOR_KEYWORDS, DISPLAY_KEYWORDS
  3. Detect MCU type from MCU_KEYWORDS (esp32, wifi, telegram, blynk…)
  4. Apply defaults:
     - Empty prompt → PIR + LED
     - Only inputs, no outputs → add LED
     - Only outputs, no inputs → keep as-is (e.g. "arduino with oled")

Word-boundary matching prevents 'led' matching inside 'oled'.

Component key examples:
  - "temperature" → Sensor_DHT11
  - "motion" → Sensor_PIR
  - "relay" → Actuator_Relay_5V
  - "servo" → Actuator_Servo_SG90
  - "oled" → Display_OLED_SSD1306

---

### wiringRulesEngine.ts
**Path:** [src/logic/wiringRulesEngine.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/wiringRulesEngine.ts)
**Called:** After concept is confirmed, before circuit renders

Takes `concept { inputs[], logic[], outputs[] }` →
Returns `CircuitGraph { nodes[], edges[], errors[], warnings[] }`

Pipeline:
  1. Detect MCU (ESP32 vs Arduino Uno from `concept.logic[0]`)
  2. Create MCU node + VCC/GND power rail nodes
  3. For each input/sensor:
     - Assign GPIO pin (digital / analog / I2C pool)
     - Create node with x/y position (left column)
     - Create edges: signal wire + power wire + ground wire
  4. For each output/actuator:
     - Assign GPIO pin (digital / PWM / I2C pool)
     - Auto-insert helper node (e.g. 220Ω resistor for LED)
     - Create node with x/y position (right column)
     - Create edges: signal wire + power wire + ground wire
  5. Handle I2C (shared SDA/SCL bus for LCD/OLED)
  6. Validate (e.g. LED without resistor → push to errors[])

Pin pools ensure no two components share a GPIO.
All layout coordinates are deterministic (no randomness).

---

### telegramCodeBuilder.ts
**Path:** [src/lib/telegramCodeBuilder.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/telegramCodeBuilder.ts)
**Called:** Inside TelegramSetupGuide Step 4

Takes `components: string[], projectIdea: string` →
Returns a complete [.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) file as a string

Pipeline:
  1. Filter out MCU_ keys
  2. [assignPins()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#421-454) — collision-free GPIO assignment
     (prefers default pins, falls back to ADC1-only analog pool for WiFi safety)
  3. Collect library requirements, global declarations, setup code
  4. Build `/status` handler blocks (one per sensor, unique variable names)
  5. Build command handler blocks (per actuator: `/ledon`, `/relayon`, etc.)
  6. Build `/start` welcome message with full command list
  7. Assemble final .ino with SSL fix, WiFi reconnect, boot-safe message

---

### blynkCodeBuilder.ts
**Path:** [src/lib/blynkCodeBuilder.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts)
**Called:** Inside BlynkSetupGuide Step 6

Takes `components: string[], projectIdea: string` →
Returns a complete [.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) file as a string

Pipeline:
  1. Filter out MCU_ keys
  2. [assignPins()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#421-454) — same collision-free GPIO assignment as Telegram builder
  3. [assignVirtualPins()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#461-477) — V0, V1, V2… per component
     (DHT11 gets 2: temp on Vn, humidity on Vn+1)
  4. Build `sendSensorData()` function body (all sensor reads + virtualWrite)
  5. Build `BLYNK_WRITE(Vx)` handlers for each actuator
  6. Build `datastreamComment` — a reference block listing all V-pin assignments
  7. Assemble final .ino with `BlynkTimer`, `Blynk.run()`, and `timer.run()`

Also exports [buildBlynkDatastreamGuide(components)](file:///c:/Anti-gravity/CircuitMentor/frontend/src/lib/blynkCodeBuilder.ts#478-499) — returns a
string[] of "V0 → Temperature", "V1 → Humidity" etc. for display in guides.

---

### componentRegistry.ts
**Path:** [src/logic/componentRegistry.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/logic/componentRegistry.ts)

Static registry of all supported components with:
  - Human-readable name
  - Category (sensor / actuator / display / input / MCU)
  - Price range
  - Description/purpose
  - Icon type

Used by: ComponentSelectionPanel, BOM generation, [conceptToRegistryKeys()](file:///c:/Anti-gravity/CircuitMentor/frontend/src/app/page.tsx#57-67)

---

## Data Store (Zustand)
**Path:** [src/store/useProjectStore.ts](file:///c:/Anti-gravity/CircuitMentor/frontend/src/store/useProjectStore.ts)

Global state shared across all screens:

  - [input](file:///c:/Anti-gravity/CircuitMentor/backend/local_circuit_engine.py#195-197) — raw user prompt string
  - [concept](file:///c:/Anti-gravity/CircuitMentor/backend/main.py#146-164) — { inputs[], logic[], outputs[] } from extractor or API
  - `selectedComponents` — final confirmed component registry keys
  - `selectedPlatform` — e.g. "Virtual_Telegram", "Virtual_Blynk"
  - `appMode` — "quick" | "learning"
  - `uiPhase` — current learning mode phase (enum-driven state machine)
  - `arduinoCode` — loaded from backend .ino file
  - `projectExplanation` — AI-generated explanation text
  - `systemLogic` — generated system logic breakdown
  - `isIoT` — boolean flag
  - [platforms](file:///c:/Anti-gravity/CircuitMentor/backend/groq_llm.py#181-204) — available platforms from backend
  - [error](file:///c:/Anti-gravity/CircuitMentor/backend/eil_validator.py#51-59) — last error message

---

## Backend (Python / Flask)
**Path:** [backend/local_circuit_engine.py](file:///c:/Anti-gravity/CircuitMentor/backend/local_circuit_engine.py)

Minimal backend — NOT used for code generation.
Responsibilities:
  - Serve [generated_iot_code.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) (the real Arduino code)
  - Run concept extraction via Groq (if API key present)
  - Serve component/platform metadata from [components.json](file:///c:/Anti-gravity/CircuitMentor/backend/components.json)

**Key rule:** Groq NEVER writes Arduino code.
The [.ino](file:///c:/Anti-gravity/CircuitMentor/backend/generated_iot_code.ino) file is always manually crafted and served as a static file.
Only explanation text and concept metadata come from the LLM.

---

## File Map (Key Files)

```
frontend/src/
├── app/
│   └── page.tsx                    ← Master flow controller (all state + routing)
├── components/
│   ├── HeroSearchSection.tsx       ← Landing / idea input screen
│   ├── ProjectIntakeWizard.tsx     ← 3-question wizard + MCU reveal
│   ├── IoTReveal.tsx               ← IoT concept explainer
│   ├── IoTPlatformSelection.tsx    ← Blynk / Telegram / other picker
│   ├── TelegramSetupGuide.tsx      ← 5-step Telegram bot guide
│   ├── BlynkSetupGuide.tsx         ← 7-step Blynk IoT guide
│   ├── ModeSelector.tsx            ← Quick Build vs Learning Mode
│   ├── GeneratingScreen.tsx        ← Animated loading screen
│   ├── ResultWorkspaceLayout.tsx   ← Quick Build result (circuit+code+BOM)
│   ├── CompletedWorkspaceLayout.tsx← Learning Mode result
│   ├── ProjectExplanationPanel.tsx ← Learning: idea breakdown
│   ├── ComponentSelectionPanel.tsx ← Learning: pick components
│   ├── ComponentTeachingPanel.tsx  ← Learning: teach each component
│   ├── SystemLogicPanel.tsx        ← Learning: how the system works
│   ├── CodeReviewPanel.tsx         ← Learning: code walkthrough
│   ├── QuizPanel.tsx               ← Per-component quiz
│   └── PhaseLayout.tsx             ← Shared layout wrapper
├── logic/
│   ├── conceptExtractor.ts         ← Prompt → {inputs, logic, outputs}
│   ├── wiringRulesEngine.ts        ← Concept → CircuitGraph (nodes + edges)
│   ├── componentRegistry.ts        ← All component metadata
│   └── index.ts                    ← generateSystemLogic()
├── lib/
│   ├── telegramCodeBuilder.ts      ← Components → Telegram .ino
│   └── blynkCodeBuilder.ts         ← Components → Blynk .ino
├── store/
│   └── useProjectStore.ts          ← Zustand global state
└── api/
    └── client.ts                   ← Backend API wrapper

backend/
├── local_circuit_engine.py         ← Flask server
├── generated_iot_code.ino          ← The real Arduino code (manually written)
└── components.json                 ← Component + platform metadata
```

---

## Summary: What Makes This Different

1. **Zero LLM for code** — All Arduino code is either hand-authored or
   generated deterministically by TypeScript builders. No AI hallucinations
   in the code the student uploads to hardware.

2. **Zero LLM for circuit wiring** — wiringRulesEngine is 100% deterministic
   rule-based. Every wire, resistor, and pin assignment follows electrical
   engineering best practices baked into the rules.

3. **Platform-specific, component-specific code** — The Telegram and Blynk
   builders know about every supported sensor and actuator. The code a student
   receives for a "DHT11 + relay" Telegram project is fundamentally different
   from a "soil sensor + pump" Blynk project.

4. **Beginner-safe** — SSL errors fixed (`client.setInsecure()`), ADC noise
   averaged (10 samples), WiFi reconnect built-in, variable names unique per
   sensor to prevent C++ compile errors, boot-safe messaging.

5. **Educational first** — Learning Mode teaches every component before
   showing the circuit. Students understand what they built.

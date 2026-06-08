# CircuitMentor — Complete Tool Flow (Updated Architecture)
Generated: Current Build

---

## What is CircuitMentor?

CircuitMentor is an AI-assisted IoT project builder and learning platform for students and beginners.
A user types a plain-English idea (e.g., "plant watering system with soil sensor and water pump") and receives:

  1. A real circuit diagram (interactive, zoomable via ReactFlow)
  2. Personalized, 100% safe Arduino/ESP32 code (Deterministically generated)
  3. A step-by-step IoT platform setup guide (Blynk or Telegram)
  4. A full component Bill of Materials (BOM)
  5. Optional: AI chat assistant (via Llama-3) that explains the logic behind the circuit like a human teacher.

Zero hardware knowledge required to get started.

---

## High-Level Flow Overview

```text
User types an idea
       │
       ▼
[1] HERO SEARCH SCREEN
       │
       ▼
[2] PROJECT INTAKE WIZARD  (3 questions → MCU recommendation)
       │
       ├─ Non-IoT project ──────────────────────────────────────────────┐
       │                                                                │
       └─ IoT project ──────────────────────────────────────────────────┤
              │                                                         │
              ▼                                                         │
       [3] IoT REVEAL SCREEN                                            │
              │                                                         │
              ▼                                                         │
       [4] PLATFORM SELECTION                                           │
              │                                                         │
              ├─ Telegram ──► [5a] TELEGRAM SETUP GUIDE (5 steps)       │
              │                       │                                 │
              ├─ Blynk ────► [5b] BLYNK SETUP GUIDE (7 steps)           │
              │                       │                                 │
              └─ Other ───────────────┘                                 │
                       │                                                │
                       ▼                                                │
              [6] MODE SELECTOR ◄───────────────────────────────────────┘
                       │
                       ├─ Quick Build ─────────────► [7a] GENERATING SCREEN (Backend Engine Fires)
                       │                                      │
                       │                              [8a] RESULT WORKSPACE
                       │                           (circuit + code + BOM)
                       │
                       └─ Learning Mode ───────────► [7b] COMPONENT SELECTION
                                                          │
                                                     [8b] COMPONENT TEACHING
                                                          │
                                                     [9b] SYSTEM LOGIC VIEW
                                                          │
                                                     [10b] CODE REVIEW & AI EXPLANATION
                                                          │
                                                     [11b] COMPLETED WORKSPACE
```

---

## Detailed Step-by-Step Flow

---

### SCREEN 1 — Hero Search Section
**File:** `src/components/HeroSearchSection.tsx`
**State trigger:** Default landing page

- User sees a full-screen hero with a search input.
- They type their project idea in plain English (e.g., "Motion detector with buzzer alarm").
- On Submit:
  - `showIntakeWizard` is set to `true`.
  - The raw text is held in state.

---

### SCREEN 2 — Project Intake Wizard
**File:** `src/components/ProjectIntakeWizard.tsx`
**State trigger:** `showIntakeWizard === true`

A 3-question multiple-choice wizard.
  Q1: "Where will you use this project?" → lab / home / outdoor
  Q2: "Do you want to control or monitor it from your phone?" → yes (IoT) / no / not sure
  Q3: "What's your experience level?" → beginner / some / advanced

- Recommends MCU (ESP32 for IoT, Arduino Uno for standalone).
- Transitions to MCU Reveal screen. User confirms to continue. 

---

### SCREEN 3 & 4 — IoT Reveal & Platform Selection
**Files:** `src/components/IoTReveal.tsx` & `src/components/IoTPlatformSelection.tsx`
**State trigger:** If IoT selected.

- Explains what IoT means in simple terms.
- User picks IoT Platform: **Blynk** or **Telegram**.
- Depending on the choice, the user is routed to a visual setup guide (`TelegramSetupGuide.tsx` or `BlynkSetupGuide.tsx`).

---

### SCREEN 5 — Mode Selector
**File:** `src/components/ModeSelector.tsx`

User picks how they want to proceed:
  **Quick Build** — "Just show me the circuit and code now."
  **Learning Mode** — "Walk me through it step by step."

---

### THE BACKEND GENERATION PHASE (The "Aha!" Moment)
**Files:** `backend/main.py`, `backend/local_circuit_engine.py`, `backend/eil_validator.py`

Once a mode is selected, the **FastAPI Backend** takes over:
1. **POST to Backend:** The Next.js frontend sends the prompt text to `main.py`.
2. **Deterministic Engine:** `local_circuit_engine.py` scans the string for keywords.
3. **Database Match:** It queries `components.json` to identify voltages, limits, and types.
4. **Safety Check:** It runs the **Electronic Intelligence Layer (EIL)** (`eil_validator.py`) to guarantee no pins short-circuit.
5. **Code Creation:** It assigns safe pins and injects them into the master C++ template (`generated_iot_code.ino`).
6. **Return Package:** The backend returns a 100% safe JSON data package containing the Code, the Pins, and the BOM to the frontend.

---

### PATH A — Quick Build Result Workspace
**File:** `src/components/ResultWorkspaceLayout.tsx`
**Layout Parts:**
- **Left Panel:** Component BOM (Bill of Materials) table.
- **Center Panel (ReactFlow):** The `wiringRulesEngine.ts` calculates precise X, Y coordinates and injects visible safety components (like 220Ω resistors) rendering the wiring.
- **Right Panel:** The fully filled Arduino C++ code editor.

---

### PATH B — Learning Mode Additions
**Files:** `ComponentTeachingPanel.tsx`, `CodeReviewPanel.tsx`, `QuizBank.json`
- The system breaks down the payload component by component.
- The UI runs micro-quizzes against `quiz_bank.json`.
- **AI Explanations (`groq_llm.py`):** If the user clicks "Explain Logic", the Next.js frontend POSTs a request specifically for the AI text. The backend securely contacts Groq (Llama-3.1 8B) and returns relatable teaching analogies, completing the layout workspace.

---

## Core Logic Modules

---

### local_circuit_engine.py (The Deterministic Brain)
**Path:** `backend/local_circuit_engine.py`
Replaces the old AI guessing system. Assigns safe layout logic locally. Checks raw text against pre-coded lists to output `{ inputs[], logic[], outputs[] }` completely offline.

### eil_validator.py (Electronic Intelligence Layer)
**Path:** `backend/eil_validator.py`
The safety firewall. Acts as a gatekeeper that ensures the Engine hasn't mapped conflicting pins (e.g. putting a 20mA LED directly on a 10mA rated GPIO slot).

### wiringRulesEngine.ts (The Auto-Router)
**Path:** `frontend/src/logic/wiringRulesEngine.ts`
Takes the strict JSON rules from the Backend and physically draws the ReactFlow graph. Automatically calculates power rails (VCC/GND), inserts series resistors, and prevents line overlaps.

### groq_llm.py (The AI Teacher)
**Path:** `backend/groq_llm.py`
Strictly isolated from building hardware. Only queries the Llama-3.1 model when the user directly asks for a "Learning Mode Concept Analogy", avoiding AI hallucinations in critical path code.

---

## Data Store (Zustand)
**Path:** `src/store/useProjectStore.ts`
Global state shared across screens without prop-drilling:
  - `input` — raw user prompt string.
  - `appMode` — "quick" | "learning".
  - `uiPhase` — determines which layout to render next.
  - `arduinoCode` — the fetched C++ code from the backend.

---

## File Map (Key Files)

```text
frontend/src/
├── app/
│   └── page.tsx                    ← Master flow controller (Next.js server/client root)
├── components/
│   ├── HeroSearchSection.tsx       ← Landing / idea input screen
│   ├── ProjectIntakeWizard.tsx     ← 3-question wizard + MCU reveal
│   ├── IoTReveal.tsx               ← IoT concept explainer
│   ├── ModeSelector.tsx            ← Quick Build vs Learning Mode
│   ├── ResultWorkspaceLayout.tsx   ← Final rendered result (circuit+code+BOM)
│   ├── ComponentTeachingPanel.tsx  ← Learning mode quizzes
│   └── CodeReviewPanel.tsx         ← Code viewing + LLM ask button
├── logic/
│   └── wiringRulesEngine.ts        ← Calculates UI node coordinates for ReactFlow
└── store/
    └── useProjectStore.ts          ← Zustand global state

backend/
├── main.py                         ← FastAPI Server (Gateway)
├── local_circuit_engine.py         ← Deterministic parser and mapper
├── eil_validator.py                ← Safety checks and pin validator
├── generated_iot_code.ino          ← The safe Arduino template (Never written by AI)
├── components.json                 ← Hardware database parameters
└── groq_llm.py                     ← Llama-3 API caller for chat explanations
```

---

## Summary: What Makes This Architecture Win

1. **Zero LLM for Code & Wiring:** All Arduino code and visual layouts map to `components.json` via the Deterministic Engine. There are zero hallucinations in the physical connections.
2. **EIL Safety Firewall:** The `eil_validator` guarantees it works safely before it's ever drawn on screen, matching strict voltage rules.
3. **Instantly Fast:** Bypassing Groq for the main build drops the wait time from 20s to <10ms.
4. **Relatable Teaching:** Groq's Llama 3 is explicitly constrained in `groq_llm.py` to act solely as a patient tutor, avoiding generating garbage software code.

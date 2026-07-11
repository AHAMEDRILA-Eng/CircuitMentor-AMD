# Adding New Components to CircuitMentor

This guide acts as a developer checklist to ensure that adding new hardware components to CircuitMentor is done correctly across all layers (electrical database, detection engine, safety validator, and frontend visual rendering).

---

## New Component Checklist

**Component Name:** _____________________

### Step 1: `components.json`
*Path:* `backend/components.json`
- [ ] Voltage, current, and signal type defined for the component.

### Step 2: `local_circuit_engine.py`
*Path:* `backend/local_circuit_engine.py`
- [ ] Keywords added to `COMPONENT_KEYWORDS` (long phrases / multi-word only).
- [ ] Short/ambiguous keywords (e.g. 3-4 letter words like `fan`, `mic`, `gas`, `temp`) placed in `BOUNDARY_KEYWORDS` instead to enforce whole-word boundary matching and prevent substring collisions.
- [ ] `COMPONENT_SIGNAL_TYPE` entry added (e.g., `digital_input`, `analog_input`, `digital_output`, `pwm_output`, `i2c`, or `digital_dual`).
- [ ] `COMPONENT_PIN_NAMES` entry added defining the key/value pairs for the component's logical pins (e.g. `signal`, `vcc`, `gnd`).
- [ ] `NEEDS_VCC` set updated if the component requires a VCC power connection.
- [ ] `COMPONENT_LIBRARIES` entry added if it requires specific Arduino library headers (e.g., `#include <DHT.h>`).

### Step 3: `eil_validator.py`
*Path:* `backend/eil_validator.py`
- [ ] If the component uses non-standard pin names (e.g., `COIL1`/`COIL2` for relays, `1.L`/`2.L` for buttons, `POS`/`NEG` for buzzers, `V+`/`PWM` for servos, `IN1`/`IN2` for motor drivers, `A`/`C` for LEDs), map them to their canonical roles (`VCC`, `GND`, `SIG`) inside `PIN_ALIASES` at the top of the file to prevent false-positive EIL safety blocks.

### Step 4: `componentDefs.ts`
*Path:* `frontend/src/logic/componentDefs.ts`
- [ ] Pin IDs defined in the component's visual definition.
- [ ] Visual Pin IDs must **exactly match** the pin IDs used in `wiringRulesEngine.ts` (`sigPin`, `gndPin`, `vccPin`).
- [ ] `imageUrl` or Wokwi tag set correctly.
- [ ] Visual bounds (`renderW` and `renderH`) defined correctly.

### Step 5: `wiringRulesEngine.ts`
*Path:* `frontend/src/logic/wiringRulesEngine.ts`
- [ ] Wiring rule added for the new component.
- [ ] `sigPin`, `gndPin`, and `vccPin` match `componentDefs.ts` pin IDs exactly.
- [ ] `signalType` matches the backend `COMPONENT_SIGNAL_TYPE` definition (e.g. `DIGITAL`, `ANALOG`, `I2C`, `PWM`).

### Step 6: `componentRegistry.ts`
*Path:* `frontend/src/logic/componentRegistry.ts`
- [ ] Entry added for quiz and teaching panels to ensure the component is recognized by the tutoring and quiz flows.

---

## Verification Checklist

- [ ] **Circuit Generation**: Generate a circuit with this component. Verify that wires connect to the correct physical pins on the canvas and that ReactFlow anchors them cleanly.
- [ ] **EIL Safety**: Verify that the EIL safety validator runs and does not flag any false positives (like floating ground or GPIO overload) for standard connections.
- [ ] **Quiz Generation**: Verify that the quiz engine correctly generates relevant questions for the component (validate local bank fallback and LLM-generated questions).

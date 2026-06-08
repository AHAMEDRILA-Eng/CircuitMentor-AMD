import json
from local_circuit_engine import detect_components, build_circuit, generate_code
from eil_validator import EILValidator

# 1. The Idea
idea = "Smart Dustbin with ultrasonic sensor and servo motor"
print(f"--- TESTING IDEA: {idea} ---")

# 2. Detect Components
concept = detect_components(idea)
print("\n[1] CONCEPT DETECTED:")
print(json.dumps(concept, indent=2))

# 3. Build Circuit (Wiring & Pins)
circuit = build_circuit(concept)
print("\n[2] CIRCUIT WIRING & PINS:")
print(json.dumps(circuit, indent=2))

# 4. Safety Validation (EIL)
validator = EILValidator()
eil_result = validator.validate_circuit(circuit)
print("\n[3] SAFETY CHECK (EIL):")
print(json.dumps(eil_result, indent=2))

# 5. Code Generation
code = generate_code(
    components=circuit.get("components", []),
    mcu=circuit.get("mcu", "MCU_Arduino_Uno"),
    pin_assignments=circuit.get("pin_assignments", {}),
    idea=idea
)
print("\n[4] GENERATED ARDUINO CODE:")
print(code)

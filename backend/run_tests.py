"""
CircuitMentor QA Test Runner
Tests all 5 pipeline scenarios for correctness against real-world knowledge.
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from local_circuit_engine import detect_components, build_circuit, generate_code
from eil_validator import EILValidator

validator = EILValidator()

test_cases = [
    ("LED blink with button on Arduino", "arduino", ""),
    ("temperature sensor DHT11 with LCD display", "arduino", ""),
    ("ultrasonic distance sensor with buzzer ESP32", "esp32", ""),
    ("soil moisture sensor water pump irrigation", "arduino", ""),
    ("PIR motion detector LED alarm", "arduino", ""),
    ("DC motor fan speed control with ESP32", "esp32", ""),
    ("gas smoke sensor MQ2 buzzer relay alert", "arduino", ""),
    ("servo motor position control with button", "arduino", ""),
]

results = []

for idea, platform, mcu_override in test_cases:
    print(f"\n{'='*60}")
    print(f"TEST: {idea}")
    print(f"{'='*60}")
    
    concept = detect_components(idea)
    wc = build_circuit(concept)
    eil = validator.validate_circuit(wc)
    code = generate_code(wc["components"], wc["mcu"], wc["pin_assignments"], idea, platform)
    
    # Check connections for conflicts (same pin assigned twice)
    all_mcu_pins = []
    for conn in wc.get("connections", []):
        frm = conn.get("from", "")
        if frm.startswith("MCU_"):
            pin = frm.split(".")[-1]
            all_mcu_pins.append(pin)
    
    dup_pins = [p for p in all_mcu_pins if all_mcu_pins.count(p) > 1]
    unique_dup = list(set(dup_pins))
    
    has_setup = "void setup()" in code
    has_loop = "void loop()" in code
    has_pin_mode = "pinMode(" in code
    
    # Count pin defines
    pin_defines = [l for l in code.splitlines() if l.strip().startswith("const int")]
    
    result = {
        "idea": idea,
        "platform": platform,
        "detected_inputs": concept.get("inputs", []),
        "detected_outputs": concept.get("outputs", []),
        "mcu": wc["mcu"],
        "all_components": wc["components"],
        "connections_count": len(wc.get("connections", [])),
        "duplicate_pins": unique_dup,
        "eil_status": eil["status"],
        "eil_errors": [e["code"] for e in eil.get("errors", [])],
        "eil_warnings": [w["code"] for w in eil.get("warnings", [])],
        "code_lines": len(code.splitlines()),
        "has_setup": has_setup,
        "has_loop": has_loop,
        "has_pin_mode": has_pin_mode,
        "pin_defines": pin_defines,
        "hardware_warnings": wc.get("warnings", []),
    }
    results.append(result)
    
    print(f"  Inputs:       {concept.get('inputs', [])}")
    print(f"  Outputs:      {concept.get('outputs', [])}")
    print(f"  MCU:          {wc['mcu']}")
    print(f"  All comps:    {wc['components']}")
    print(f"  Connections:  {len(wc.get('connections', []))}")
    print(f"  DUPLICATE PINS: {unique_dup if unique_dup else 'NONE'}")
    print(f"  EIL status:   {eil['status']}")
    print(f"  EIL errors:   {[e['code'] for e in eil.get('errors', [])]}")
    print(f"  EIL warnings: {[w['code'] for w in eil.get('warnings', [])]}")
    print(f"  Code lines:   {len(code.splitlines())}")
    print(f"  Has setup():  {has_setup}")
    print(f"  Has loop():   {has_loop}")
    print(f"  Has pinMode:  {has_pin_mode}")
    print(f"  Pin defines:  {pin_defines}")
    if wc.get("warnings"):
        print(f"  HW warnings:  {wc['warnings']}")

# Save results
out_path = os.path.join(os.path.dirname(__file__), "test_results.json")
with open(out_path, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n\nResults saved to {out_path}")
print(f"\nSUMMARY: {len([r for r in results if r['eil_status']=='OK'])} OK, "
      f"{len([r for r in results if r['eil_status']=='WARNING'])} WARNING, "
      f"{len([r for r in results if r['eil_status']=='ERROR'])} ERROR out of {len(results)} tests")

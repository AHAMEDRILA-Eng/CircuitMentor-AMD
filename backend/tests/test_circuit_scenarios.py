import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from local_circuit_engine import detect_components, build_circuit, generate_code
from eil_validator import EILValidator

validator = EILValidator()

SCENARIOS = [
    ("LED blink with button on Arduino", "arduino"),
    ("temperature sensor DHT11 with LCD display", "arduino"),
    ("ultrasonic distance sensor with buzzer ESP32", "esp32"),
    ("soil moisture sensor water pump irrigation", "arduino"),
    ("PIR motion detector LED alarm", "arduino"),
    ("DC motor fan speed control with ESP32", "esp32"),
    ("gas smoke sensor MQ2 buzzer relay alert", "arduino"),
    ("servo motor position control with button", "arduino"),
]

@pytest.mark.parametrize("idea, platform", SCENARIOS)
def test_scenario_circuit_and_code_generation(idea, platform):
    # 1. Detect components
    concept = detect_components(idea)
    
    # 2. Build circuit
    wc = build_circuit(concept)
    assert wc is not None
    assert "components" in wc
    assert "mcu" in wc
    
    # 3. Validate circuit
    eil = validator.validate_circuit(wc)
    assert eil["status"] != "ERROR", f"Scenario '{idea}' failed EIL validation: {eil.get('errors')}"
    
    # 4. Check for duplicate pin assignments (GPIO only)
    all_mcu_pins = []
    for conn in wc.get("connections", []):
        frm = conn.get("from", "")
        if frm.startswith("MCU_"):
            pin = frm.split(".")[-1]
            if pin.upper() not in ["5V", "3V3", "3.3V", "GND", "VIN", "EN", "RESET"]:
                all_mcu_pins.append(pin)
    
    dup_pins = [p for p in all_mcu_pins if all_mcu_pins.count(p) > 1]
    assert len(dup_pins) == 0, f"Duplicate MCU pin assignments found in scenario '{idea}': {set(dup_pins)}"
    
    # 5. Generate code and check sanity
    code = generate_code(wc["components"], wc["mcu"], wc["pin_assignments"], idea, platform)
    assert "void setup()" in code
    assert "void loop()" in code

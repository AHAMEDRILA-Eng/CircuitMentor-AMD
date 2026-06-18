import sys
import os

# Insert backend directory in path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from local_circuit_engine import COMPONENT_PIN_NAMES
from eil_validator import resolve_pin_name

def test_component_pin_names_consistency():
    # Loop through all components and their pin configurations
    for comp_id, pins in COMPONENT_PIN_NAMES.items():
        # Check VCC pin consistency
        if "vcc" in pins:
            vcc_pin = pins["vcc"]
            resolved_vcc = resolve_pin_name(vcc_pin)
            assert resolved_vcc in ["VCC", "VIN", "POWER", "5V", "3V3"], \
                f"Component {comp_id} has vcc pin '{vcc_pin}' resolving to '{resolved_vcc}' which is not a valid VCC role"
        
        # Check GND pin consistency
        if "gnd" in pins:
            gnd_pin = pins["gnd"]
            resolved_gnd = resolve_pin_name(gnd_pin)
            # Allow K (cathode) for LED which might be handled as a special case, but ideally we resolve it to GND
            assert resolved_gnd in ["GND", "K"], \
                f"Component {comp_id} has gnd pin '{gnd_pin}' resolving to '{resolved_gnd}' which is not a valid GND role"

        # Check signal / I2C / sensor pins do not conflict with power/ground roles
        for role, pin_name in pins.items():
            if role not in ["vcc", "gnd"]:
                # Special case: IN2 for DC motor can resolve to GND under H-bridge rules, but acts as signal in bidirectional mode
                if comp_id == "Actuator_DC_Motor" and role == "in2":
                    continue
                resolved_role = resolve_pin_name(pin_name)
                assert resolved_role not in ["VCC", "GND"], \
                    f"Component {comp_id} has non-power role '{role}' mapped to pin '{pin_name}' resolving to '{resolved_role}'"

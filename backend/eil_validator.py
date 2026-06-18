import json
import os

# ── Pin Alias Resolution ─────────────────────────────────────────────────────
# Maps non-standard component pin names to their canonical electrical role.
# This prevents false positives (e.g. COMPONENT_FLOATING_GROUND for relay
# COIL2, button 2.L, buzzer NEG) when the validator scans connection nets.
PIN_ALIASES = {
    # Relay coil pins
    'COIL1': 'VCC',
    'COIL2': 'GND',
    # Button pins
    '1.L': 'SIG',
    '2.L': 'GND',
    '1.R': 'SIG',
    '2.R': 'GND',
    # Buzzer
    'POS': 'SIG',
    'NEG': 'GND',
    # Servo
    'V+': 'VCC',
    'PWM': 'SIG',
    # Motor driver
    'IN1': 'SIG',
    'IN2': 'GND',
    # LED
    'A': 'SIG',
    'C': 'GND',
    # Transistor
    'E': 'GND',
    'B': 'SIG',
}

def resolve_pin_name(pin: str) -> str:
    """Resolve a component-specific pin name to its canonical role (VCC/GND/SIG)."""
    return PIN_ALIASES.get(pin.upper(), pin.upper())


class EILValidator:
    def __init__(self, components_path="components.json"):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(script_dir, components_path)
        with open(path, "r") as f:
            self.components_db = json.load(f)
            
    def validate_circuit(self, circuit_proposal):
        """
        Production-ready Electronics Intelligence Layer (EIL).
        Flow: Sanity -> Integrity -> Power & Thermal -> Connections.
        """
        self.errors = []
        self.warnings = []
        
        mcu_id = circuit_proposal.get("mcu")
        self.mcu_id = mcu_id
        self.mcu_data = self.components_db.get(mcu_id)
        
        if not self.mcu_data:
            return {"status": "ERROR", "errors": [{"code": "UNKNOWN_MCU", "technical": "MCU not in library", "explanation": "We don't know the pins for this controller.", "fix": "Choose a supported MCU like Arduino or ESP32."}]}

        selected_ids = circuit_proposal.get("components", [])
        connections = circuit_proposal.get("connections", [])
        power_sources = circuit_proposal.get("power_sources", [])

        # 1. Project Sanity
        self._check_project_sanity(selected_ids, power_sources)
        
        # 2. Electrical Integrity (Common Ground & MCU Ground)
        self._check_electrical_integrity(selected_ids, connections, mcu_id)
        
        # 3. Power & Thermal Audit (Regulator & Battery discharge)
        self._check_power_and_thermal(selected_ids, power_sources)
        
        # 4. Connection Specific Rules (Bidirectional Voltage, GPIO Power, Floating Inputs)
        self._check_connections(selected_ids, connections, mcu_id)

        # 5. Smart Safety (Resistors, Flyback Diodes, Transistor drivers)
        self._check_smart_safety(selected_ids, connections)

        if self.errors:
            return {"status": "ERROR", "errors": self.errors, "warnings": self.warnings}
        elif self.warnings:
            return {"status": "WARNING", "warnings": self.warnings, "message": "Circuit is valid but has warnings."}
        else:
            return {"status": "OK", "message": "Circuit validation passed."}

    def _add_error(self, code, technical, explanation, fix):
        if not any(e['code'] == code and e['technical'] == technical for e in self.errors):
            self.errors.append({
                "code": code,
                "technical": technical,
                "explanation": explanation,
                "fix": fix
            })

    def _add_warning(self, code, technical, explanation, fix):
        if not any(w['code'] == code and w['technical'] == technical for w in self.warnings):
            self.warnings.append({
                "code": code,
                "technical": technical,
                "explanation": explanation,
                "fix": fix
            })

    def _check_project_sanity(self, selected_ids, power_sources):
        if not power_sources:
             self._add_error("MISSING_POWER", "No power source in netlist.", 
                             "Your circuit has no power to run.", "Add a 9V Battery or a USB power block.")
        
        has_actuator = any(self.components_db.get(cid, {}).get("type") in ["actuator", "display"] for cid in selected_ids)
        if not has_actuator:
            self._add_warning("NO_OUTPUT", "Circuit has no output component.", 
                              "The project doesn't 'do' anything visible yet.", "Add an LED, Buzzer, or Display.")

    def _check_electrical_integrity(self, selected_ids, connections, mcu_id):
        # Robust Ground Check: Treat all non-passive components + MCU as ground-required
        gnd_connected = set()
        gnd_nodes = set()
        for conn in connections:
            for n in [conn.get("from", ""), conn.get("to", "")]:
                u = n.upper()
                # Check raw pin name AND resolved alias for GND detection
                pin_part = n.split(".", 1)[1] if "." in n else n
                resolved = resolve_pin_name(pin_part)
                if ".GND" in u or ".CATHODE" in u or ".VSS" in u or u == "GND" or resolved == "GND":
                    gnd_nodes.add(n)
                    if "." in n:
                        gnd_connected.add(n.split(".")[0])
        
        for conn in connections:
            f, t = conn.get("from", ""), conn.get("to", "")
            # Also resolve aliases when checking if a node is a GND node
            f_pin = f.split(".", 1)[1] if "." in f else f
            t_pin = t.split(".", 1)[1] if "." in t else t
            f_resolved = resolve_pin_name(f_pin)
            t_resolved = resolve_pin_name(t_pin)
            if (f in gnd_nodes or t in gnd_nodes or f.upper() == "GND" or t.upper() == "GND"
                    or f_resolved == "GND" or t_resolved == "GND"):
                if "." in f: gnd_connected.add(f.split(".")[0])
                if "." in t: gnd_connected.add(t.split(".")[0])
        
        # Check MCU GND
        if mcu_id not in gnd_connected:
             self._add_error("MCU_FLOATING_GROUND", f"{mcu_id} GND is disconnected.",
                             "The brain of your project needs a ground connection to work.",
                             f"Connect the GND pin of {mcu_id} to the common ground rail.")

        # Check other active components
        for cid in selected_ids:
            comp_data = self.components_db.get(cid, {})
            # Non-passive components need GND. 
            # Exclude power sources and Virtual IoT services.
            if comp_data.get("type") not in ["passive", "none", None, "power_source"] and not cid.startswith("Virtual_"):
                # Special cases for 2-terminal components that don't have a pin named "GND"
                if cid.startswith("Sensor_LDR") or cid.startswith("Actuator_LED"):
                    # These are typically grounded via specific pins (Cathode or Resistive terminal)
                    # For LDR, ground check is complex; for MVP, if it has any connection to GND nodes, we pass it.
                    if cid not in gnd_connected:
                         self._add_error("COMPONENT_FLOATING_GROUND", f"{cid} is missing a ground path.",
                                        f"The {comp_data.get('ui', {}).get('name', cid)} needs a path to ground.",
                                        f"Connect the low side of {cid} to the common ground rail.")
                elif cid not in gnd_connected:
                    self._add_error("COMPONENT_FLOATING_GROUND", f"{cid} GND pin is disconnected.",
                                    f"The {comp_data.get('ui', {}).get('name', cid)} needs a ground path to complete its circuit.",
                                    f"Connect {cid}.GND to the common ground rail shared with the MCU.")

    def _check_power_and_thermal(self, selected_ids, power_sources):
        total_current = self.mcu_data.get("peak_current_wifi", 80)
        
        for cid in selected_ids:
            comp = self.components_db.get(cid, {})
            ctype = comp.get("type")
            
            if ctype == "actuator":
                total_current += comp.get("running_current", comp.get("current_active", comp.get("current_max", 20)))
            elif ctype == "display":
                # Split logic and backlight if available to avoid double-counting
                if "backlight_current_mA" in comp:
                    total_current += comp["backlight_current_mA"]
                    total_current += comp.get("logic_current_mA", 2)
                else:
                    total_current += comp.get("current_max", 20)
            else:
                total_current += comp.get("current_active", comp.get("current_max", 5))

        # Power regulator thermal load
        for cid in selected_ids:
            comp = self.components_db.get(cid, {})
            if comp.get("type") == "power_regulator":
                if total_current > comp.get("thermal_limit_mA", 500):
                    self._add_warning("REGULATOR_HEAT", f"{cid} load is {total_current}mA.",
                                      "This regulator is working hard and might get hot.",
                                      "Reduce the number of LEDs or use a more efficient Buck Converter module.")
        
        if "Power_9V_Battery" in power_sources:
            limit = self.components_db.get("Power_9V_Battery", {}).get("max_discharge_mA", 150)
            if total_current > limit:
                self._add_error("BATTERY_STRAIN", f"Continuous draw {total_current}mA exceeds 9V battery limit.",
                                "A 9V battery cannot supply this much continuous current stably.",
                                "Consider using a 5V USB power supply or a Li-ion battery pack.")

    def _check_connections(self, selected_ids, connections, mcu_id):
        mcu_max_v = self.mcu_data.get("pin_max_voltage", 3.3)
        mcu_safe_i = self.mcu_data.get("max_pin_current", 12)
        mcu_has_pullups = self.mcu_data.get("has_internal_pullups", False)
        
        has_external_resistor = any("Resistor" in cid for cid in selected_ids)

        for conn in connections:
            f_node, t_node = conn.get("from", ""), conn.get("to", "")
            if "." not in f_node or "." not in t_node: continue
            
            f_comp, f_pin = f_node.split(".", 1)
            t_comp, t_pin = t_node.split(".", 1)

            # -------------------------------------------------------------
            # ✅ Rule: Virtual IoT Service Bypass
            # -------------------------------------------------------------
            if f_comp.startswith("Virtual_") or t_comp.startswith("Virtual_"):
                continue
            
            f_data = self.components_db.get(f_comp, {})
            t_data = self.components_db.get(t_comp, {})

            # -------------------------------------------------------------
            # ✅ Rule: Bidirectional Voltage Safety
            # -------------------------------------------------------------
            f_out_v = self._resolve_voltage(f_data, "output", f_pin)
            t_in_max_v = t_data.get("pin_max_voltage", max(t_data.get("voltage_range", [0, 5.0])))

            if f_out_v and t_in_max_v and f_out_v > t_in_max_v:
                # ── HC-SR04 ECHO → ESP32: downgrade to warning (Bug 8 fix) ──────
                # The ECHO pin outputs 5 V, exceeding the ESP32's 3.3 V GPIO limit.
                # Instead of a hard circuit-blocking error, emit a directed warning
                # so the user still gets a usable circuit with a clear remediation note.
                is_hcsr04_echo_to_esp32 = (
                    mcu_id == "MCU_ESP32"
                    and "HC_SR04" in f_comp
                    and "ECHO" in f_pin.upper()
                )
                if is_hcsr04_echo_to_esp32:
                    self._add_warning(
                        "HC_SR04_ESP32_5V_ECHO",
                        "HC-SR04 ECHO pin outputs 5 V but ESP32 GPIO is rated for 3.3 V max.",
                        "Directly connecting ECHO to an ESP32 GPIO can permanently damage the pin.",
                        "Add a 1 kΩ + 2 kΩ voltage divider on the ECHO line to drop it to ~3.3 V."
                    )
                else:
                    self._add_error("VOLTAGE_MISMATCH", f"{f_comp} ({f_out_v}V) connected to {t_comp} ({t_in_max_v}V max).",
                                    f"Feeding {f_out_v}V into a {t_in_max_v}V pin will cause irreversible damage.",
                                    "Use a voltage divider or logic level shifter to match the signal levels.")


            # Under-voltage / Power Mismatch
            # Resolve custom pin names to canonical roles before VCC/power checks
            t_pin_resolved = resolve_pin_name(t_pin)
            f_pin_resolved = resolve_pin_name(f_pin)

            if t_pin_resolved in ["VCC", "VIN", "POWER", "5V"]:
                t_req_v = t_data.get("voltage_in", min(t_data.get("voltage_range", [0, 5.0])))
                if f_out_v and f_out_v < t_req_v:
                    self._add_error("UNDER_VOLTAGE", f"{t_comp} needs {t_req_v}V but is powered by {f_out_v}V.",
                                    f"The {t_comp} requires at least {t_req_v}V to operate properly.",
                                    f"Connect {t_comp}'s power pin to a {t_req_v}V source instead.")

            # Reverse direction safety check
            r_out_v = self._resolve_voltage(t_data, "output", t_pin)
            r_in_max_v = f_data.get("pin_max_voltage", max(f_data.get("voltage_range", [0, 5.0])))
            if r_out_v and r_in_max_v and r_out_v > r_in_max_v:
                self._add_error("VOLTAGE_MISMATCH", f"{t_comp} ({r_out_v}V) connected to {f_comp} ({r_in_max_v}V max).",
                                "Voltage level mismatch in this connection can damage components.",
                                "Add a voltage divider or level shifter to bridge these modules safely.")

            # -------------------------------------------------------------
            # ✅ Rule: GPIO Overcurrent (Safety fix: Only check Power pins)
            # -------------------------------------------------------------
            if f_comp == mcu_id and f_pin.upper() not in ["5V", "3V3", "3.3V", "VIN"] and t_pin_resolved in ["VCC", "5V", "VIN", "POWER"]:
                load_i = t_data.get("stall_current_max", t_data.get("current_max", 0))
                if load_i > mcu_safe_i and not t_data.get("is_driver_module", False):
                     self._add_error("GPIO_OVERLOAD", f"MCU pin {f_pin} used as power for {t_comp}.",
                                     "GPIO pins are meant for signals, not for powering motors or high-current modules.",
                                     "Connect this component's power pin directly to the main power rail.")

            # -------------------------------------------------------------
            # ✅ Rule: Floating Input Validation
            # -------------------------------------------------------------
            if t_data.get("is_floating_sensitive") and f_comp == mcu_id:
                # Safer check: ignore if the target pin itself is the 'source' (output) for that module
                # This prevents false warnings on feedback or signal pins that aren't actually inputs.
                if t_data.get("pin_metadata", {}).get(t_pin, {}).get("direction") == "output":
                    continue
                    
                if not has_external_resistor and not mcu_has_pullups:
                     self._add_warning("FLOATING_INPUT", f"{t_comp}.{t_pin} is sensitive to electrical noise.",
                                       "Without a pull-up or pull-down resistor, this pin might give random readings.",
                                       "Add a 10k resistor to the circuit or enable internal pull-ups in your code.")

    def _check_smart_safety(self, selected_ids, connections):
        # Determine presence of basic safety parts globally
        has_resistor = any("Resistor" in cid for cid in selected_ids)
        has_diode = any("Diode" in cid for cid in selected_ids)
        has_transistor = any("Transistor" in cid for cid in selected_ids)
        has_driver_board = any("Driver" in cid for cid in selected_ids)

        for cid in selected_ids:
            comp_data = self.components_db.get(cid, {})
            c_name = comp_data.get("ui", {}).get("name", "").lower()
            c_type = comp_data.get("type", "").lower()

            # Rule 1: LEDs generally need resistors
            if "led" in cid.lower() or "led" in c_name:
                # Only check if it's a standalone passive/actuator LED, not a module that might have one built-in
                if c_type == "actuator" and not has_resistor:
                    self._add_error("MISSING_CURRENT_LIMIT_RESISTOR", 
                                    f"{cid} needs a current-limiting resistor.", 
                                    "LEDs will burn out (and potentially damage the MCU) if connected directly to power or GPIO pins without limitation.",
                                    "Add a Basic_Resistor (e.g., 220 ohm or 330 ohm) in series with the LED.")
            
            # Rule 2: Motors, Relays, Fans, Pumps usually need a transistor + flyback diode (or a dedicated driver module)
            requires_driver_by_db = comp_data.get("requires_driver", False)
            if requires_driver_by_db or "motor" in cid.lower() or "relay" in cid.lower() or "pump" in cid.lower() or "fan" in cid.lower():
                if "relay" in cid.lower():
                    continue  # Relay modules have built-in protection
                if not has_driver_board and (not has_transistor or not has_diode):
                    self._add_error("MISSING_MOTOR_PROTECTION", 
                                    f"{cid} requires a transistor (or motor driver) and a flyback diode.", 
                                    "Inductive loads like motors and relays pull too much current for GPIO pins and generate high-voltage back-EMF spikes when turning off, which can destroy your MCU.",
                                    "Add a Basic_Transistor_NPN (driver) and a Basic_Diode (flyback protection), or use a dedicated Driver module like L298N.")
            
            # Rule 3: Push buttons may benefit from a pull resistor
            if "button" in cid.lower() or "switch" in cid.lower():
                if not has_resistor:
                    self._add_warning("MISSING_PULL_RESISTOR", 
                                      f"{cid} might need a pull-up or pull-down resistor.", 
                                      "Buttons without a defined logical state will 'float' when not pressed, causing random false readings.",
                                      "Add a Basic_Resistor (like 10k ohm) or ensure internal MCU pull-ups are enabled via software.")

        # Check for ESP32 and HC-SR04 voltage conflict
        is_esp32 = self.mcu_id == "MCU_ESP32"
        if is_esp32 and any("HC_SR04" in cid for cid in selected_ids):
            self._add_warning("HC_SR04_ESP32_5V_WARNING",
                              "HC-SR04 ECHO outputs 5V — use a voltage divider (1kΩ + 2kΩ) to protect ESP32 3.3V GPIO",
                              "HC-SR04 ECHO outputs 5V — use a voltage divider (1kΩ + 2kΩ) to protect ESP32 3.3V GPIO",
                              "Use a voltage divider (1kΩ + 2kΩ) on the ECHO line to step down the signal to 3.3V.")

    def _resolve_voltage(self, comp_data, mode, pin_name=None):
        if pin_name:
            pn = pin_name.upper()
            if pn in ["3.3V", "3V3"]: return 3.3
            if pn == "5V": return 5.0
            if pn == "VIN": return 5.0 # simplifies logic for now, MCU VIN often provides 5V+ if powered
            comp_name = comp_data.get("ui", {}).get("name", "")
            if "HC-SR04" in comp_name or "HC_SR04" in comp_name:
                if pn != "ECHO":
                    return None

        # Resolve "VCC" strings or list ranges to a single comparative value
        val = comp_data.get("echo_voltage", comp_data.get("output_voltage")) if mode == "output" else None
        if isinstance(val, str) and val.upper() == "VCC":
            v_in = comp_data.get("voltage_in")
            if v_in: return v_in
            v_range = comp_data.get("voltage_range")
            if v_range: return max(v_range)
            return 5.0 # Default fallback
        if isinstance(val, list): return max(val)
        if isinstance(val, (int, float)): return val
        return None

if __name__ == "__main__":
    v = EILValidator()
    # Production test case
    test = {
        "mcu": "MCU_ESP32",
        "power_sources": ["Power_9V_Battery"],
        "components": ["Sensor_HC_SR04", "Display_LCD_16x2"],
        "connections": [
            {"from": "Sensor_HC_SR04.ECHO", "to": "MCU_ESP32.18"}, # Error: 5V into 3.3V
            {"from": "MCU_ESP32.VIN", "to": "Display_LCD_16x2.VCC"} # Warning/Error: Power via GPIO
        ]
    }
    print("[EIL PRODUCTION DEBUG]")
    print(json.dumps(v.validate_circuit(test), indent=2))

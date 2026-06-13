import os
import re
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    GEMINI_API_KEY = GEMINI_API_KEY.strip()
    genai.configure(api_key=GEMINI_API_KEY)

# Dedicated Code Generation API Keys
CODEGEN_GEMINI_API_KEY = os.getenv("CODEGEN_GEMINI_API_KEY")
if CODEGEN_GEMINI_API_KEY:
    CODEGEN_GEMINI_API_KEY = CODEGEN_GEMINI_API_KEY.strip()

# Tier 1.5 (Flash) can use a separate key to avoid shared quota exhaustion
# Falls back to the Pro key if no separate Flash key is configured
CODEGEN_GEMINI_FLASH_KEY = os.getenv("CODEGEN_GEMINI_FLASH_KEY", CODEGEN_GEMINI_API_KEY)
if CODEGEN_GEMINI_FLASH_KEY:
    CODEGEN_GEMINI_FLASH_KEY = CODEGEN_GEMINI_FLASH_KEY.strip()

CODEGEN_GROQ_API_KEY = os.getenv("CODEGEN_GROQ_API_KEY")
if CODEGEN_GROQ_API_KEY:
    CODEGEN_GROQ_API_KEY = CODEGEN_GROQ_API_KEY.strip()


# ============================================================
# CircuitMentor — Local Circuit Engine v2
# Dynamic Pin Allocator + Conflict-Free Wiring
# ============================================================

# ── Component Keyword Detection ──────────────────────────────
COMPONENT_KEYWORDS = {
    # Sensors
    "pir":          "Sensor_PIR",
    "motion":       "Sensor_PIR",
    "movement":     "Sensor_PIR",
    "dht11":        "Sensor_DHT11",
    "dht22":        "Sensor_DHT11",
    "temperature":  "Sensor_DHT11",
    "humidity":     "Sensor_DHT11",
    "temp":         "Sensor_DHT11",
    "lm35":         "Sensor_Temperature_LM35",
    "ldr":          "Sensor_LDR",
    "light sensor": "Sensor_LDR",
    "ultrasonic":   "Sensor_HC_SR04",
    "distance":     "Sensor_HC_SR04",
    "sonar":        "Sensor_HC_SR04",
    "soil":         "Sensor_Soil_Moisture",
    "moisture":     "Sensor_Soil_Moisture",
    "plant":        "Sensor_Soil_Moisture",
    "irrigation":   "Sensor_Soil_Moisture",
    "rain":         "Sensor_Rain",
    "raindrop":     "Sensor_Rain",
    "gas":          "Sensor_MQ2_Gas",
    "smoke":        "Sensor_MQ2_Gas",
    "mq2":          "Sensor_MQ2_Gas",
    "flame":        "Sensor_Flame",
    "fire":         "Sensor_Flame",
    "sound sensor": "Sensor_Sound",
    "clap":         "Sensor_Sound",
    "microphone":   "Sensor_Sound",
    "obstacle":     "Sensor_IR_Obstacle",
    "infrared":     "Sensor_IR_Obstacle",
    # Heart rate / pulse — mapped to DHT11 as placeholder (no MAX30102 def yet)
    "heart rate":   "Sensor_DHT11",
    "heartbeat":    "Sensor_DHT11",
    "pulse":        "Sensor_DHT11",
    "bpm":          "Sensor_DHT11",
    "oximeter":     "Sensor_DHT11",
    # Inputs
    "button":       "Input_Button",
    "push button":  "Input_Button",
    "switch":       "Input_Button",
    "press":        "Input_Button",
    # Actuators
    "buzzer":       "Actuator_Buzzer",
    "alarm":        "Actuator_Buzzer",
    "beep":         "Actuator_Buzzer",
    "relay":        "Actuator_Relay_5V",
    "servo":        "Actuator_Servo_SG90",
    "dc motor":     "Actuator_DC_Motor",
    "motor":        "Actuator_DC_Motor",
    "pump":         "Actuator_Water_Pump",
    "water pump":   "Actuator_Water_Pump",
    # NOTE: "fan" and "mic" use word-boundary matching (see BOUNDARY_KEYWORDS below)
    # Displays
    "oled":         "Display_OLED_SSD1306",
    "ssd1306":      "Display_OLED_SSD1306",
    "lcd":          "Display_LCD_16x2",
    "16x2":         "Display_LCD_16x2",
    "7 segment":    "Display_7Segment",
    "7seg":         "Display_7Segment",
}

# NOTE: "led" is handled separately (word-boundary) to avoid matching "oled"
LED_KEYWORDS = ["led", "blink", "indicator", "lamp", "glow", "light up"]

# Short ambiguous keywords that require whole-word matching to avoid false positives
# e.g. "fan" would match "fantastic"; "mic" would match "microseconds"
BOUNDARY_KEYWORDS = {
    "fan": "Actuator_Fan",
    "mic": "Sensor_Sound",
}

# ── MCU Keywords ─────────────────────────────────────────────
IOT_KEYWORDS = ["esp32", "esp 32", "esp32s", "esp8266", "esp 8266", "wifi", "wi-fi",
                "bluetooth", "telegram", "blynk", "iot", "internet", "cloud",
                "remote", "nodemcu", "node mcu", "mqtt"]

# ── Component Signal Type Database ───────────────────────────
# Tells the allocator what type of pin each component needs
COMPONENT_SIGNAL_TYPE = {
    "Sensor_PIR":               "digital_input",
    "Sensor_DHT11":             "digital_input",
    "Sensor_Temperature_LM35":  "analog_input",
    "Sensor_LDR":               "analog_input",
    "Sensor_HC_SR04":           "digital_dual",   # needs TRIG + ECHO (2 pins)
    "Sensor_Soil_Moisture":     "analog_input",
    "Sensor_Rain":              "analog_input",
    "Sensor_MQ2_Gas":           "analog_input",
    "Sensor_Flame":             "digital_input",
    "Sensor_Sound":             "digital_input",
    "Sensor_IR_Obstacle":       "digital_input",
    "Input_Button":             "digital_input",
    "Actuator_LED":             "digital_output",
    "Actuator_Buzzer":          "digital_output",
    "Actuator_Relay_5V":        "digital_output",
    "Actuator_Servo_SG90":      "pwm_output",
    "Actuator_DC_Motor":        "digital_dual",   # needs IN1 + IN2
    "Actuator_Water_Pump":      "digital_output",
    "Actuator_Fan":             "digital_output",
    "Display_OLED_SSD1306":     "i2c",            # uses A4(SDA) + A5(SCL)
    "Display_LCD_16x2":         "i2c",
    "Display_7Segment":         "digital_output",
}

# ── Component Pin Name Config ─────────────────────────────────
COMPONENT_PIN_NAMES = {
    "Sensor_PIR":               {"signal": "OUT",  "vcc": "VCC", "gnd": "GND"},
    "Sensor_DHT11":             {"signal": "DATA", "vcc": "VCC", "gnd": "GND"},
    "Sensor_Temperature_LM35":  {"signal": "OUT",  "vcc": "VCC", "gnd": "GND"},
    "Sensor_LDR":               {"signal": "AO",   "vcc": "VCC", "gnd": "GND"},
    "Sensor_HC_SR04":           {"trig": "TRIG", "echo": "ECHO", "vcc": "VCC", "gnd": "GND"},
    "Sensor_Soil_Moisture":     {"signal": "AO",   "vcc": "VCC", "gnd": "GND"},
    "Sensor_Rain":              {"signal": "AO",   "vcc": "VCC", "gnd": "GND"},
    "Sensor_MQ2_Gas":           {"signal": "AO",   "vcc": "VCC", "gnd": "GND"},
    "Sensor_Flame":             {"signal": "OUT",  "vcc": "VCC", "gnd": "GND"},
    "Sensor_Sound":             {"signal": "OUT",  "vcc": "VCC", "gnd": "GND"},
    "Sensor_IR_Obstacle":       {"signal": "OUT",  "vcc": "VCC", "gnd": "GND"},
    "Input_Button":             {"signal": "SIG",  "gnd": "GND"},
    "Actuator_LED":             {"signal": "A",    "gnd": "K"},
    "Actuator_Buzzer":          {"signal": "SIG",  "gnd": "GND"},
    "Actuator_Relay_5V":        {"signal": "SIG",  "vcc": "VCC", "gnd": "GND"},
    "Actuator_Servo_SG90":      {"signal": "SIG",  "vcc": "VCC", "gnd": "GND"},
    "Actuator_DC_Motor":        {"in1": "IN1",     "in2": "IN2"},
    "Actuator_Water_Pump":      {"signal": "SIG",  "gnd": "GND"},
    "Actuator_Fan":             {"signal": "SIG",  "gnd": "GND"},
    "Display_OLED_SSD1306":     {"sda": "SDA", "scl": "SCL", "vcc": "VCC", "gnd": "GND"},
    "Display_LCD_16x2":         {"sda": "SDA", "scl": "SCL", "vcc": "VCC", "gnd": "GND"},
    "Display_7Segment":         {"signal": "DIN",  "vcc": "VCC", "gnd": "GND"},
}

# ── Component Library Requirements ───────────────────────────
COMPONENT_LIBRARIES = {
    "Sensor_DHT11":             ["#include <DHT.h>"],
    "Display_OLED_SSD1306":     ["#include <Wire.h>", "#include <Adafruit_GFX.h>", "#include <Adafruit_SSD1306.h>"],
    "Display_LCD_16x2":         ["#include <Wire.h>", "#include <LiquidCrystal_I2C.h>"],
    "Actuator_Servo_SG90":      ["#include <Servo.h>"],
    "Display_7Segment":         ["#include <SevSeg.h>"],
}

# ── Needs VCC? ────────────────────────────────────────────────
NEEDS_VCC = {
    "Sensor_PIR", "Sensor_DHT11", "Sensor_Temperature_LM35", "Sensor_LDR",
    "Sensor_HC_SR04", "Sensor_Soil_Moisture", "Sensor_Rain", "Sensor_MQ2_Gas",
    "Sensor_Flame", "Sensor_Sound", "Sensor_IR_Obstacle",
    "Actuator_Relay_5V", "Actuator_Servo_SG90",
    "Display_OLED_SSD1306", "Display_LCD_16x2",
}


# ============================================================
# Pin Allocator
# ============================================================

class PinAllocator:
    def __init__(self, mcu: str, has_i2c: bool):
        self.mcu = mcu
        self.has_i2c = has_i2c
        
        if mcu == "MCU_ESP32":
            # ESP32 pin pools
            self._digital_inputs  = [4, 5, 14, 15, 16, 17, 18, 19]
            self._digital_outputs = [2, 12, 13, 25, 26, 27, 32, 33]
            self._pwm_outputs     = [2, 4, 5, 12, 13, 14, 15, 25, 26, 27, 32, 33]
            self._analog_inputs   = [34, 35, 36, 39]  # 32, 33 removed — they're in _digital_outputs
            # If I2C is used, reserve pins
            self._i2c_sda = 21
            self._i2c_scl = 22
        else:
            # Arduino Uno pin pools
            self._digital_inputs  = [2, 3, 4, 5, 6, 7]
            # Reserve pin 13 (built-in LED) but include as last resort
            self._digital_outputs = [8, 9, 10, 11, 12, 13]
            self._pwm_outputs     = [3, 5, 6, 9, 10, 11]
            self._analog_inputs   = ['A0', 'A1', 'A2', 'A3']
            # If I2C is used, A4/A5 are RESERVED. Remove from analog pool.
            if has_i2c:
                self._analog_inputs = ['A0', 'A1', 'A2', 'A3']  # A4/A5 reserved
            self._i2c_sda = 'A4'
            self._i2c_scl = 'A5'
        
        self._used = set()

    def _claim(self, pool: list):
        for pin in pool:
            if pin not in self._used:
                self._used.add(pin)
                return pin
        return None  # All pins in pool exhausted

    def get_digital_input(self):
        return self._claim(self._digital_inputs)

    def get_digital_output(self):
        return self._claim(self._digital_outputs)

    def get_pwm_output(self):
        return self._claim(self._pwm_outputs)

    def get_analog_input(self):
        return self._claim(self._analog_inputs)
    
    def get_i2c(self):
        """Returns (SDA, SCL). These are always the same fixed pins."""
        return self._i2c_sda, self._i2c_scl


# ============================================================
# Component Detection
# ============================================================

def _has_word_led(text: str) -> bool:
    """Check for 'led' as a standalone word (not 'oled')."""
    import re
    return bool(re.search(r'(?<![a-z])led(?![a-z])', text))

def detect_components(prompt: str) -> dict:
    """
    Parse the user's prompt into concept blocks.
    Returns: { inputs: [...], logic: [MCU], outputs: [...] }
    """
    found = []
    p = prompt.lower()

    # Check LED carefully (word boundary)
    if _has_word_led(p):
        if "Actuator_LED" not in found:
            found.append("Actuator_LED")

    # Check short ambiguous keywords with word-boundary matching
    for kw, component in BOUNDARY_KEYWORDS.items():
        if re.search(r'\b' + re.escape(kw) + r'\b', p) and component not in found:
            found.append(component)

    # Check all other keywords (multi-word first, then single)
    multi_word = {k: v for k, v in COMPONENT_KEYWORDS.items() if ' ' in k}
    single_word = {k: v for k, v in COMPONENT_KEYWORDS.items() if ' ' not in k}

    for k, v in multi_word.items():
        if k in p and v not in found:
            found.append(v)

    for k, v in single_word.items():
        if k in p and v not in found:
            found.append(v)

    # MCU selection
    is_iot = any(kw in p for kw in IOT_KEYWORDS)
    mcu = "MCU_ESP32" if is_iot else "MCU_Arduino_Uno"

    inputs  = [c for c in found if c.startswith("Sensor_") or c.startswith("Input_")]
    outputs = [c for c in found if c.startswith("Actuator_") or c.startswith("Display_")]

    # Default: if nothing detected, show a basic LED
    if not inputs and not outputs:
        outputs.append("Actuator_LED")

    return {
        "inputs":  inputs,
        "logic":   [mcu],
        "outputs": outputs
    }


# ============================================================
# Circuit Builder (Dynamic, Conflict-Free)
# ============================================================

def build_circuit(concept: dict) -> dict:
    """
    Build a validated, conflict-free circuit from the concept.
    Uses a PinAllocator so no two components share the same pin.
    """
    mcu = concept.get("logic", ["MCU_Arduino_Uno"])[0]
    components = concept.get("inputs", []) + concept.get("outputs", [])

    # Check if I2C displays are present (reserves A4/A5)
    has_i2c = any(
        c in ("Display_OLED_SSD1306", "Display_LCD_16x2") for c in components
    )

    allocator = PinAllocator(mcu, has_i2c)
    all_components = [mcu] + components

    connections = []
    pin_assignments = {}  # component → { pin_role: pin_number }

    for comp in components:
        sig_type = COMPONENT_SIGNAL_TYPE.get(comp, "digital_input")
        pin_names = COMPONENT_PIN_NAMES.get(comp, {})
        assigned = {}

        if sig_type == "i2c":
            sda, scl = allocator.get_i2c()
            assigned["sda"] = sda
            assigned["scl"] = scl
            connections.append({"from": f"{mcu}.SDA", "to": f"{comp}.{pin_names.get('sda', 'SDA')}"})
            connections.append({"from": f"{mcu}.SCL", "to": f"{comp}.{pin_names.get('scl', 'SCL')}"})

        elif sig_type == "digital_dual":
            if comp == "Sensor_HC_SR04":
                trig = allocator.get_digital_output()
                echo = allocator.get_digital_input()
                assigned["trig"] = trig
                assigned["echo"] = echo
                pin_pfx = "GPIO" if mcu == "MCU_ESP32" else "D"
                connections.append({"from": f"{mcu}.{pin_pfx}{trig}", "to": f"{comp}.TRIG"})
                connections.append({"from": f"{mcu}.{pin_pfx}{echo}", "to": f"{comp}.ECHO"})
            elif comp == "Actuator_DC_Motor":
                in1 = allocator.get_digital_output()
                in2 = allocator.get_digital_output()
                assigned["in1"] = in1
                assigned["in2"] = in2
                pin_pfx = "GPIO" if mcu == "MCU_ESP32" else "D"
                connections.append({"from": f"{mcu}.{pin_pfx}{in1}", "to": f"{comp}.IN1"})
                connections.append({"from": f"{mcu}.{pin_pfx}{in2}", "to": f"{comp}.IN2"})

        elif sig_type == "analog_input":
            pin = allocator.get_analog_input()
            sig_pin_name = pin_names.get("signal", "AO")
            assigned["signal"] = pin
            pin_str = str(pin)
            connections.append({"from": f"{mcu}.{pin_str}", "to": f"{comp}.{sig_pin_name}"})

        elif sig_type == "pwm_output":
            pin = allocator.get_pwm_output()
            sig_pin_name = pin_names.get("signal", "SIG")
            assigned["signal"] = pin
            pin_pfx = "GPIO" if mcu == "MCU_ESP32" else "D"
            connections.append({"from": f"{mcu}.{pin_pfx}{pin}", "to": f"{comp}.{sig_pin_name}"})

        elif sig_type == "digital_input":
            pin = allocator.get_digital_input()
            sig_pin_name = pin_names.get("signal", "OUT")
            assigned["signal"] = pin
            pin_pfx = "GPIO" if mcu == "MCU_ESP32" else "D"
            connections.append({"from": f"{mcu}.{pin_pfx}{pin}", "to": f"{comp}.{sig_pin_name}"})

        elif sig_type == "digital_output":
            pin = allocator.get_digital_output()
            assigned["signal"] = pin
            pin_pfx = "GPIO" if mcu == "MCU_ESP32" else "D"
            if comp == "Actuator_LED":
                # Inject a resistor naturally into the circuit for the LED
                if "Basic_Resistor" not in all_components:
                    all_components.append("Basic_Resistor")
                connections.append({"from": f"{mcu}.{pin_pfx}{pin}", "to": "Basic_Resistor.1"})
                connections.append({"from": "Basic_Resistor.2", "to": "Actuator_LED.A"})
            else:
                sig_pin_name = pin_names.get("signal", "SIG")
                connections.append({"from": f"{mcu}.{pin_pfx}{pin}", "to": f"{comp}.{sig_pin_name}"})

        # Power connections
        if comp in NEEDS_VCC and "vcc" in pin_names:
            connections.append({"from": f"{mcu}.5V" if mcu == "MCU_Arduino_Uno" else f"{mcu}.3V3", "to": f"{comp}.{pin_names['vcc']}"})
        if "gnd" in pin_names:
            connections.append({"from": f"{mcu}.GND", "to": f"{comp}.{pin_names['gnd']}"})

        pin_assignments[comp] = assigned

    return {
        "mcu": mcu,
        "power_sources": [],
        "components": all_components,
        "connections": connections,
        "pin_assignments": pin_assignments   # Pass to code generator
    }


# ============================================================
# Project-Specific Code Generator
# ============================================================

def generate_code_static(components: list, mcu: str, pin_assignments: dict, idea: str = "", platform: str = "") -> str:
    """
    Generate project-specific Arduino/ESP32 code based on
    the detected components and their dynamically assigned pins.
    """
    is_esp32 = mcu == "MCU_ESP32"
    is_blynk = is_esp32 and 'blynk' in platform.lower()
    has_i2c = any(c in ("Display_OLED_SSD1306", "Display_LCD_16x2") for c in components)

    # ── Libraries ────────────────────────────────────────────
    if is_blynk:
        libs = ['#include <Arduino.h>',
                '#include <WiFi.h>',
                '#define BLYNK_TEMPLATE_ID    "YOUR_TEMPLATE_ID"',
                '#define BLYNK_TEMPLATE_NAME  "YOUR_TEMPLATE_NAME"',
                '#define BLYNK_AUTH_TOKEN     "YOUR_AUTH_TOKEN"',
                '#include <BlynkSimpleEsp32.h>']
    elif is_esp32:
        libs = ['#include <Arduino.h>',
                '#include <WiFi.h>']  # Basic WiFi only — no Blynk
    else:
        libs = ['#include <Arduino.h>']

    for comp in components:
        for lib in COMPONENT_LIBRARIES.get(comp, []):
            if lib not in libs:
                libs.append(lib)

    code = "/* ============================================================\n"
    code += f"   CircuitMentor — Generated Code\n"
    code += f"   Project: {idea if idea else 'Custom Circuit'}\n"
    code += f"   MCU: {'ESP32 DevKit V1' if is_esp32 else 'Arduino Uno'}\n"
    code += "   ============================================================ */\n\n"
    code += "\n".join(libs) + "\n\n"

    # ── WiFi credentials (ESP32 only) ─────────────────────────
    if is_esp32:
        code += "/* --- WiFi Credentials (replace with yours) --- */\n"
        code += 'char ssid[] = "YOUR_WIFI_SSID";\n'
        code += 'char pass[] = "YOUR_WIFI_PASSWORD";\n\n'

    # ── Pin definitions ───────────────────────────────────────
    code += "/* --- Pin Definitions --- */\n"
    for comp in components:
        if comp in pin_assignments:
            pins = pin_assignments[comp]
            comp_short = comp.split("_")[-1].upper()
            if comp.startswith("Sensor_HC_SR04"):
                code += f"const int HC_SR04_TRIG = {pins.get('trig', 9)};\n"
                code += f"const int HC_SR04_ECHO = {pins.get('echo', 10)};\n"
            elif comp == "Actuator_DC_Motor":
                code += f"const int MOTOR_IN1 = {pins.get('in1', 12)};\n"
                code += f"const int MOTOR_IN2 = {pins.get('in2', 11)};\n"
            elif "sda" in pins:
                sda_pin = pins.get('sda')
                scl_pin = pins.get('scl')
                code += f"// {comp_short}: I2C → SDA=GPIO{sda_pin}, SCL=GPIO{scl_pin}\n" if is_esp32 else f"// {comp_short}: I2C → SDA=A{sda_pin}, SCL=A{scl_pin}\n"
            else:
                pin_val = pins.get("signal", "?")
                prefix = "GPIO" if is_esp32 else ""
                # Handle analog pins which are strings like 'A0'
                if isinstance(pin_val, str) and pin_val.startswith('A'):
                    code += f"const int {comp_short}_PIN = {pin_val};\n"
                else:
                    code += f"const int {comp_short}_PIN = {prefix}{pin_val};\n"

    # ── Display / Object globals ──────────────────────────────
    code += "\n"
    if "Display_OLED_SSD1306" in components:
        code += "#define SCREEN_WIDTH 128\n#define SCREEN_HEIGHT 64\n"
        code += "Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);\n"
    if "Display_LCD_16x2" in components:
        code += "LiquidCrystal_I2C lcd(0x27, 16, 2);\n"
    if "Sensor_DHT11" in components:
        dht_pin = pin_assignments.get("Sensor_DHT11", {}).get("signal", 4)
        code += f"DHT dht({dht_pin}, DHT11);\n"
    if "Actuator_Servo_SG90" in components:
        code += "Servo myServo;\n"

    # ── Setup ─────────────────────────────────────────────────
    code += "\nvoid setup() {\n"
    code += "  Serial.begin(115200);\n\n"

    if is_blynk:
        code += "  // Connect to WiFi + Blynk\n"
        code += "  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);\n\n"
    elif is_esp32:
        code += "  // Connect to WiFi\n"
        code += "  WiFi.begin(ssid, pass);\n"
        code += "  while (WiFi.status() != WL_CONNECTED) { delay(500); }\n\n"

    for comp in components:
        if not comp.startswith("Display_") and comp in pin_assignments:
            pins = pin_assignments[comp]
            comp_short = comp.split("_")[-1].upper()

            if comp == "Sensor_HC_SR04":
                code += f"  pinMode(HC_SR04_TRIG, OUTPUT);\n"
                code += f"  pinMode(HC_SR04_ECHO, INPUT);\n"
            elif comp == "Actuator_DC_Motor":
                code += f"  pinMode(MOTOR_IN1, OUTPUT);\n"
                code += f"  pinMode(MOTOR_IN2, OUTPUT);\n"
            elif comp == "Actuator_Servo_SG90":
                servo_pin = pins.get("signal", 3)
                code += f"  myServo.attach({servo_pin});\n"
                code += f"  myServo.write(0);\n"
            elif comp == "Sensor_DHT11":
                code += f"  dht.begin();\n"
            elif comp == "Input_Button":
                pin_val = pins.get("signal", 2)
                code += f"  pinMode({pin_val}, INPUT_PULLUP); // Button with internal pull-up\n"
            elif comp.startswith("Sensor_"):
                pin_val = pins.get("signal", 2)
                code += f"  pinMode({pin_val}, INPUT);\n"
            elif comp.startswith("Actuator_"):
                pin_val = pins.get("signal", 8)
                code += f"  pinMode({pin_val}, OUTPUT);\n"

    # Display init
    if "Display_OLED_SSD1306" in components:
        code += "  if (oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n"
        code += "    oled.clearDisplay();\n    oled.display();\n  }\n"
    if "Display_LCD_16x2" in components:
        code += "  lcd.init();\n  lcd.backlight();\n"

    code += "  Serial.println(\"System Ready.\");\n"
    code += "}\n\n"

    # ── Helper functions ──────────────────────────────────────
    if "Sensor_HC_SR04" in components:
        code += "float readDistance() {\n"
        code += "  digitalWrite(HC_SR04_TRIG, LOW); delayMicroseconds(2);\n"
        code += "  digitalWrite(HC_SR04_TRIG, HIGH); delayMicroseconds(10);\n"
        code += "  digitalWrite(HC_SR04_TRIG, LOW);\n"
        code += "  long dur = pulseIn(HC_SR04_ECHO, HIGH);\n"
        code += "  return dur * 0.034 / 2.0;\n"
        code += "}\n\n"

    # ── Loop ─────────────────────────────────────────────────
    code += "void loop() {\n"
    if is_blynk:
        code += "  Blynk.run(); // Keep Blynk connection alive\n\n"

    has_output_logic = False

    # Button → LED
    if "Input_Button" in components and "Actuator_LED" in components:
        btn_pin = pin_assignments.get("Input_Button", {}).get("signal", 2)
        led_pin = pin_assignments.get("Actuator_LED", {}).get("signal", 8)
        code += f"  // Button controls LED\n"
        code += f"  int btnState = digitalRead({btn_pin});\n"
        code += f"  digitalWrite({led_pin}, btnState == LOW ? HIGH : LOW);\n"
        has_output_logic = True

    # PIR → LED + Buzzer
    if "Sensor_PIR" in components:
        pir_pin = pin_assignments.get("Sensor_PIR", {}).get("signal", 4)
        code += f"  // PIR Motion Detection\n"
        code += f"  int pirVal = digitalRead({pir_pin});\n"
        if "Actuator_LED" in components and "Input_Button" not in components:
            led_pin = pin_assignments.get("Actuator_LED", {}).get("signal", 8)
            code += f"  digitalWrite({led_pin}, pirVal == HIGH ? HIGH : LOW);\n"
        if "Actuator_Buzzer" in components:
            buz_pin = pin_assignments.get("Actuator_Buzzer", {}).get("signal", 9)
            code += f"  if (pirVal == HIGH) {{ digitalWrite({buz_pin}, HIGH); }} else {{ digitalWrite({buz_pin}, LOW); }}\n"
        has_output_logic = True

    # Soil moisture → Buzzer
    if "Sensor_Soil_Moisture" in components and "Actuator_Buzzer" in components:
        soil_pin = pin_assignments.get("Sensor_Soil_Moisture", {}).get("signal", 'A0')
        buz_pin  = pin_assignments.get("Actuator_Buzzer", {}).get("signal", 8)
        code += f"  // Soil moisture alert\n"
        code += f"  int soilVal = analogRead({soil_pin});\n"
        code += f"  if (soilVal < 400) {{ digitalWrite({buz_pin}, HIGH); }} else {{ digitalWrite({buz_pin}, LOW); }}\n"
        code += f"  Serial.print(\"Soil: \"); Serial.println(soilVal);\n"
        has_output_logic = True

    # Ultrasonic → Serial/Display
    if "Sensor_HC_SR04" in components:
        code += f"  // Ultrasonic distance reading\n"
        code += f"  float dist = readDistance();\n"
        code += f"  Serial.print(\"Distance: \"); Serial.print(dist); Serial.println(\" cm\");\n"
        if "Display_OLED_SSD1306" in components:
            code += f"  oled.clearDisplay();\n"
            code += f"  oled.setCursor(0,0); oled.print(\"Dist: \"); oled.print(dist); oled.println(\"cm\");\n"
            code += f"  oled.display();\n"
        if "Actuator_Buzzer" in components:
            buz_pin = pin_assignments.get("Actuator_Buzzer", {}).get("signal", 8)
            code += f"  if (dist < 20.0) {{ digitalWrite({buz_pin}, HIGH); }} else {{ digitalWrite({buz_pin}, LOW); }}\n"
        has_output_logic = True

    # DHT11 temperature/humidity
    if "Sensor_DHT11" in components:
        code += f"  // DHT11 Temperature & Humidity\n"
        code += f"  float temp = dht.readTemperature();\n"
        code += f"  float hum  = dht.readHumidity();\n"
        code += f"  if (!isnan(temp)) {{\n"
        code += f"    Serial.print(\"Temp: \"); Serial.print(temp); Serial.println(\" C\");\n"
        code += f"    Serial.print(\"Humidity: \"); Serial.print(hum); Serial.println(\" %\");\n"
        if "Display_OLED_SSD1306" in components:
            code += f"    oled.clearDisplay();\n"
            code += f"    oled.setCursor(0,0); oled.print(\"T:\"); oled.print(temp); oled.println(\"C\");\n"
            code += f"    oled.setCursor(0,16); oled.print(\"H:\"); oled.print(hum); oled.println(\"%\");\n"
            code += f"    oled.display();\n"
        code += f"  }}\n"
        has_output_logic = True

    # Flame / Gas → Buzzer
    for sensor, label in [("Sensor_Flame", "Flame"), ("Sensor_MQ2_Gas", "Gas")]:
        if sensor in components and "Actuator_Buzzer" in components:
            pin = pin_assignments.get(sensor, {}).get("signal", 5)
            buz_pin = pin_assignments.get("Actuator_Buzzer", {}).get("signal", 8)
            code += f"  // {label} detection → Buzzer\n"
            code += f"  if (digitalRead({pin}) == HIGH) {{\n"
            code += f"    digitalWrite({buz_pin}, HIGH);\n"
            code += f"    Serial.println(\"{label} Detected!\");\n"
            code += f"  }} else {{ digitalWrite({buz_pin}, LOW); }}\n"
            has_output_logic = True

    # Relay
    if "Actuator_Relay_5V" in components:
        relay_pin = pin_assignments.get("Actuator_Relay_5V", {}).get("signal", 11)
        code += f"  // Relay control (toggle every 5s)\n"
        code += f"  static unsigned long lastToggle = 0;\n"
        code += f"  if (millis() - lastToggle > 5000) {{\n"
        code += f"    lastToggle = millis();\n"
        code += f"    digitalWrite({relay_pin}, !digitalRead({relay_pin}));\n"
        code += f"  }}\n"
        has_output_logic = True

    if not has_output_logic:
        code += "  // TODO: Add your logic here\n"

    code += "\n  delay(100);\n"
    code += "}\n"

    return code

def generate_code(components: list, mcu: str, pin_assignments: dict, idea: str = "", platform: str = "") -> str:
    """
    Generate project-specific Arduino/ESP32 code using a tiered AI strategy:
    1. Groq (llama-3.3-70b-versatile) for high-quality reasoning and coding.
    2. Groq (llama-3.1-8b-instant) as a fast fallback.
    3. Gemini (gemini-2.5-flash) as a secondary API fallback.
    4. Deterministic static generation as the final fallback.
    """
    is_esp32 = (mcu == "MCU_ESP32")

    # ── Human-readable board name ─────────────────────────────────────────
    board_name = (
        "ESP32 DevKit V1 (Xtensa LX6, 3.3V logic, 240MHz, WiFi/BT)"
        if is_esp32 else
        "Arduino Uno R3 (ATmega328P, 5V logic, 16MHz)"
    )

    # ── Decode internal component IDs → human names + rules ──────────────
    comp_name_map = {
        "Sensor_PIR":               "PIR Motion Sensor (HC-SR501) — digital OUT, HIGH=motion detected",
        "Sensor_DHT11":             "DHT11 Temp+Humidity — 1-wire, needs 10kΩ pull-up on DATA, use DHT.h library",
        "Sensor_Temperature_LM35":  "LM35 Analog Temp Sensor — 10mV/°C output, connect to analog pin",
        "Sensor_LDR":               "LDR Light Sensor Module — analog out, LOWER value = MORE light (voltage divider circuit)",
        "Sensor_HC_SR04":           "HC-SR04 Ultrasonic — 5V device. On ESP32 echo pin NEEDS 1kΩ/2kΩ voltage divider. TRIG=OUTPUT ECHO=INPUT",
        "Sensor_Soil_Moisture":     "Soil Moisture Module — analog out, DRY=HIGH (~800 Uno/~3000 ESP32), WET=LOW (~200/~500). Map accordingly",
        "Sensor_Rain":              "Rain Sensor Module — analog out, LOWER value = more rain detected",
        "Sensor_MQ2_Gas":           "MQ-2 Gas/Smoke Sensor — analog AO pin, threshold ~300 ADC units for alarm",
        "Sensor_Flame":             "Flame Sensor — digital out, LOW = flame detected (ACTIVE LOW)",
        "Sensor_Sound":             "Sound Detection Module — digital out, HIGH = sound above threshold",
        "Sensor_IR_Obstacle":       "IR Obstacle Sensor — digital out, LOW = obstacle detected (ACTIVE LOW)",
        "Input_Button":             "Tactile Button — use INPUT_PULLUP mode, reads LOW when pressed",
        "Actuator_LED":             "LED — REQUIRES 220Ω-470Ω series resistor. GPIO max 20mA",
        "Actuator_Buzzer":          "Active Buzzer — HIGH=ON LOW=OFF. Passive buzzer uses tone(pin, freq)",
        "Actuator_Relay_5V":        "5V Relay Module — LOW signal activates relay (ACTIVE LOW). Isolates mains voltage safely",
        "Actuator_Servo_SG90":      "SG90 Servo — use Servo.h, attach(pin), write(0–180). 50Hz PWM, no delay needed",
        "Actuator_DC_Motor":        "DC Motor via L298N — IN1=HIGH IN2=LOW → forward; IN1=LOW IN2=HIGH → reverse; both LOW=brake",
        "Actuator_Water_Pump":      "Mini Water Pump — control via relay or MOSFET only, NEVER directly from GPIO pin",
        "Actuator_Fan":             "DC Fan — control via relay or MOSFET transistor only, NEVER direct GPIO",
        "Display_OLED_SSD1306":     "OLED 128x64 (SSD1306) — I2C addr 0x3C. Include Adafruit_SSD1306 + Adafruit_GFX",
        "Display_LCD_16x2":         "LCD 16x2 I2C — addr 0x27 (try 0x3F if 0x27 fails). Use LiquidCrystal_I2C library",
        "Display_7Segment":         "7-Segment Display — use SevSeg library",
    }
    skip = {"MCU_Arduino_Uno", "MCU_ESP32", "Basic_Resistor"}
    decoded = [comp_name_map.get(c, c) for c in components if c not in skip]
    comp_lines = "\n".join(f"  - {d}" for d in decoded)

    # ── Board-specific hardware constraints ───────────────────────────────
    if is_esp32:
        hw_rules = (
            "ESP32 HARDWARE RULES (non-negotiable):\n"
            "  - GPIO 34,35,36,39 are INPUT-ONLY. Never set as OUTPUT.\n"
            "  - GPIO 6-11 RESERVED for flash. NEVER use.\n"
            "  - ALL GPIO = 3.3V logic. Use voltage divider for any 5V signal.\n"
            "  - ADC = 12-bit (0-4095). Call analogReadResolution(12) in setup().\n"
            "  - I2C fixed: SDA=GPIO21, SCL=GPIO22.\n"
            "  - Prefer ADC1 pins (GPIO32-39). ADC2 conflicts with WiFi.\n"
        )
    else:
        hw_rules = (
            "ARDUINO UNO HARDWARE RULES (non-negotiable):\n"
            "  - 5V logic. ADC = 10-bit (0-1023).\n"
            "  - I2C: SDA=A4, SCL=A5 — reserved when using I2C. Do NOT reuse.\n"
            "  - GPIO max 40mA per pin, 200mA total.\n"
            "  - Pins 0,1 = TX/RX. Avoid when using Serial.\n"
        )

    system_prompt = (
        "You are an expert embedded systems engineer writing real Arduino C++ code for CircuitMentor.\n"
        "This code will be uploaded to real student hardware. Every line must be correct.\n\n"
        "ABSOLUTE RULES — ONE VIOLATION = CODE REJECTED:\n"
        "  1. Use ONLY the exact pin numbers from STRICT PIN ASSIGNMENTS below.\n"
        "  2. NEVER write // TODO, // Add logic here, or any stub/placeholder.\n"
        "  3. NEVER use delay() inside loop(). Use millis()-based non-blocking timing.\n"
        "  4. Average every analog sensor over 10 samples before using the value.\n"
        "  5. Keep code short, clean, and extremely beginner-friendly without sacrificing safety.\n"
        "  6. Use `const int` for all pin definitions (easiest for students to read. DO NOT use #define).\n"
        "  7. Output raw C++ ONLY. No markdown. No ```cpp fences. Just the code.\n\n"
        f"{hw_rules}\n"
        f"COMPONENT RULES FOR THIS CIRCUIT:\n{comp_lines}\n\n"
        "REQUIRED CODE STRUCTURE (in this order):\n"
        "  1. Header comment: project name, board, components, 'Generated by CircuitMentor — not a template'\n"
        "  2. #include statements (only what's actually needed)\n"
        "  3. const int pin definitions (EXACT pin numbers from assignment)\n"
        "  4. Global objects (DHT, LCD, Servo, etc.)\n"
        "  5. Helper functions before setup() (e.g. float readSoil(), float getDistance())\n"
        "  6. void setup(): Serial.begin(115200), init components, Serial.println('System Ready')\n"
        "  7. void loop(): millis() timing, sensor reads, project logic, actuator control, Serial.println debug\n\n"
        "Every sensor value MUST be printed to Serial. Every logic decision MUST have a simple 1-line comment.\n"
    )

    user_prompt = (
        f"PROJECT: {idea}\n"
        f"BOARD: {board_name}\n\n"
        f"COMPONENTS:\n{comp_lines}\n\n"
        "STRICT PIN ASSIGNMENTS — USE THESE EXACT PIN NUMBERS:\n"
        f"{json.dumps(pin_assignments, indent=2)}\n\n"
        "Write the complete, production-ready Arduino sketch now."
    )

    # ── Tier 1: Gemini 2.5 Pro ─────────────────────────────
    if CODEGEN_GEMINI_API_KEY:
        try:
            print("[CircuitMentor CodeGen] Attempting AI generation with Gemini 2.5 Pro...")
            genai.configure(api_key=CODEGEN_GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-pro")
            response = model.generate_content(
                [system_prompt, user_prompt],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=4096,
                ),
            )
            code = response.text.strip()
            
            # Clean fences
            if code.startswith("```"):
                lines = code.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines[-1].startswith("```") else lines
                code = "\n".join(lines).strip()
                
            print("[CircuitMentor CodeGen] [SUCCESS] Code generated successfully with Gemini 2.5 Pro.")
            return code
        except Exception as e:
            print(f"[CircuitMentor CodeGen] [WARNING] Gemini 2.5 Pro failed: {e}. Trying Tier 1.5 (Gemini 2.5 Flash)...")

    # ── Tier 1.5: Gemini 2.5 Flash ───────────────────────
    if CODEGEN_GEMINI_FLASH_KEY or CODEGEN_GEMINI_API_KEY:
        try:
            print("[CircuitMentor CodeGen] Attempting AI generation with Gemini 2.5 Flash...")
            genai.configure(api_key=CODEGEN_GEMINI_FLASH_KEY or CODEGEN_GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(
                [system_prompt, user_prompt],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=4096,
                ),
            )
            code = response.text.strip()
            
            # Clean fences
            if code.startswith("```"):
                lines = code.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines[-1].startswith("```") else lines
                code = "\n".join(lines).strip()
                
            print("[CircuitMentor CodeGen] [SUCCESS] Code generated successfully with Gemini 2.5 Flash.")
            return code
        except Exception as e:
            print(f"[CircuitMentor CodeGen] [WARNING] Gemini 2.5 Flash failed: {e}. Trying Tier 2 (Groq llama-3.3-70b-versatile)...")

    # ── Tier 2: Groq llama-3.3-70b-versatile ──────────────────
    if CODEGEN_GROQ_API_KEY:
        try:
            print("[CircuitMentor CodeGen] Attempting AI generation with Groq llama-3.3-70b-versatile...")
            from groq import Groq
            local_client = Groq(api_key=CODEGEN_GROQ_API_KEY)
            response = local_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.2
            )
            code = response.choices[0].message.content.strip()
            
            # Clean fences
            if code.startswith("```"):
                lines = code.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines[-1].startswith("```") else lines
                code = "\n".join(lines).strip()
                
            print("[CircuitMentor CodeGen] [SUCCESS] Code generated successfully with Groq Llama-3.3-70b-versatile.")
            return code
        except Exception as e:
            print(f"[CircuitMentor CodeGen] [WARNING] Groq Llama-3.3-70b-versatile failed: {e}. Trying Tier 2.5 fallback...")

    # ── Tier 2.5: Groq llama-3.1-8b-instant ───────────────────
    if CODEGEN_GROQ_API_KEY:
        try:
            print("[CircuitMentor CodeGen] Attempting AI generation with Groq llama-3.1-8b-instant...")
            from groq import Groq
            local_client = Groq(api_key=CODEGEN_GROQ_API_KEY)
            response = local_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.2
            )
            code = response.choices[0].message.content.strip()
            
            # Clean fences
            if code.startswith("```"):
                lines = code.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines[-1].startswith("```") else lines
                code = "\n".join(lines).strip()
                
            print("[CircuitMentor CodeGen] [SUCCESS] Code generated successfully with Groq Llama-3.1-8b-instant.")
            return code
        except Exception as e:
            print(f"[CircuitMentor CodeGen] [WARNING] Groq Llama-3.1-8b-instant failed: {e}. Using static fallback.")

    # ── Tier 3: Static Fallback ────────────────────────────
    print("[CircuitMentor CodeGen] [FALLBACK] All AI generators failed. Using static fallback.")
    return generate_code_static(components, mcu, pin_assignments, idea, platform)



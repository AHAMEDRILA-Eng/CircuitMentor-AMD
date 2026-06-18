import sys
import os
import re

# Insert backend directory in path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app
import local_circuit_engine
import groq_llm

client = TestClient(app)

# BUG-001: CORS config
def test_cors_no_wildcard():
    # Inspect CORSMiddleware configuration
    cors_middleware = None
    for middleware in app.user_middleware:
        if "CORSMiddleware" in str(middleware.cls):
            cors_middleware = middleware
            break
    assert cors_middleware is not None, "CORSMiddleware not found in app"
    
    # Check that allow_origins does not contain '*'
    allow_origins = cors_middleware.kwargs.get("allow_origins", [])
    assert "*" not in allow_origins, "CORS should not allow wildcard (*)"
    assert "http://localhost:3000" in allow_origins
    assert "https://circuit-mentor-omega.vercel.app" in allow_origins

# FIX-01: Flame sensor logic
def test_flame_sensor_active_low():
    # Verify that the generated code for Sensor_Flame triggers on LOW
    code = local_circuit_engine.generate_code_static(
        components=["Sensor_Flame", "Actuator_Buzzer"],
        mcu="MCU_Arduino_Uno",
        pin_assignments={"Sensor_Flame": {"signal": 5}, "Actuator_Buzzer": {"signal": 8}},
        idea="Flame sensor alarm",
        platform="standalone"
    )
    # The code should contain digitalRead(5) == LOW
    assert "digitalRead(5) == LOW" in code, "Flame sensor trigger state must be LOW (active low)"
    # Gas sensor on the other hand should trigger on HIGH
    code_gas = local_circuit_engine.generate_code_static(
        components=["Sensor_MQ2_Gas", "Actuator_Buzzer"],
        mcu="MCU_Arduino_Uno",
        pin_assignments={"Sensor_MQ2_Gas": {"signal": 5}, "Actuator_Buzzer": {"signal": 8}},
        idea="Gas alarm",
        platform="standalone"
    )
    assert "digitalRead(5) == HIGH" in code_gas, "Gas sensor trigger state must be HIGH (active high)"

# FIX-02: EIL errors not dropped
def test_eil_errors_surfaced():
    # Direct motor drive from GPIO pin triggers an EIL safety error
    # Let's verify that the validator endpoint surfaces the safety error
    proposal = {
        "mcu": "MCU_Arduino_Uno",
        "power_sources": ["Power_9V_Battery"],
        "components": ["Actuator_DC_Motor"],
        "connections": [
            {"from": "MCU_Arduino_Uno.D9", "to": "Actuator_DC_Motor.IN1"},
            {"from": "MCU_Arduino_Uno.GND", "to": "Actuator_DC_Motor.IN2"},
        ]
    }
    response = client.post("/api/eil-validate", json=proposal)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ERROR", "EIL errors must result in ERROR status"
    assert "errors" in data
    assert len(data["errors"]) > 0

# FIX-03: NPN+Diode not in pin allocator
def test_motor_injection_no_pin_steal():
    # If a DC Motor is present, it auto-injects Transistor + Diode.
    # Verify they don't consume/steal GPIO pins from the MCU.
    concept = {
        "inputs": [],
        "logic": ["MCU_Arduino_Uno"],
        "outputs": ["Actuator_DC_Motor"]
    }
    circuit = local_circuit_engine.build_circuit(concept)
    components = circuit["components"]
    pin_assignments = circuit["pin_assignments"]
    
    # Assert NPN and Diode are injected into all_components
    assert "Basic_Transistor_NPN" in components
    assert "Basic_Diode" in components
    
    # Assert they DO NOT have any pins assigned to them
    assert "Basic_Transistor_NPN" not in pin_assignments or pin_assignments["Basic_Transistor_NPN"] == {}
    assert "Basic_Diode" not in pin_assignments or pin_assignments["Basic_Diode"] == {}
    
    # Assert DC Motor has IN1 and IN2 pins allocated properly
    assert "Actuator_DC_Motor" in pin_assignments
    assert "in1" in pin_assignments["Actuator_DC_Motor"]
    assert "in2" in pin_assignments["Actuator_DC_Motor"]

# FIX-04: power_sources not empty
def test_power_sources_populated():
    concept = {
        "inputs": [],
        "logic": ["MCU_Arduino_Uno"],
        "outputs": []
    }
    circuit = local_circuit_engine.build_circuit(concept)
    power_sources = circuit.get("power_sources", [])
    assert len(power_sources) > 0, "power_sources list must not be empty"
    assert power_sources[0]["id"] == "USB_5V"

# BUG-009: Quiz uses correct_index not correct_answer
def test_quiz_schema_correct_index():
    schema = groq_llm.QUIZ_SCHEMA
    assert "correct_index" in schema["required"], "Quiz schema must require correct_index"
    assert "correct_index" in schema["properties"], "Quiz schema must have correct_index property"
    assert schema["properties"]["correct_index"]["type"] == "integer", "correct_index must be an integer"
    assert "correct_answer" not in schema["properties"], "Quiz schema should not have correct_answer"

# Keyword collision tests
def test_fan_not_detected_in_fantastic():
    # "fantastic" should not detect Actuator_Fan
    concept = local_circuit_engine.detect_components("fantastic project")
    assert "Actuator_Fan" not in concept["inputs"] + concept["outputs"]

def test_fan_detected_in_fan_project():
    # "fan" should detect Actuator_Fan
    concept = local_circuit_engine.detect_components("build a smart fan")
    assert "Actuator_Fan" in concept["outputs"]

def test_mic_not_detected_in_microseconds():
    # "microseconds" should not detect Sensor_Sound
    concept = local_circuit_engine.detect_components("delay for 5 microseconds")
    assert "Sensor_Sound" not in concept["inputs"] + concept["outputs"]
    
def test_gas_not_detected_in_gasp():
    # "gasp" should not detect Sensor_MQ2_Gas
    concept = local_circuit_engine.detect_components("gasping for air")
    assert "Sensor_MQ2_Gas" not in concept["inputs"] + concept["outputs"]

def test_pump_not_detected_in_pumpkin():
    # "pumpkin" should not detect Actuator_Water_Pump
    concept = local_circuit_engine.detect_components("pumpkin carving project")
    assert "Actuator_Water_Pump" not in concept["inputs"] + concept["outputs"]

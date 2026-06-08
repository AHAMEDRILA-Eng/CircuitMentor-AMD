import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def check_keys(data, expected_keys, context):
    missing = [k for k in expected_keys if k not in data]
    if missing:
        print(f"  [!] MISSING KEYS in {context}: {missing}")
    else:
        print(f"  [OK] All keys present in {context}")

def run_sanity_checks():
    # 1. IoT Discovery
    iot_idea = {"idea": "Smart irrigation system with Telegram notifications"}
    print("\n--- 1. IoT Discovery Test ---")
    resp = requests.post(f"{BASE_URL}/iot-discovery", json=iot_idea)
    data = resp.json()
    print(f"  Status: {resp.status_code}")
    check_keys(data, ["is_iot", "platforms", "system_architecture"], "Discovery")
    if data.get("platforms"):
        check_keys(data["platforms"][0], ["id", "name", "description", "difficulty", "supports_simulation", "setup_steps"], "Platform Item")

    # 2. Normal Generation
    normal_idea = {"idea": "Simple LED blinker with a button on pin 2"}
    print("\n--- 2. Normal Generation Test ---")
    resp = requests.post(f"{BASE_URL}/generate-circuit", json=normal_idea)
    data = resp.json()
    print(f"  Status: {data.get('status')}")
    check_keys(data, ["status", "validated_circuit", "visual_graph", "eil_warnings", "arduino_code"], "Normal Gen")

    # 3. Dangerous Generation (EIL BLOCK)
    # Idea designed to trigger a block: High current draw or direct relay drive without transistor
    dangerous_idea = {"idea": "Power a heavy 12V motor directly from an ESP32 GPIO pin using only a 9V battery."}
    print("\n--- 3. Dangerous Generation Test ---")
    resp = requests.post(f"{BASE_URL}/generate-circuit", json=dangerous_idea)
    data = resp.json()
    print(f"  Status: {data.get('status')}")
    if data.get("status") == "EIL_HARD_BLOCK":
        print("  [OK] Correctly blocked dangerous circuit.")
        check_keys(data, ["status", "message", "original_errors", "final_errors", "circuit_provided"], "Hard Block")
    else:
        print(f"  [!] Expected EIL_HARD_BLOCK but got {data.get('status')}")

if __name__ == "__main__":
    try:
        run_sanity_checks()
    except Exception as e:
        print(f"ERROR: {e}")

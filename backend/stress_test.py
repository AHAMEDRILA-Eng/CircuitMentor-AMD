import requests
import json

tests = [
    "pir sensor with led buzzer relay and servo",
    "soil moisture ldr flame sensor with oled lcd buzzer",
    "ultrasonic sensor dht11 temperature pir motion led buzzer relay servo",
    "gas sensor rain sensor flame sensor with led buzzer relay oled display",
    "button led buzzer servo relay dc motor oled lcd",
]

print("=" * 65)
print("CircuitMentor Stress Test — Multi-Component Pin Conflict Check")
print("=" * 65)

all_pass = True

for idea in tests:
    r = requests.post("http://localhost:8000/api/generate-circuit", json={"idea": idea}, timeout=10)
    data = r.json()
    status = data.get("status", "ERROR")
    pins = data.get("validated_circuit", {}).get("pin_assignments", {})

    # Collect all assigned pin values (excluding shared I2C pins)
    all_pins = []
    for comp, p in pins.items():
        for role, pin_val in p.items():
            if role in ("sda", "scl"):
                continue  # I2C shared bus — expected same pins
            all_pins.append((str(pin_val), comp, role))

    pin_values = [x[0] for x in all_pins]
    duplicates = set(p for p in pin_values if pin_values.count(p) > 1)

    conflict_status = "NO CONFLICT" if not duplicates else f"CONFLICT on {duplicates}"
    if duplicates:
        all_pass = False

    print(f"\nPROMPT: {idea}")
    print(f"  Status: {status} | Parts: {len(pins)} | {conflict_status}")
    for comp, p in pins.items():
        short = comp.split("_", 1)[-1]
        print(f"    {short}: {p}")

print("\n" + "=" * 65)
if all_pass:
    print("RESULT: ALL TESTS PASSED — Zero pin conflicts across all prompts!")
else:
    print("RESULT: SOME TESTS FAILED — See conflicts above.")
print("=" * 65)

import requests
import json
import time

url = "http://localhost:8000/api/generate-circuit"

tests = [
    {"idea": "Build a smart plant watering system using an ESP32, a Soil Moisture sensor, and a 5V relay to control a pump."},
    {"idea": "Connect HC-SR04 echo pin directly to ESP32 and power a servo from ESP32 pin."}
]

for payload in tests:
    print(f"\nSending idea:\n'{payload['idea']}'\n")
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=120)
        print(f"Time Taken: {time.time() - start_time:.2f} seconds")

        if response.status_code != 200:
            print("HTTP Error:", response.status_code)
            print(response.text)
        else:
            print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error calling API:", e)
import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_iot_flow():
    # 1. Discovery
    idea = "I want to build a smart plant watering system that I can control using a Telegram Bot on my phone."
    print(f"\n--- STEP 1: Discovery ---\nIdea: {idea}")
    
    start = time.time()
    response = requests.post(f"{BASE_URL}/iot-discovery", json={"idea": idea}, timeout=60)
    print(f"Time: {time.time() - start:.2f}s")
    
    discovery_data = response.json()
    print(json.dumps(discovery_data, indent=2))
    
    if discovery_data.get("is_iot"):
        # 2. Generation with platform
        platform = discovery_data["platforms"][0]["id"] # Pick the first one (Telegram)
        print(f"\n--- STEP 2: Generation ---\nPlatform: {platform}")
        
        start = time.time()
        gen_response = requests.post(f"{BASE_URL}/generate-circuit", json={
            "idea": idea,
            "platform": platform
        }, timeout=120)
        print(f"Time: {time.time() - start:.2f}s")
        
        gen_data = gen_response.json()
        print("\nStatus:", gen_data.get("status"))
        
        if gen_data.get("status") != "SUCCESS":
            print("\nFull Response Details:")
            print(json.dumps(gen_data, indent=2))
        
        print("\nArduino Code Sample (First 200 chars):")
        print(gen_data.get("arduino_code", "")[:200] + "...")
        
        # Save code to a file for review
        with open("generated_iot_code.ino", "w") as f:
            f.write(gen_data.get("arduino_code", ""))
        print("\nFull code saved to generated_iot_code.ino")

if __name__ == "__main__":
    test_iot_flow()

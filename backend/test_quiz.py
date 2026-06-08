import json
import requests

def test_quiz():
    url = "http://localhost:8000/api/generate-quiz"
    payload = {
        "idea": "Smart Dustbin with ultrasonic sensor and servo motor",
        "components": ["MCU_Arduino_Uno", "Sensor_HC_SR04", "Actuator_Servo_SG90"],
        "platform": "Standalone",
        "experience_level": "beginner",
        "pin_assignments": {
            "Sensor_HC_SR04": {"trig": 8, "echo": 2},
            "Actuator_Servo_SG90": {"signal": 3}
        },
        "system_logic": {}
    }
    
    try:
        response = requests.post(url, json=payload)
        print("Status Code:", response.status_code)
        print("Response JSON:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_quiz()

import sys
sys.path.append('c:/Anti-gravity/CircuitMentor/backend')
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)
res = client.post('/api/generate-quiz', json={
    'components':['Sensor_PIR', 'Actuator_Buzzer'],
    'idea':'motion alarm',
    'platform':'Standalone',
    'experience_level':'beginner',
    'pin_assignments':{'Sensor_PIR':27, 'Actuator_Buzzer':14}
})

print("----------")
print("RESPONSE:")
print(json.dumps(res.json(), indent=2))

# CircuitMentor Engine MVP

Welcome to the backend engine for CircuitGen.AI! This relies on the **Electronics Intelligence Layer (EIL)** concept to mathematically enforce electrical rules before outputting an LLM-generated circuit.

## MVP Setup Instructions
1. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
2. Open the `.env` file and replace the placeholder with your actual **Groq API Key**:
   ```
   GROQ_API_KEY=gsk_your_real_key_here
   ```
3. Start the FastAPI engine:
   ```bash
   python main.py
   ```
4. Test the full Pipeline using a tool like Postman, curl, or the built-in FastAPI Swagger UI (by navigating to `http://localhost:8000/docs`).

## Endpoints

### `POST /api/generate-circuit`
This endpoint takes a natural language idea and automatically runs the **Two-Phase Generation and EIL Repair Loop**.

**Example Payload:**
```json
{
  "idea": "Build a smart light relay using an ESP32, LDR sensor, and a 5V relay. Power it using a 9V battery and LM7805."
}
```

The system will:
1. Contact LLaMA 3.3 to determine the Functional Blocks.
2. Contact LLaMA 3.3 to map the Wiring Netlist.
3. Intercept the JSON with `eil_validator.py`.
4. If a safety error triggers (e.g., LLaMA forgets to drop the 5V relay logic voltage to the ESP32), the backend automatically *bounces* the error JSON back to LLaMA to fix it.
5. Return the perfectly safe `validated_circuit` JSON.

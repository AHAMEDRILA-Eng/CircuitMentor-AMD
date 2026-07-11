# CircuitMentor — Backend (FastAPI)

AI-powered circuit generation engine using **Fireworks AI** on **AMD Instinct MI300X GPUs**.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your keys:
   ```
   FIREWORKS_API_KEY=fw_your_key_here
   GEMINI_API_KEY=your_gemini_key_here
   ```

3. Start the server:
   ```bash
   python main.py
   ```

4. Open the interactive API docs: http://localhost:8000/docs

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate-circuit` | Natural language → validated circuit JSON |
| `POST` | `/api/chat` | Conversational circuit assistant |
| `POST` | `/api/generate-quiz` | Component teaching quiz |
| `POST` | `/api/scan-image` | Detect components from image |
| `GET`  | `/health` | Health check (used by Docker) |

## Architecture

The backend uses a **Two-Phase EIL (Electronics Intelligence Layer) pipeline**:
1. LLM (via Fireworks AI / AMD MI300X) generates Functional Blocks + Wiring Netlist
2. `eil_validator.py` mathematically enforces electrical rules
3. If errors are found, the error JSON is bounced back to the LLM for repair
4. Returns a fully validated, safe `circuit` JSON

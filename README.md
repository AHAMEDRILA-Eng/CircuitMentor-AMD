# CircuitMentor — AMD Hackathon Submission

> **AI-powered circuit generation and simulation tool** — type a prompt, receive a working circuit schematic, wiring diagram, Arduino/ESP32 code, and interactive quiz — all in seconds.

**AI Inference powered by [Fireworks AI](https://fireworks.ai) running on AMD Instinct MI300X GPUs.**

---

## ✨ Features

- 🧠 **Natural Language → Circuit** — Describe your idea; get a validated circuit instantly
- ⚡ **AMD MI300X Inference** — Ultra-fast LLM inference via Fireworks AI API
- 🔍 **Image Scan** — Upload a photo of components; AI detects and builds the circuit
- 📐 **EIL Validator** — Electronics Intelligence Layer mathematically enforces electrical rules
- 🛠️ **Code Generation** — Auto-generates Arduino/ESP32 code with IoT platform support
- 🎓 **Interactive Quiz** — Teaches circuit concepts with component-level explanations
- 🐳 **Docker-ready** — Single `docker-compose up --build` to run the full stack

---

## 🚀 Quick Start (Docker — Recommended)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/CircuitMentor-AMD.git
cd CircuitMentor-AMD
```

### 2. Set up environment variables
```bash
cp backend/.env.example backend/.env
```
Then open `backend/.env` and fill in your keys:
```env
FIREWORKS_API_KEY=fw_your_key_here        # https://fireworks.ai → API Keys
GEMINI_API_KEY=your_gemini_key_here       # https://aistudio.google.com (image scan only)
```

### 3. Start the full stack
```bash
docker-compose up --build
```

### 4. Open the app
- 🌐 **Frontend** → http://localhost:3000
- 🔧 **Backend API** → http://localhost:8000/docs

---

## 🛠️ Manual Setup (Development)

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # Fill in your API keys
python main.py
# → Running at http://localhost:8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
# → Running at http://localhost:3000
```

---

## 🔑 API Keys Required

| Key | Purpose | Get it at |
|-----|---------|-----------|
| `FIREWORKS_API_KEY` | LLM inference (AMD MI300X) | [fireworks.ai](https://fireworks.ai) |
| `GEMINI_API_KEY` | Image component detection | [aistudio.google.com](https://aistudio.google.com) |

> **AMD Hackathon participants** get $50 free Fireworks AI credits — no credit card needed.

---

## 🏗️ Architecture

```
CircuitMentor-AMD/
├── backend/                  # FastAPI + EIL Validator
│   ├── main.py               # API routes
│   ├── fireworks_llm.py      # Fireworks AI inference (AMD MI300X)
│   ├── local_circuit_engine.py  # Circuit generation engine
│   ├── eil_validator.py      # Electronics rule enforcement
│   └── requirements.txt
├── frontend/                 # Next.js 16 + React 19
│   └── src/
│       ├── components/       # UI components
│       ├── logic/            # Client-side circuit logic
│       └── store/            # Zustand state management
└── docker-compose.yml        # Full stack orchestration
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)
